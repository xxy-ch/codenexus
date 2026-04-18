use anyhow::Result;
use sqlx::PgPool;

use crate::id_map::IdMap;
use crate::models::ParsedDump;

/// Orchestrates the migration from UOJ data to AlgoMaster PostgreSQL.
///
/// Processes entities in strict dependency order:
/// organizations -> users -> problems -> submissions -> contests -> blogs -> etc.
pub struct Migrator {
    pool: PgPool,
    dump: ParsedDump,
    id_map: IdMap,
    org_id: i64,
    campus_id: Option<i64>,
    test_case_dir: Option<String>,
}

impl Migrator {
    /// Create a new Migrator instance with the given database pool, parsed dump,
    /// organization/campus IDs, and optional test case directory.
    pub async fn new(
        pool: PgPool,
        dump: ParsedDump,
        org_id: i64,
        campus_id: Option<i64>,
        test_case_dir: Option<String>,
    ) -> Result<Self> {
        let id_map = IdMap::new(pool.clone()).await?;
        Ok(Self {
            pool,
            dump,
            id_map,
            org_id,
            campus_id,
            test_case_dir,
        })
    }

    /// Migrate or validate the target organization.
    ///
    /// - If `--org-id` is provided: validate the org exists, return (org_id, None).
    /// - If `--create-default-org` is provided: create "Imported from UOJ" org
    ///   and "Main Campus", return (org_id, Some(campus_id)).
    pub async fn migrate_organization(cli: &crate::Cli, pool: &PgPool) -> Result<(i64, Option<i64>)> {
        if let Some(org_id) = cli.org_id {
            // Validate the org exists
            let exists: bool =
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM organizations WHERE id = $1)")
                    .bind(org_id)
                    .fetch_one(pool)
                    .await?;

            if !exists {
                anyhow::bail!("Organization with id {} does not exist", org_id);
            }

            tracing::info!("Using existing organization id={}", org_id);
            return Ok((org_id, None));
        }

        if cli.create_default_org {
            // Create default organization
            let org_id: i64 = sqlx::query_scalar(
                r#"
                INSERT INTO organizations (name, slug)
                VALUES ('Imported from UOJ', 'imported-from-uoj')
                ON CONFLICT (slug) DO UPDATE SET name = organizations.name
                RETURNING id
                "#,
            )
            .fetch_one(pool)
            .await?;

            // Create default campus
            let campus_id: i64 = sqlx::query_scalar(
                r#"
                INSERT INTO campuses (organization_id, name, slug)
                VALUES ($1, 'Main Campus', 'main-campus')
                ON CONFLICT (organization_id, slug) DO UPDATE SET name = campuses.name
                RETURNING id
                "#,
            )
            .bind(org_id)
            .fetch_one(pool)
            .await?;

            tracing::info!(
                "Created default organization id={} with campus id={}",
                org_id,
                campus_id
            );
            return Ok((org_id, Some(campus_id)));
        }

        anyhow::bail!("Either --org-id or --create-default-org must be provided")
    }

    /// Migrate UOJ users to AlgoMaster.
    ///
    /// Creates a system "uoj_migration" user (D-10-11), then migrates all
    /// non-banned UOJ users with mapped roles, {MD5} prefix passwords,
    /// and synthetic emails for duplicates/empties.
    pub async fn migrate_users(&mut self) -> Result<()> {
        tracing::info!("Starting user migration...");

        // Create system migration user (D-10-11)
        let migration_user_id = self.create_migration_system_user().await?;
        tracing::info!("System migration user id={}", migration_user_id);

        // Parse user_info rows from dump
        let user_rows = match self.dump.tables.get("user_info") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No user_info table found in dump, skipping user migration");
                return Ok(());
            }
        };

        tracing::info!("Found {} user_info rows in dump", user_rows.len());

        let mut migrated = 0u64;
        let mut skipped = 0u64;
        let mut email_set = std::collections::HashSet::new();

        // Reserve the system user's email
        email_set.insert("uoj_migration@system.local".to_string());

        for row in user_rows {
            // UOJ user_info columns: usergroup, username, email, password, svn_password,
            // rating, qq, sex, ac_num, register_time, remote_addr, http_x_forwarded_for,
            // remember_token, motto
            if row.len() < 14 {
                tracing::warn!("Skipping malformed user_info row ({} fields)", row.len());
                skipped += 1;
                continue;
            }

            let usergroup = &row[0];
            let username = &row[1];
            let email = &row[2];
            let password = &row[3];
            let register_time = &row[9];

            // Skip banned users (D-10-10)
            if usergroup == "B" {
                tracing::debug!("Skipping banned user '{}'", username);
                skipped += 1;
                continue;
            }

            // Map usergroup to role
            let role = match crate::mapper::map_usergroup_to_role(usergroup) {
                Some(r) => r,
                None => {
                    tracing::warn!(
                        "Skipping user '{}' with unknown usergroup '{}'",
                        username,
                        usergroup
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Skip if already migrated (idempotency D-10-7)
            if self.id_map.contains("user", username) {
                tracing::debug!("User '{}' already migrated, skipping", username);
                continue;
            }

            // Handle email dedup and empty emails
            let final_email = if email.is_empty() || email == "NULL" {
                crate::mapper::generate_synthetic_email(username)
            } else {
                email.clone()
            };

            let final_email = if email_set.contains(&final_email) {
                crate::mapper::generate_synthetic_email(username)
            } else {
                final_email
            };

            email_set.insert(final_email.clone());

            // Generate new UUID
            let new_id = uuid::Uuid::new_v4().to_string();

            // Format password with {MD5} prefix (D-10-2)
            let password_hash = crate::password::format_md5_prefix(password);

            // Insert user
            sqlx::query(
                r#"
                INSERT INTO users (id, username, email, password_hash, organization_id, campus_id, display_name, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&new_id)
            .bind(username)
            .bind(&final_email)
            .bind(&password_hash)
            .bind(self.org_id)
            .bind(self.campus_id)
            .bind(username)
            .bind(register_time)
            .execute(&self.pool)
            .await?;

            // Insert user_roles row
            sqlx::query(
                r#"
                INSERT INTO user_roles (user_id, organization_id, campus_id, role)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
                "#,
            )
            .bind(&new_id)
            .bind(self.org_id)
            .bind(self.campus_id)
            .bind(role)
            .execute(&self.pool)
            .await?;

            // Store mapping
            self.id_map
                .get_or_insert("user", username, new_id.clone())
                .await?;

            migrated += 1;
        }

        tracing::info!(
            "User migration complete: {} migrated, {} skipped",
            migrated,
            skipped
        );
        Ok(())
    }

    /// Create the system migration user for problem ownership (D-10-11).
    async fn create_migration_system_user(&mut self) -> Result<String> {
        // Check if already exists via mapping
        if let Some(id) = self.id_map.get("user", "uoj_migration") {
            return Ok(id);
        }

        let new_id = uuid::Uuid::new_v4().to_string();

        // Insert system user with root role
        sqlx::query(
            r#"
            INSERT INTO users (id, username, email, password_hash, organization_id, campus_id, display_name)
            VALUES ($1, 'uoj_migration', 'uoj_migration@system.local', '{MD5}disabled', $2, $3, 'UOJ Migration System')
            ON CONFLICT (username) DO NOTHING
            "#,
        )
        .bind(&new_id)
        .bind(self.org_id)
        .bind(self.campus_id)
        .execute(&self.pool)
        .await?;

        // Insert root role for system user
        sqlx::query(
            r#"
            INSERT INTO user_roles (user_id, organization_id, campus_id, role)
            VALUES ($1, $2, $3, 'root')
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(&new_id)
        .bind(self.org_id)
        .bind(self.campus_id)
        .execute(&self.pool)
        .await?;

        self.id_map
            .get_or_insert("user", "uoj_migration", new_id.clone())
            .await?;

        Ok(new_id)
    }

    /// Run the full migration pipeline in dependency order.
    pub async fn run(&mut self) -> Result<()> {
        tracing::info!(
            "Starting migration for org_id={}, campus_id={:?}",
            self.org_id,
            self.campus_id
        );

        // 2. Users
        self.migrate_users().await?;

        // 3-9. Placeholders for subsequent plans
        tracing::info!("TODO: migrate_problems (plan 10-03)");
        tracing::info!("TODO: migrate_submissions (plan 10-04)");
        tracing::info!("TODO: migrate_contests (plan 10-04)");
        tracing::info!("TODO: migrate_blogs (plan 10-05)");
        tracing::info!("TODO: migrate_likes (plan 10-05)");
        tracing::info!("TODO: migrate_messages (plan 10-05)");

        tracing::info!("Migration complete");
        Ok(())
    }
}
