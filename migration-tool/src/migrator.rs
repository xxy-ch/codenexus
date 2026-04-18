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

    /// Migrate UOJ problems and their test cases to AlgoMaster.
    ///
    /// - Creates a system migration user as author (D-10-11)
    /// - Parses extra_config for time_limit/memory_limit
    /// - Reads test cases from filesystem if test_case_dir is set (D-10-1)
    /// - Maps visibility from is_hidden
    pub async fn migrate_problems(&mut self) -> Result<()> {
        tracing::info!("Starting problem migration...");

        // Get system migration user UUID (D-10-11)
        let author_id = self
            .id_map
            .get("user", "uoj_migration")
            .ok_or_else(|| anyhow::anyhow!("System migration user not found. Run migrate_users first."))?;
        tracing::info!("Using system migration user as author: {}", author_id);

        // Parse problem rows
        let problem_rows = match self.dump.tables.get("problems") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No problems table found in dump, skipping problem migration");
                return Ok(());
            }
        };

        // Build lookup maps for problem contents and tags
        let contents_map = self.build_problem_contents_map();
        let tags_map = self.build_problem_tags_map();

        tracing::info!("Found {} problem rows in dump", problem_rows.len());

        let mut migrated = 0u64;
        let mut skipped = 0u64;

        for row in problem_rows {
            // UOJ problems columns: id, title, is_hidden, submission_requirement,
            // hackable, extra_config, zan, ac_num, submit_num
            if row.len() < 9 {
                tracing::warn!("Skipping malformed problems row ({} fields)", row.len());
                skipped += 1;
                continue;
            }

            let old_id = &row[0];
            let title = &row[1];
            let is_hidden = &row[2];
            let extra_config = &row[5];

            // Skip if already migrated (idempotency D-10-7)
            if self.id_map.contains("problem", old_id) {
                tracing::debug!("Problem {} already migrated, skipping", old_id);
                continue;
            }

            // Parse extra_config for time/memory limits
            let extra_config_opt = if extra_config == "NULL" || extra_config.is_empty() {
                None
            } else {
                Some(extra_config.clone())
            };
            let (time_limit_ms, memory_limit_kb) =
                crate::mapper::parse_extra_config(&extra_config_opt);

            // Map visibility
            let is_hidden_bool = is_hidden != "0";
            let visibility = crate::mapper::map_visibility(is_hidden_bool);

            // Get statement_md from contents map
            let description = contents_map
                .get(&old_id.parse::<i64>().unwrap_or(0))
                .cloned()
                .unwrap_or_else(|| {
                    tracing::warn!("No content found for problem {}, using placeholder", old_id);
                    "No description available.".to_string()
                });

            // Use old ID as new ID (BIGSERIAL allows explicit IDs)
            let new_id: i64 = old_id.parse().unwrap_or_else(|_| {
                tracing::warn!("Cannot parse problem id '{}', skipping", old_id);
                skipped += 1;
                0
            });

            if new_id == 0 {
                skipped += 1;
                continue;
            }

            // Get tags for this problem
            let tags = tags_map.get(&new_id).cloned().unwrap_or_default();

            // Insert problem
            sqlx::query(
                r#"
                INSERT INTO problems (id, organization_id, campus_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(new_id)
            .bind(self.org_id)
            .bind(self.campus_id)
            .bind(&author_id)
            .bind(title)
            .bind(&description)
            .bind(None::<&str>) // difficulty = NULL (UOJ has no difficulty)
            .bind(visibility)
            .bind(time_limit_ms)
            .bind(memory_limit_kb)
            .execute(&self.pool)
            .await?;

            // Update tags if present: add to description as a note (no dedicated tags column)
            if !tags.is_empty() {
                let tags_note = format!("\n\n**Tags:** {}", tags.join(", "));
                sqlx::query("UPDATE problems SET description = description || $1 WHERE id = $2")
                    .bind(&tags_note)
                    .bind(new_id)
                    .execute(&self.pool)
                    .await?;
            }

            // Read and insert test cases if test_case_dir is set
            if let Some(ref tc_dir) = self.test_case_dir {
                let tc_path = std::path::Path::new(tc_dir);
                let test_cases = crate::test_cases::read_test_cases(tc_path, new_id)?;

                for tc in &test_cases {
                    sqlx::query(
                        r#"
                        INSERT INTO test_cases (problem_id, input, output, is_secret, points, order_index)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        "#,
                    )
                    .bind(new_id)
                    .bind(&tc.input)
                    .bind(&tc.output)
                    .bind(false) // is_secret = false per D-10-1
                    .bind(1)     // points = 1
                    .bind(tc.order_index)
                    .execute(&self.pool)
                    .await?;
                }

                if !test_cases.is_empty() {
                    tracing::debug!(
                        "Inserted {} test cases for problem {}",
                        test_cases.len(),
                        new_id
                    );
                }
            }

            // Store mapping
            self.id_map
                .get_or_insert("problem", old_id, new_id.to_string())
                .await?;

            migrated += 1;
        }

        tracing::info!(
            "Problem migration complete: {} migrated, {} skipped",
            migrated,
            skipped
        );
        Ok(())
    }

    /// Build a HashMap of problem_id -> statement_md from problems_contents table.
    fn build_problem_contents_map(&self) -> std::collections::HashMap<i64, String> {
        let mut map = std::collections::HashMap::new();
        if let Some(rows) = self.dump.tables.get("problems_contents") {
            for row in rows {
                // problems_contents columns: id, statement, statement_md
                if row.len() >= 3 {
                    if let Ok(id) = row[0].parse::<i64>() {
                        let md = &row[2];
                        if md != "NULL" && !md.is_empty() {
                            map.insert(id, md.clone());
                        }
                    }
                }
            }
        }
        tracing::info!("Loaded {} problem content entries", map.len());
        map
    }

    /// Build a HashMap of problem_id -> Vec<tag> from problems_tags table.
    fn build_problem_tags_map(&self) -> std::collections::HashMap<i64, Vec<String>> {
        let mut map: std::collections::HashMap<i64, Vec<String>> = std::collections::HashMap::new();
        if let Some(rows) = self.dump.tables.get("problems_tags") {
            for row in rows {
                // problems_tags columns: id, problem_id, tag
                if row.len() >= 3 {
                    if let Ok(problem_id) = row[1].parse::<i64>() {
                        let tag = &row[2];
                        if tag != "NULL" && !tag.is_empty() {
                            map.entry(problem_id).or_default().push(tag.clone());
                        }
                    }
                }
            }
        }
        map
    }

    /// Migrate UOJ submissions to AlgoMaster.
    ///
    /// - Skips Java/Go/Python2 submissions (D-10-8)
    /// - Skips submissions with unmapped user or problem
    /// - No score column in target (D-10-9)
    /// - Creates contest_submissions rows for contest submissions
    pub async fn migrate_submissions(&mut self) -> Result<()> {
        tracing::info!("Starting submission migration...");

        let submission_rows = match self.dump.tables.get("submissions") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No submissions table found in dump, skipping submission migration");
                return Ok(());
            }
        };

        tracing::info!("Found {} submission rows in dump", submission_rows.len());

        let mut migrated = 0u64;
        let mut skipped_language = 0u64;
        let mut skipped_no_user = 0u64;
        let mut skipped_no_problem = 0u64;

        for row in submission_rows {
            // UOJ submissions columns: id, problem_id, contest_id, submit_time,
            // submitter, content, language, tot_size, judge_time, result,
            // status, result_error, score, used_time, used_memory,
            // is_hidden, status_details
            if row.len() < 16 {
                tracing::warn!("Skipping malformed submissions row ({} fields)", row.len());
                continue;
            }

            let old_id = &row[0];
            let problem_id_str = &row[1];
            let contest_id_str = &row[2];
            let submit_time = &row[3];
            let submitter = &row[4];
            let content = &row[5];
            let language = &row[6];
            let result_raw = &row[9];
            let used_time = &row[12];
            let used_memory = &row[13];

            // Skip if already migrated
            if self.id_map.contains("submission", old_id) {
                tracing::debug!("Submission {} already migrated, skipping", old_id);
                continue;
            }

            // Map language (D-10-8)
            let mapped_lang = match crate::mapper::map_language(language) {
                Some(l) => l,
                None => {
                    tracing::debug!(
                        "Skipping submission {} with unsupported language '{}'",
                        old_id,
                        language
                    );
                    skipped_language += 1;
                    continue;
                }
            };

            // Look up user_id from id_map
            let user_id = match self.id_map.get("user", submitter) {
                Some(id) => id,
                None => {
                    tracing::debug!(
                        "Skipping submission {}: user '{}' not found in id_map",
                        old_id,
                        submitter
                    );
                    skipped_no_user += 1;
                    continue;
                }
            };

            // Look up problem_id from id_map
            let new_problem_id = match self.id_map.get("problem", problem_id_str) {
                Some(id) => id,
                None => {
                    tracing::debug!(
                        "Skipping submission {}: problem '{}' not found in id_map",
                        old_id,
                        problem_id_str
                    );
                    skipped_no_problem += 1;
                    continue;
                }
            };

            // Parse result: may be hex-encoded blob (0x...) or plain text
            let decoded_result = self.decode_blob_result(result_raw);

            // Map status/verdict
            let result_str = if decoded_result.is_empty() {
                None
            } else {
                Some(decoded_result.as_str())
            };
            let (status, verdict) = crate::mapper::map_status_verdict(result_str);

            // Parse numeric fields
            let time_ms: Option<i32> = used_time.parse().ok();
            let memory_kb: Option<i32> = used_memory.parse().ok();

            // Use old ID as new ID
            let new_id: i64 = match old_id.parse() {
                Ok(id) => id,
                Err(_) => {
                    tracing::warn!("Cannot parse submission id '{}', skipping", old_id);
                    continue;
                }
            };

            // Insert submission (no score column per D-10-9)
            sqlx::query(
                r#"
                INSERT INTO submissions (id, organization_id, user_id, problem_id, language, code, status, verdict, time_ms, memory_kb, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(new_id)
            .bind(self.org_id)
            .bind(&user_id)
            .bind(new_problem_id.parse::<i64>().unwrap_or(0))
            .bind(mapped_lang)
            .bind(content)
            .bind(status)
            .bind(verdict)
            .bind(time_ms)
            .bind(memory_kb)
            .bind(submit_time)
            .execute(&self.pool)
            .await?;

            // If contest_id is set, create contest_submissions row
            if contest_id_str != "NULL" && !contest_id_str.is_empty() {
                if let Some(new_contest_id_str) = self.id_map.get("contest", contest_id_str) {
                    if let Ok(new_contest_id) = new_contest_id_str.parse::<i64>() {
                        sqlx::query(
                            r#"
                            INSERT INTO contest_submissions (contest_id, submission_id, penalty_time)
                            VALUES ($1, $2, $3)
                            ON CONFLICT DO NOTHING
                            "#,
                        )
                        .bind(new_contest_id)
                        .bind(new_id)
                        .bind(0i32) // penalty_time = 0 (no penalty data in UOJ)
                        .execute(&self.pool)
                        .await?;
                    }
                }
            }

            // Store mapping
            self.id_map
                .get_or_insert("submission", old_id, new_id.to_string())
                .await?;

            migrated += 1;
        }

        tracing::info!(
            "Submission migration complete: {} migrated, {} skipped (language), {} skipped (no user), {} skipped (no problem)",
            migrated,
            skipped_language,
            skipped_no_user,
            skipped_no_problem
        );
        Ok(())
    }

    /// Decode a UOJ result blob value.
    ///
    /// UOJ stores result as a MySQL BLOB. In the dump, this appears as
    /// either hex-encoded (0x...) or plain text.
    fn decode_blob_result(&self, raw: &str) -> String {
        if raw.starts_with("0x") || raw.starts_with("0X") {
            // Hex-encoded blob: decode hex bytes to UTF-8
            let hex_str = &raw[2..];
            let bytes: Vec<u8> = (0..hex_str.len())
                .step_by(2)
                .filter_map(|i| {
                    u8::from_str_radix(&hex_str[i..i + 2.min(hex_str.len() - i)], 16).ok()
                })
                .collect();
            String::from_utf8_lossy(&bytes).to_string()
        } else {
            raw.to_string()
        }
    }

    /// Migrate UOJ contests and related junction tables to AlgoMaster.
    ///
    /// - Calculates end_time from start_time + last_min
    /// - Migrates contest_problems with ID remapping
    /// - Migrates contest_participants with username->UUID lookup
    /// - UNIQUE constraints handled via ON CONFLICT DO NOTHING
    pub async fn migrate_contests(&mut self) -> Result<()> {
        tracing::info!("Starting contest migration...");

        let contest_rows = match self.dump.tables.get("contests") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No contests table found in dump, skipping contest migration");
                return Ok(());
            }
        };

        tracing::info!("Found {} contest rows in dump", contest_rows.len());

        let mut migrated = 0u64;
        let mut skipped = 0u64;

        for row in contest_rows {
            // UOJ contests columns: id, name, start_time, last_min, player_num,
            // status, extra_config, zan
            if row.len() < 8 {
                tracing::warn!("Skipping malformed contests row ({} fields)", row.len());
                skipped += 1;
                continue;
            }

            let old_id = &row[0];
            let name = &row[1];
            let start_time = &row[2];
            let last_min = &row[3];

            // Skip if already migrated
            if self.id_map.contains("contest", old_id) {
                tracing::debug!("Contest {} already migrated, skipping", old_id);
                continue;
            }

            // Parse end_time = start_time + last_min minutes
            let last_min_val: i64 = last_min.parse().unwrap_or(180);
            let end_time = match chrono::NaiveDateTime::parse_from_str(start_time, "%Y-%m-%d %H:%M:%S") {
                Ok(dt) => (dt + chrono::Duration::minutes(last_min_val)).format("%Y-%m-%d %H:%M:%S").to_string(),
                Err(_) => {
                    tracing::warn!(
                        "Cannot parse start_time '{}' for contest {}, skipping",
                        start_time,
                        old_id
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Use old ID as new ID
            let new_id: i64 = match old_id.parse() {
                Ok(id) => id,
                Err(_) => {
                    tracing::warn!("Cannot parse contest id '{}', skipping", old_id);
                    skipped += 1;
                    continue;
                }
            };

            // Insert contest
            sqlx::query(
                r#"
                INSERT INTO contests (id, organization_id, campus_id, name, rules, start_time, end_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(new_id)
            .bind(self.org_id)
            .bind(self.campus_id)
            .bind(name)
            .bind("acm") // default rules
            .bind(start_time)
            .bind(&end_time)
            .execute(&self.pool)
            .await?;

            // Store mapping
            self.id_map
                .get_or_insert("contest", old_id, new_id.to_string())
                .await?;

            migrated += 1;
        }

        tracing::info!(
            "Contest migration complete: {} migrated, {} skipped",
            migrated,
            skipped
        );

        // Migrate contest_problems
        self.migrate_contest_problems().await?;

        // Migrate contest_participants
        self.migrate_contest_participants().await?;

        Ok(())
    }

    /// Migrate contest_problems junction table with ID remapping.
    async fn migrate_contest_problems(&mut self) -> Result<()> {
        tracing::info!("Starting contest_problems migration...");

        let rows = match self.dump.tables.get("contests_problems") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No contests_problems table found in dump, skipping");
                return Ok(());
            }
        };

        let mut migrated = 0u64;
        let mut skipped = 0u64;
        let mut order = std::collections::HashMap::<i64, i32>::new();

        for row in rows {
            // contests_problems columns: problem_id, contest_id
            if row.len() < 2 {
                continue;
            }

            let problem_id_str = &row[0];
            let contest_id_str = &row[1];

            // Look up remapped IDs
            let new_problem_id = match self.id_map.get("problem", problem_id_str) {
                Some(id) => id.parse::<i64>().unwrap_or(0),
                None => {
                    tracing::debug!(
                        "Skipping contest_problem: problem {} not mapped",
                        problem_id_str
                    );
                    skipped += 1;
                    continue;
                }
            };

            let new_contest_id = match self.id_map.get("contest", contest_id_str) {
                Some(id) => id.parse::<i64>().unwrap_or(0),
                None => {
                    tracing::debug!(
                        "Skipping contest_problem: contest {} not mapped",
                        contest_id_str
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Track order per contest
            let idx = order.entry(new_contest_id).or_insert(0);
            *idx += 1;

            sqlx::query(
                r#"
                INSERT INTO contest_problems (contest_id, problem_id, points, order_index)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (contest_id, problem_id) DO NOTHING
                "#,
            )
            .bind(new_contest_id)
            .bind(new_problem_id)
            .bind(100) // default points
            .bind(*idx)
            .execute(&self.pool)
            .await?;

            migrated += 1;
        }

        tracing::info!(
            "contest_problems migration complete: {} migrated, {} skipped",
            migrated,
            skipped
        );
        Ok(())
    }

    /// Migrate contest_participants from contests_registrants with username->UUID lookup.
    async fn migrate_contest_participants(&mut self) -> Result<()> {
        tracing::info!("Starting contest_participants migration...");

        let rows = match self.dump.tables.get("contests_registrants") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No contests_registrants table found in dump, skipping");
                return Ok(());
            }
        };

        let mut migrated = 0u64;
        let mut skipped = 0u64;

        for row in rows {
            // contests_registrants columns: username, user_rating, contest_id,
            // has_participated, rank
            if row.len() < 3 {
                continue;
            }

            let username = &row[0];
            let contest_id_str = &row[2];

            // Look up user UUID
            let user_id = match self.id_map.get("user", username) {
                Some(id) => id,
                None => {
                    tracing::debug!(
                        "Skipping contest_participant: user '{}' not mapped",
                        username
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Look up contest ID
            let new_contest_id = match self.id_map.get("contest", contest_id_str) {
                Some(id) => id,
                None => {
                    tracing::debug!(
                        "Skipping contest_participant: contest {} not mapped",
                        contest_id_str
                    );
                    skipped += 1;
                    continue;
                }
            };

            sqlx::query(
                r#"
                INSERT INTO contest_participants (contest_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (contest_id, user_id) DO NOTHING
                "#,
            )
            .bind(new_contest_id.parse::<i64>().unwrap_or(0))
            .bind(&user_id)
            .execute(&self.pool)
            .await?;

            migrated += 1;
        }

        tracing::info!(
            "contest_participants migration complete: {} migrated, {} skipped",
            migrated,
            skipped
        );
        Ok(())
    }

    /// Migrate UOJ blogs, blog comments, and blog tags to AlgoMaster.
    ///
    /// - Aggregates tags from blogs_tags into a HashMap per blog_id
    /// - Maps blog -> article with slug generation, visibility inversion
    /// - Maps blogs_comments -> article_comments with flat structure
    /// - Updates article comment counts after all comments are inserted
    pub async fn migrate_blogs(&mut self) -> Result<()> {
        tracing::info!("Starting blog migration...");

        // Pre-processing: aggregate tags per blog_id
        let tags_map = self.build_blog_tags_map();
        tracing::info!("Aggregated tags for {} blogs", tags_map.len());

        // Migrate articles from blogs table
        let blog_rows = match self.dump.tables.get("blogs") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No blogs table found in dump, skipping blog migration");
                return Ok(());
            }
        };

        tracing::info!("Found {} blog rows in dump", blog_rows.len());

        let mut migrated = 0u64;
        let mut skipped = 0u64;

        for row in blog_rows {
            // UOJ blogs columns: id, title, content, post_time, poster,
            // content_md, zan, is_hidden, blog_type, is_draft
            if row.len() < 10 {
                tracing::warn!("Skipping malformed blogs row ({} fields)", row.len());
                skipped += 1;
                continue;
            }

            let old_id = &row[0];
            let title = &row[1];
            // row[2] is HTML content, we use content_md instead
            let _post_time = &row[3];
            let poster = &row[4];
            let content_md = &row[5];
            let zan = &row[6];
            let is_hidden = &row[7];

            // Skip if already migrated (idempotency D-10-7)
            if self.id_map.contains("blog", old_id) {
                tracing::debug!("Blog {} already migrated, skipping", old_id);
                continue;
            }

            // Look up author_id from id_map
            let author_id = match self.id_map.get("user", poster) {
                Some(id) => id,
                None => {
                    tracing::warn!(
                        "Skipping blog {}: poster '{}' not found in id_map",
                        old_id,
                        poster
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Generate slug via mapper::generate_slug
            let old_id_num: i64 = match old_id.parse() {
                Ok(id) => id,
                Err(_) => {
                    tracing::warn!("Cannot parse blog id '{}', skipping", old_id);
                    skipped += 1;
                    continue;
                }
            };
            let slug = crate::mapper::generate_slug(title, old_id_num);

            // Look up tags from aggregated HashMap
            let tags = tags_map.get(&old_id_num).cloned().unwrap_or_default();

            // Determine published state
            let is_published = is_hidden == "0";
            let published_at: Option<String> = if is_published {
                Some(_post_time.clone())
            } else {
                None
            };

            // Parse like_count from zan
            let like_count: i64 = zan.parse().unwrap_or(0);

            // Insert article with explicit id
            sqlx::query(
                r#"
                INSERT INTO articles (id, title, slug, content, author_id, tags, category,
                    is_published, is_featured, view_count, like_count, comment_count, created_at, published_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(old_id_num)
            .bind(title)
            .bind(&slug)
            .bind(content_md)
            .bind(&author_id)
            .bind(&tags)
            .bind("general")
            .bind(is_published)
            .bind(false) // is_featured
            .bind(0i64)  // view_count
            .bind(like_count)
            .bind(0i64)  // comment_count (updated after comments)
            .bind(_post_time) // created_at
            .bind(published_at.as_deref())
            .execute(&self.pool)
            .await?;

            // Store mapping
            self.id_map
                .get_or_insert("blog", old_id, old_id_num.to_string())
                .await?;

            migrated += 1;
        }

        tracing::info!(
            "Article migration complete: {} migrated, {} skipped",
            migrated,
            skipped
        );

        // Migrate article_comments from blogs_comments
        self.migrate_blog_comments().await?;

        // Update article comment counts
        sqlx::query(
            r#"
            UPDATE articles SET comment_count = (
                SELECT COUNT(*) FROM article_comments WHERE article_comments.article_id = articles.id
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        tracing::info!("Updated article comment counts");

        Ok(())
    }

    /// Build a HashMap of blog_id -> Vec<tag> from blogs_tags table.
    fn build_blog_tags_map(&self) -> std::collections::HashMap<i64, Vec<String>> {
        let mut map: std::collections::HashMap<i64, Vec<String>> = std::collections::HashMap::new();
        if let Some(rows) = self.dump.tables.get("blogs_tags") {
            for row in rows {
                // blogs_tags columns: id, blog_id, tag
                if row.len() >= 3 {
                    if let Ok(blog_id) = row[1].parse::<i64>() {
                        let tag = &row[2];
                        if tag != "NULL" && !tag.is_empty() {
                            map.entry(blog_id).or_default().push(tag.clone());
                        }
                    }
                }
            }
        }
        map
    }

    /// Migrate blog comments from blogs_comments to article_comments.
    ///
    /// UOJ comments are flat (no parent/child), so parent_id is always NULL.
    async fn migrate_blog_comments(&mut self) -> Result<()> {
        tracing::info!("Starting blog comments migration...");

        let rows = match self.dump.tables.get("blogs_comments") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No blogs_comments table found in dump, skipping");
                return Ok(());
            }
        };

        tracing::info!("Found {} blog comment rows in dump", rows.len());

        let mut migrated = 0u64;
        let mut skipped = 0u64;

        for row in rows {
            // UOJ blogs_comments columns: id, blog_id, content, post_time,
            // poster, zan, reply_id
            if row.len() < 7 {
                tracing::warn!("Skipping malformed blogs_comments row ({} fields)", row.len());
                skipped += 1;
                continue;
            }

            let old_id = &row[0];
            let blog_id_str = &row[1];
            let content = &row[2];
            let post_time = &row[3];
            let poster = &row[4];

            // Skip if already migrated
            if self.id_map.contains("blog_comment", old_id) {
                tracing::debug!("Blog comment {} already migrated, skipping", old_id);
                continue;
            }

            // Look up article_id from id_map
            let article_id = match self.id_map.get("blog", blog_id_str) {
                Some(id) => match id.parse::<i64>() {
                    Ok(id) => id,
                    Err(_) => {
                        tracing::debug!(
                            "Skipping blog comment {}: article id '{}' not numeric",
                            old_id,
                            id
                        );
                        skipped += 1;
                        continue;
                    }
                },
                None => {
                    tracing::debug!(
                        "Skipping blog comment {}: blog '{}' not found in id_map",
                        old_id,
                        blog_id_str
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Look up author_id from id_map
            let author_id = match self.id_map.get("user", poster) {
                Some(id) => id,
                None => {
                    tracing::warn!(
                        "Skipping blog comment {}: poster '{}' not found in id_map",
                        old_id,
                        poster
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Use old ID as new ID
            let new_id: i64 = match old_id.parse() {
                Ok(id) => id,
                Err(_) => {
                    tracing::warn!("Cannot parse blog comment id '{}', skipping", old_id);
                    skipped += 1;
                    continue;
                }
            };

            // Insert comment (flat structure, parent_id = NULL)
            sqlx::query(
                r#"
                INSERT INTO article_comments (id, article_id, parent_id, content, author_id, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(new_id)
            .bind(article_id)
            .bind(None::<i64>) // parent_id = NULL (flat comments)
            .bind(content)
            .bind(&author_id)
            .bind(post_time)
            .execute(&self.pool)
            .await?;

            // Store mapping
            self.id_map
                .get_or_insert("blog_comment", old_id, new_id.to_string())
                .await?;

            migrated += 1;
        }

        tracing::info!(
            "Blog comments migration complete: {} migrated, {} skipped",
            migrated,
            skipped
        );
        Ok(())
    }

    /// Migrate UOJ click_zans (likes) to AlgoMaster likes table.
    ///
    /// - "B" (blog) -> target_type = "article", target_id from id_map
    /// - "P" (problem) -> target_type = "problem", target_id from id_map
    /// - Only migrate positive likes (zan_val > 0)
    /// - ON CONFLICT DO NOTHING for UNIQUE(user_id, target_type, target_id)
    pub async fn migrate_likes(&mut self) -> Result<()> {
        tracing::info!("Starting likes migration...");

        let rows = match self.dump.tables.get("click_zans") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No click_zans table found in dump, skipping likes migration");
                return Ok(());
            }
        };

        tracing::info!("Found {} click_zan rows in dump", rows.len());

        let mut migrated = 0u64;
        let mut skipped_type = 0u64;
        let mut skipped_no_user = 0u64;
        let mut skipped_no_target = 0u64;
        let mut skipped_negative = 0u64;

        for row in rows {
            // UOJ click_zans columns: type, username, target_id, zan_val
            if row.len() < 4 {
                continue;
            }

            let zan_type = &row[0];
            let username = &row[1];
            let target_id_str = &row[2];
            let zan_val_str = &row[3];

            // Only migrate positive likes
            let zan_val: i32 = match zan_val_str.parse() {
                Ok(v) => v,
                Err(_) => continue,
            };
            if zan_val <= 0 {
                skipped_negative += 1;
                continue;
            }

            // Map type to target_type and look up new target_id
            let (target_type, new_target_id) = match zan_type.as_str() {
                "B" => {
                    let new_id = match self.id_map.get("blog", target_id_str) {
                        Some(id) => id,
                        None => {
                            tracing::debug!(
                                "Skipping like: blog target '{}' not found in id_map",
                                target_id_str
                            );
                            skipped_no_target += 1;
                            continue;
                        }
                    };
                    ("article", new_id)
                }
                "P" => {
                    let new_id = match self.id_map.get("problem", target_id_str) {
                        Some(id) => id,
                        None => {
                            tracing::debug!(
                                "Skipping like: problem target '{}' not found in id_map",
                                target_id_str
                            );
                            skipped_no_target += 1;
                            continue;
                        }
                    };
                    ("problem", new_id)
                }
                other => {
                    tracing::debug!("Skipping like with unsupported type '{}'", other);
                    skipped_type += 1;
                    continue;
                }
            };

            // Look up user_id from id_map
            let user_id = match self.id_map.get("user", username) {
                Some(id) => id,
                None => {
                    tracing::debug!(
                        "Skipping like: user '{}' not found in id_map",
                        username
                    );
                    skipped_no_user += 1;
                    continue;
                }
            };

            // Parse target_id to i64 for the likes table
            let target_id_i64: i64 = match new_target_id.parse() {
                Ok(id) => id,
                Err(_) => {
                    tracing::debug!(
                        "Skipping like: target_id '{}' not numeric",
                        new_target_id
                    );
                    skipped_no_target += 1;
                    continue;
                }
            };

            // Insert with ON CONFLICT DO NOTHING (UNIQUE constraint)
            sqlx::query(
                r#"
                INSERT INTO likes (user_id, target_type, target_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, target_type, target_id) DO NOTHING
                "#,
            )
            .bind(&user_id)
            .bind(target_type)
            .bind(target_id_i64)
            .execute(&self.pool)
            .await?;

            migrated += 1;
        }

        tracing::info!(
            "Likes migration complete: {} migrated, {} skipped (unsupported type), {} skipped (no user), {} skipped (no target), {} skipped (negative)",
            migrated,
            skipped_type,
            skipped_no_user,
            skipped_no_target,
            skipped_negative
        );
        Ok(())
    }

    /// Migrate UOJ user_msg to AlgoMaster direct_conversations + direct_messages.
    ///
    /// UOJ has no conversation concept -- create direct_conversations per unique
    /// (sender, receiver) pair. Uses a conversation cache to avoid duplicates.
    pub async fn migrate_messages(&mut self) -> Result<()> {
        tracing::info!("Starting messages migration...");

        let rows = match self.dump.tables.get("user_msg") {
            Some(rows) => rows,
            None => {
                tracing::warn!("No user_msg table found in dump, skipping message migration");
                return Ok(());
            }
        };

        tracing::info!("Found {} user_msg rows in dump", rows.len());

        // Conversation cache: (min_user, max_user) -> conversation_id
        let mut conv_cache: std::collections::HashMap<(String, String), uuid::Uuid> =
            std::collections::HashMap::new();

        let mut msg_count = 0u64;
        let mut skipped = 0u64;

        for row in rows {
            // UOJ user_msg columns: id, sender, receiver, message, send_time, read_time
            if row.len() < 6 {
                continue;
            }

            let _old_id = &row[0];
            let sender = &row[1];
            let receiver = &row[2];
            let message = &row[3];
            let send_time = &row[4];

            // Look up sender_id and receiver_id from id_map
            let sender_id = match self.id_map.get("user", sender) {
                Some(id) => id,
                None => {
                    tracing::debug!(
                        "Skipping message: sender '{}' not found in id_map",
                        sender
                    );
                    skipped += 1;
                    continue;
                }
            };

            let receiver_id = match self.id_map.get("user", receiver) {
                Some(id) => id,
                None => {
                    tracing::debug!(
                        "Skipping message: receiver '{}' not found in id_map",
                        receiver
                    );
                    skipped += 1;
                    continue;
                }
            };

            // Create conversation key: (min, max) to normalize pair ordering
            let (min_user, max_user) = if sender_id < receiver_id {
                (sender_id.clone(), receiver_id.clone())
            } else {
                (receiver_id.clone(), sender_id.clone())
            };

            // Get or create conversation
            let conversation_id = if let Some(conv_id) = conv_cache.get(&(min_user.clone(), max_user.clone())) {
                *conv_id
            } else {
                // Insert new conversation
                let conv_id = uuid::Uuid::new_v4();
                sqlx::query(
                    r#"
                    INSERT INTO direct_conversations (id, user1_id, user2_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT DO NOTHING
                    "#,
                )
                .bind(conv_id)
                .bind(&min_user)
                .bind(&max_user)
                .execute(&self.pool)
                .await?;

                conv_cache.insert((min_user, max_user), conv_id);
                conv_id
            };

            // Insert message
            let msg_id = uuid::Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO direct_messages (id, conversation_id, sender_id, content, created_at)
                VALUES ($1, $2, $3, $4, $5)
                "#,
            )
            .bind(msg_id)
            .bind(conversation_id)
            .bind(&sender_id)
            .bind(message)
            .bind(send_time)
            .execute(&self.pool)
            .await?;

            msg_count += 1;
        }

        let conv_count = conv_cache.len();
        tracing::info!(
            "Migrated {} messages in {} conversations ({} skipped)",
            msg_count,
            conv_count,
            skipped
        );
        Ok(())
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

        // 3. Problems + test cases
        self.migrate_problems().await?;

        // 4. Submissions
        self.migrate_submissions().await?;

        // 5. Contests + contest_problems + contest_participants
        self.migrate_contests().await?;

        // 6. Blogs + comments + tags
        self.migrate_blogs().await?;

        // 7. Likes
        self.migrate_likes().await?;

        // 8. Direct messages
        self.migrate_messages().await?;

        tracing::info!("Migration complete!");
        Ok(())
    }
}
