use super::models::*;
use anyhow::Result;
use api_infra::traits::token_service::TokenService;
use md5::Digest;
use sqlx::PgPool;
use std::sync::Arc;
use tracing::info;
use uuid::Uuid;

pub struct UserService {
    pool: PgPool,
    jwt_service: Arc<dyn TokenService>,
}

impl UserService {
    pub fn new(pool: PgPool, jwt_service: Arc<dyn TokenService>) -> Self {
        Self { pool, jwt_service }
    }

    pub async fn register(&self, req: RegisterRequest) -> Result<UserProfile> {
        // Validate password complexity
        if req.password.len() < 8 {
            return Err(anyhow::anyhow!("Password must be at least 8 characters"));
        }

        // Validate username format (numeric only)
        if !req.username.chars().all(|c| c.is_numeric()) {
            return Err(anyhow::anyhow!("Username must be numeric only"));
        }

        if let Some(user_code) = &req.user_code {
            Self::validate_user_code(user_code)?;
        }

        // Check if username already exists
        let existing_user =
            sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE username = $1")
                .bind(&req.username)
                .fetch_optional(&self.pool)
                .await?;

        if existing_user.is_some() {
            return Err(anyhow::anyhow!("Username already exists"));
        }

        if let Some(user_code) = &req.user_code {
            let existing_user_code =
                sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE user_code = $1")
                    .bind(user_code)
                    .fetch_optional(&self.pool)
                    .await?;

            if existing_user_code.is_some() {
                return Err(anyhow::anyhow!("User code already exists"));
            }
        }

        // Check if email already exists (if provided)
        if let Some(ref email) = req.email {
            if !email.is_empty() {
                let existing_email =
                    sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE email = $1")
                        .bind(email)
                        .fetch_optional(&self.pool)
                        .await?;

                if existing_email.is_some() {
                    return Err(anyhow::anyhow!("Email already exists"));
                }
            }
        }

        // Hash password
        let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST)?;

        // Create display_name from username if not provided
        let display_name = req
            .display_name
            .clone()
            .unwrap_or_else(|| req.username.clone());

        // Create user
        let user_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO users (user_code, username, email, password_hash, display_name, organization_id, campus_id, grade_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            "#
        )
        .bind(&req.user_code)
        .bind(&req.username)
        .bind(&req.email)
        .bind(&password_hash)
        .bind(&display_name)
        .bind(req.organization_id)
        .bind(req.campus_id)
        .bind(req.grade_id)
        .fetch_one(&self.pool)
        .await?;

        // Assign default user role
        sqlx::query(
            "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, 'student')"
        )
        .bind(user_id)
        .bind(req.organization_id)
        .bind(req.campus_id)
        .execute(&self.pool)
        .await?;

        self.get_user_profile(user_id).await
    }

    pub async fn login(&self, req: LoginRequest) -> Result<AuthResponse> {
        // Get user by username
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = $1")
            .bind(&req.username)
            .fetch_optional(&self.pool)
            .await?;

        let user = user.ok_or_else(|| anyhow::anyhow!("Invalid credentials"))?;

        // Verify password (with transparent MD5→bcrypt migration per D-10-2)
        if user.password_hash.starts_with("{MD5}") {
            // Transparent MD5 migration path
            let md5_hash = &user.password_hash[5..]; // strip "{MD5}" prefix
            if verify_md5_password(&req.password, md5_hash) {
                // Upgrade to bcrypt
                let new_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST)?;
                sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
                    .bind(&new_hash)
                    .bind(user.id)
                    .execute(&self.pool)
                    .await?;
                info!("MD5 password upgraded to bcrypt for user: {}", user.username);
            } else {
                return Err(anyhow::anyhow!("Invalid credentials"));
            }
        } else {
            // Normal bcrypt verification
            bcrypt::verify(&req.password, &user.password_hash)?
                .then_some(())
                .ok_or_else(|| anyhow::anyhow!("Invalid credentials"))?;
        }

        // Get user role and authorization grade_id from user_roles (D-07/D-08)
        // Role and grade_id come from user_roles (authorization scope),
        // not from users table (identity).
        let role_row = sqlx::query_as::<_, (String, Option<i64>)>(
            "SELECT role, grade_id FROM user_roles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
        )
        .bind(user.id)
        .fetch_one(&self.pool)
        .await?;
        let (role, auth_grade_id) = role_row;

        // Create user profile - grade_id from users table (identity)
        let user_profile = UserProfile {
            id: user.id,
            user_code: user.user_code.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            display_name: user.display_name.clone(),
            organization_id: user.organization_id,
            campus_id: user.campus_id,
            grade_id: user.grade_id,
            role: role.clone(),
            status: user.status.clone(),
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        // Generate tokens - grade_id from user_roles (authorization scope per D-07/D-08)
        let shared_user = shared::models::User {
            id: user.id,
            username: user.username.clone(),
            email: user.email.unwrap_or_else(|| "".to_string()), // Handle optional email
            password_hash: user.password_hash,
            role,
            school_id: user.organization_id,
            campus_id: user.campus_id,
            grade_id: auth_grade_id,
        };

        let token = self.jwt_service.generate_access_token(&shared_user)?;
        let refresh_token = self.jwt_service.generate_refresh_token(&shared_user)?;

        Ok(AuthResponse {
            token,
            refresh_token,
            user: user_profile,
        })
    }

    pub async fn refresh_token(&self, req: RefreshTokenRequest) -> Result<AuthResponse> {
        // Verify refresh token
        let claims = self
            .jwt_service
            .validate_token(&req.refresh_token)
            .map_err(|e| anyhow::anyhow!("Invalid refresh token: {}", e))?;
        let user_id = claims.sub;

        // Get user
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;

        // Get user role and authorization grade_id from user_roles (D-07/D-08)
        let role_row = sqlx::query_as::<_, (String, Option<i64>)>(
            "SELECT role, grade_id FROM user_roles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
        )
        .bind(user.id)
        .fetch_one(&self.pool)
        .await?;
        let (role, auth_grade_id) = role_row;

        // Create user profile - grade_id from users table (identity)
        let user_profile = UserProfile {
            id: user.id,
            user_code: user.user_code.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            display_name: user.display_name.clone(),
            organization_id: user.organization_id,
            campus_id: user.campus_id,
            grade_id: user.grade_id,
            role: role.clone(),
            status: user.status.clone(),
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        // Generate new tokens - grade_id from user_roles (authorization scope per D-07/D-08)
        let shared_user = shared::models::User {
            id: user.id,
            username: user.username.clone(),
            email: user.email.unwrap_or_else(|| "".to_string()),
            password_hash: user.password_hash,
            role,
            school_id: user.organization_id,
            campus_id: user.campus_id,
            grade_id: auth_grade_id,
        };

        let token = self.jwt_service.generate_access_token(&shared_user)?;
        let refresh_token = self.jwt_service.generate_refresh_token(&shared_user)?;

        Ok(AuthResponse {
            token,
            refresh_token,
            user: user_profile,
        })
    }

    pub async fn get_user_profile(&self, user_id: Uuid) -> Result<UserProfile> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;

        // Get user role (canonical role from DB)
        let role = sqlx::query_scalar::<_, String>(
            "SELECT role FROM user_roles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(UserProfile {
            id: user.id,
            user_code: user.user_code,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            organization_id: user.organization_id,
            campus_id: user.campus_id,
            grade_id: user.grade_id,
            role,
            status: user.status,
            created_at: user.created_at,
            updated_at: user.updated_at,
        })
    }

    pub async fn update_user_profile(
        &self,
        user_id: Uuid,
        updates: UserProfileUpdate,
    ) -> Result<UserProfile> {
        // Build dynamic update query
        let mut update_parts = vec![];
        let mut param_count = 0;

        if updates.email.is_some() {
            param_count += 1;
            update_parts.push(format!("email = COALESCE(${}, email)", param_count));
        }

        if updates.display_name.is_some() {
            param_count += 1;
            update_parts.push(format!(
                "display_name = COALESCE(${}, display_name)",
                param_count
            ));
        }

        if updates.campus_id.is_some() {
            param_count += 1;
            update_parts.push(format!("campus_id = COALESCE(${}, campus_id)", param_count));
        }

        // Add password update if provided
        if updates.password.is_some() {
            param_count += 1;
            update_parts.push(format!("password_hash = ${}", param_count));
        }

        update_parts.push("updated_at = NOW()".to_string());

        let update_query = format!(
            "UPDATE users SET {} WHERE id = ${}",
            update_parts.join(", "),
            param_count + 1
        );

        let mut query_builder = sqlx::query(&update_query);

        if let Some(email) = &updates.email {
            query_builder = query_builder.bind(email);
        }

        if let Some(display_name) = &updates.display_name {
            query_builder = query_builder.bind(display_name);
        }

        if let Some(campus_id) = updates.campus_id {
            query_builder = query_builder.bind(campus_id);
        }

        if let Some(password) = &updates.password {
            let hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)?;
            query_builder = query_builder.bind(hash);
        }

        query_builder = query_builder.bind(user_id);
        query_builder.execute(&self.pool).await?;

        self.get_user_profile(user_id).await
    }

    pub async fn list_admin_users(&self, query: AdminUserQuery, organization_id: i64) -> Result<AdminUserListResponse> {
        let page = query.page.unwrap_or(1).max(1);
        let limit = query.limit.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * limit;

        let sort_clause = match query.sort.as_deref() {
            Some("name") => "u.username ASC",
            Some("submissions") => "submissions_count DESC, u.created_at DESC",
            Some("rating") => "problems_solved DESC, submissions_count DESC",
            _ => "u.created_at DESC",
        };

        let search = query
            .search
            .as_ref()
            .map(|value| format!("%{}%", value.trim()));
        let role = query.role.as_deref();
        let status = query.status.as_deref();

        let query_sql = format!(
            r#"
            WITH user_metrics AS (
                SELECT
                    u.id,
                    u.user_code,
                    u.username,
                    u.email,
                    u.display_name,
                    u.status,
                    u.organization_id,
                    o.name AS organization_name,
                    u.created_at,
                    ur.role,
                    COUNT(s.id) AS submissions_count,
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac') AS problems_solved
                FROM users u
                JOIN organizations o ON o.id = u.organization_id
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN submissions s ON s.user_id = u.id
                WHERE ($1::TEXT IS NULL OR u.username ILIKE $1 OR COALESCE(u.email, '') ILIKE $1 OR COALESCE(u.user_code, '') ILIKE $1)
                  AND ($2::TEXT IS NULL OR ur.role = $2)
                  AND ($3::TEXT IS NULL OR u.status = $3)
                  AND u.organization_id = $6
                GROUP BY u.id, u.user_code, u.username, u.email, u.display_name, u.status, u.organization_id, o.name, u.created_at, ur.role
            )
            SELECT *
            FROM user_metrics u
            ORDER BY {sort_clause}
            LIMIT $4 OFFSET $5
            "#
        );

        let users = sqlx::query_as::<_, AdminUserRow>(&query_sql)
            .bind(search.as_deref())
            .bind(role)
            .bind(status)
            .bind(limit)
            .bind(offset)
            .bind(organization_id)
            .fetch_all(&self.pool)
            .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            WHERE ($1::TEXT IS NULL OR u.username ILIKE $1 OR COALESCE(u.email, '') ILIKE $1 OR COALESCE(u.user_code, '') ILIKE $1)
              AND ($2::TEXT IS NULL OR ur.role = $2)
              AND ($3::TEXT IS NULL OR u.status = $3)
              AND u.organization_id = $4
            "#,
        )
        .bind(search.as_deref())
        .bind(role)
        .bind(status)
        .bind(organization_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(AdminUserListResponse {
            users,
            total,
            page,
            limit,
        })
    }

    pub async fn update_user_role(&self, user_id: Uuid, role: &str, caller_org_id: i64) -> Result<()> {
        // Validate and normalize to canonical role
        let normalized_role = role
            .parse::<shared::models::Role>()
            .map_err(|_| anyhow::anyhow!("Unsupported role: {}", role))?
            .as_str();

        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;

        // SECURITY: Verify target user belongs to the same organization
        if user.organization_id != caller_org_id {
            return Err(anyhow::anyhow!("Cannot modify users outside your organization"));
        }

        sqlx::query("DELETE FROM user_roles WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        sqlx::query(
            "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, $4)"
        )
        .bind(user_id)
        .bind(user.organization_id)
        .bind(user.campus_id)
        .bind(normalized_role)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_user_status(&self, user_id: Uuid, caller_org_id: i64) -> Result<String> {
        let next_status: String = sqlx::query_scalar(
            r#"
            UPDATE users
            SET status = CASE status
                WHEN 'active' THEN 'inactive'
                WHEN 'inactive' THEN 'active'
                ELSE 'active'
            END,
            updated_at = NOW()
            WHERE id = $1 AND organization_id = $2
            RETURNING status
            "#,
        )
        .bind(user_id)
        .bind(caller_org_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(next_status)
    }

    pub async fn batch_create_users(
        &self,
        request: BatchCreateUsersRequest,
    ) -> Result<BatchCreateUsersResponse> {
        let mut created = Vec::new();
        let mut skipped = Vec::new();
        let default_password = request
            .default_password
            .clone()
            .unwrap_or_else(|| "ChangeMe123".to_string());

        for entry in request.users {
            let user_code = entry.user_code.trim().to_string();

            if let Err(err) = Self::validate_user_code(&user_code) {
                skipped.push(BatchCreateUserSkip {
                    user_code,
                    reason: err.to_string(),
                });
                continue;
            }

            let exists = sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM users WHERE user_code = $1 OR username = $1",
            )
            .bind(&user_code)
            .fetch_optional(&self.pool)
            .await?;

            if exists.is_some() {
                skipped.push(BatchCreateUserSkip {
                    user_code,
                    reason: "User code already exists".to_string(),
                });
                continue;
            }

            let password = entry
                .password
                .clone()
                .unwrap_or_else(|| default_password.clone());
            let profile = self
                .register(RegisterRequest {
                    user_code: Some(user_code.clone()),
                    username: user_code.clone(),
                    password,
                    email: entry.email.clone(),
                    display_name: entry
                        .display_name
                        .clone()
                        .or_else(|| Some(user_code.clone())),
                    organization_id: request.organization_id,
                    campus_id: entry.campus_id.or(request.campus_id),
                    grade_id: entry.grade_id,
                })
                .await?;

            if let Some(role) = entry.role.as_deref() {
                if role != "student" {
                    self.update_user_role(profile.id, role, request.organization_id).await?;
                }
            }

            created.push(self.get_user_profile(profile.id).await?);
        }

        Ok(BatchCreateUsersResponse { created, skipped })
    }

    fn validate_user_code(user_code: &str) -> Result<()> {
        if user_code.len() != 12 || !user_code.chars().all(|c| c.is_ascii_digit()) {
            return Err(anyhow::anyhow!(
                "User code must be a 12-digit numeric string"
            ));
        }

        Ok(())
    }
}

/// Check if a password matches an {MD5}-prefixed hash (without the prefix).
/// Used for transparent MD5→bcrypt migration on first login (D-10-2).
fn verify_md5_password(password: &str, md5_hash: &str) -> bool {
    let digest = md5::Md5::digest(password.as_bytes());
    let computed: String = digest.iter().map(|b| format!("{:02x}", b)).collect();
    computed == md5_hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_md5_password_correct() {
        // MD5("test123") == cc03e747a6afbbcbf8be7668acfebee5
        assert!(verify_md5_password("test123", "cc03e747a6afbbcbf8be7668acfebee5"));
    }

    #[test]
    fn verify_md5_password_wrong() {
        assert!(!verify_md5_password("wrong", "cc03e747a6afbbcbf8be7668acfebee5"));
    }

    #[test]
    fn verify_md5_password_empty_string() {
        // MD5("") == d41d8cd98f00b204e9800998ecf8427e
        assert!(verify_md5_password("", "d41d8cd98f00b204e9800998ecf8427e"));
    }

    #[test]
    fn verify_md5_password_empty_hash_mismatch() {
        assert!(!verify_md5_password("", "cc03e747a6afbbcbf8be7668acfebee5"));
    }

    // ===================== Gap Tests for MD5 Login Flow =====================

    /// Unit test: wrong password against an {MD5}-prefixed hash returns false.
    /// This verifies the negative path of the transparent MD5 migration login
    /// flow without needing a database connection.
    #[test]
    fn test_md5_login_wrong_password() {
        // "password123" -> MD5 = 482c811da5d5b4bc6d497ffa98491e38
        let stored_hash = "482c811da5d5b4bc6d497ffa98491e38";

        // Correct password verifies
        assert!(verify_md5_password("password123", stored_hash),
            "correct password must verify against its MD5 hash");

        // Wrong passwords do not verify
        assert!(!verify_md5_password("wrong", stored_hash),
            "wrong password must NOT verify");
        assert!(!verify_md5_password("Password123", stored_hash),
            "case-different password must NOT verify");
        assert!(!verify_md5_password("password1234", stored_hash),
            "similar password must NOT verify");
        assert!(!verify_md5_password("", stored_hash),
            "empty password must NOT verify against non-empty hash");
    }

    // ===================== Phase 10: MD5->bcrypt Upgrade Flow Tests =====================

    /// 1. Verify that the {MD5} prefix is correctly detected by string inspection.
    #[test]
    fn test_md5_prefix_detection() {
        let md5_stored = "{MD5}5f4dcc3b5aa765d61d8327deb882cf99";
        assert!(md5_stored.starts_with("{MD5}"), "hash prefixed with {{MD5}} must be detected");
        assert_eq!(&md5_stored[5..], "5f4dcc3b5aa765d61d8327deb882cf99", "stripping the 5-char prefix must yield the raw MD5 hex");

        // Non-MD5 hashes (bcrypt) must NOT match
        let bcrypt_hash = "$2b$12$abcdefghijklmnopqrstuvwxyzABCDEF";
        assert!(!bcrypt_hash.starts_with("{MD5}"), "bcrypt hash must not be detected as MD5");
    }

    /// 2. Verify that `verify_md5_password` returns true for the correct password.
    ///    MD5("password") = 5f4dcc3b5aa765d61d8327deb882cf99
    #[test]
    fn test_md5_verification_correct_password() {
        assert!(
            verify_md5_password("password", "5f4dcc3b5aa765d61d8327deb882cf99"),
            "correct password must verify against its MD5 hash"
        );
    }

    /// 3. Verify that `verify_md5_password` returns false for a wrong password.
    #[test]
    fn test_md5_verification_wrong_password() {
        assert!(
            !verify_md5_password("wrongpassword", "5f4dcc3b5aa765d61d8327deb882cf99"),
            "wrong password must NOT verify against the MD5 hash"
        );
    }

    /// 4. Verify that bcrypt::hash produces a hash starting with "$2b$".
    #[test]
    fn test_bcrypt_upgrade_produces_valid_hash() {
        let hash = bcrypt::hash("password", bcrypt::DEFAULT_COST)
            .expect("bcrypt hashing must succeed");
        assert!(
            hash.starts_with("$2b$"),
            "bcrypt hash must start with '$2b$': got {}",
            hash
        );
    }

    /// 5. Verify that a bcrypt hash still verifies correctly after generation.
    #[test]
    fn test_bcrypt_upgrade_preserves_verification() {
        let plaintext = "password";
        let hash = bcrypt::hash(plaintext, bcrypt::DEFAULT_COST)
            .expect("bcrypt hashing must succeed");

        assert!(
            bcrypt::verify(plaintext, &hash).expect("bcrypt verify must not error"),
            "correct password must verify against the bcrypt hash"
        );
        assert!(
            !bcrypt::verify("wrongpassword", &hash).expect("bcrypt verify must not error"),
            "wrong password must NOT verify against the bcrypt hash"
        );
    }

    /// 6. End-to-end pure unit test of the complete MD5->bcrypt upgrade flow.
    ///
    /// Simulates the exact logic in `UserService::login` lines 122-143:
    ///   a. Detect {MD5} prefix on stored hash
    ///   b. Strip prefix, verify password against raw MD5 hex
    ///   c. Generate bcrypt hash for the same password
    ///   d. Verify bcrypt hash accepts the correct password
    ///   e. Verify bcrypt hash rejects a wrong password
    #[test]
    fn test_md5_to_bcrypt_full_flow() {
        let password = "password";
        let raw_md5 = "5f4dcc3b5aa765d61d8327deb882cf99";
        let stored_hash = format!("{{MD5}}{}", raw_md5);

        // Step 1: detect {MD5} prefix (mirrors line 123)
        assert!(
            stored_hash.starts_with("{MD5}"),
            "stored hash must carry the {{MD5}} prefix"
        );

        // Step 2: strip prefix (mirrors line 125)
        let md5_hash = &stored_hash[5..];
        assert_eq!(md5_hash, raw_md5);

        // Step 3: verify password against MD5 (mirrors line 126)
        assert!(
            verify_md5_password(password, md5_hash),
            "MD5 verification must succeed for the correct password"
        );

        // Step 4: wrong password must fail MD5 check (mirrors line 136)
        assert!(
            !verify_md5_password("wrongpassword", md5_hash),
            "MD5 verification must reject wrong password"
        );

        // Step 5: upgrade to bcrypt (mirrors line 128)
        let bcrypt_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)
            .expect("bcrypt hash generation must succeed");
        assert!(
            bcrypt_hash.starts_with("$2b$"),
            "upgraded hash must be bcrypt format"
        );

        // Step 6: verify bcrypt with correct password (mirrors line 140)
        assert!(
            bcrypt::verify(password, &bcrypt_hash).expect("bcrypt verify must not error"),
            "bcrypt must verify the original password"
        );

        // Step 7: verify bcrypt rejects wrong password
        assert!(
            !bcrypt::verify("wrongpassword", &bcrypt_hash).expect("bcrypt verify must not error"),
            "bcrypt must reject wrong password"
        );
    }
}