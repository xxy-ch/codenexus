use super::models::*;
use crate::auth::JwtService;
use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

pub struct UserService {
    pool: PgPool,
    jwt_service: JwtService,
}

impl UserService {
    pub fn new(pool: PgPool, jwt_service: JwtService) -> Self {
        Self { pool, jwt_service }
    }

    pub async fn register(&self, req: RegisterRequest) -> Result<UserProfile> {
        // Validate username format (numeric only)
        if !req.username.chars().all(|c| c.is_numeric()) {
            return Err(anyhow::anyhow!("Username must be numeric only"));
        }

        // Check if username already exists
        let existing_user = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM users WHERE username = $1"
        )
        .bind(&req.username)
        .fetch_optional(&self.pool)
        .await?;

        if existing_user.is_some() {
            return Err(anyhow::anyhow!("Username already exists"));
        }

        // Check if email already exists (if provided)
        if let Some(ref email) = req.email {
            if !email.is_empty() {
                let existing_email = sqlx::query_scalar::<_, Uuid>(
                    "SELECT id FROM users WHERE email = $1"
                )
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
        let display_name = req.display_name.clone().unwrap_or_else(|| req.username.clone());

        // Create user
        let user_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO users (username, email, password_hash, display_name, organization_id, campus_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            "#
        )
        .bind(&req.username)
        .bind(&req.email)
        .bind(&password_hash)
        .bind(&display_name)
        .bind(req.organization_id)
        .bind(req.campus_id)
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
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE username = $1"
        )
        .bind(&req.username)
        .fetch_optional(&self.pool)
        .await?;

        let user = user.ok_or_else(|| anyhow::anyhow!("Invalid credentials"))?;

        // Verify password
        bcrypt::verify(&req.password, &user.password_hash)?
            .then_some(())
            .ok_or_else(|| anyhow::anyhow!("Invalid credentials"))?;

        // Get user role
        let role = sqlx::query_scalar::<_, String>(
            r#"
            SELECT CASE role
                WHEN 'root' THEN 'admin'
                WHEN 'campusadmin' THEN 'admin'
                WHEN 'teacher' THEN 'teacher'
                ELSE 'user'
            END
            FROM user_roles
            WHERE user_id = $1
            ORDER BY created_at ASC
            LIMIT 1
            "#
        )
        .bind(user.id)
        .fetch_one(&self.pool)
        .await?;

        // Create user profile
        let user_profile = UserProfile {
            id: user.id,
            username: user.username.clone(),
            email: user.email.clone(),
            display_name: user.display_name.clone(),
            organization_id: user.organization_id,
            campus_id: user.campus_id,
            role: role.clone(),
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        // Generate tokens - convert to shared User model
        let shared_user = shared::models::User {
            id: user.id,
            username: user.username.clone(),
            email: user.email.unwrap_or_else(|| "".to_string()), // Handle optional email
            password_hash: user.password_hash,
            role,
            school_id: user.organization_id,
            campus_id: user.campus_id,
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
        let claims = self.jwt_service.validate_token(&req.refresh_token)
            .map_err(|e| anyhow::anyhow!("Invalid refresh token: {}", e))?;
        let user_id = claims.sub;

        // Get user
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        // Get user role
        let role = sqlx::query_scalar::<_, String>(
            r#"
            SELECT CASE role
                WHEN 'root' THEN 'admin'
                WHEN 'campusadmin' THEN 'admin'
                WHEN 'teacher' THEN 'teacher'
                ELSE 'user'
            END
            FROM user_roles
            WHERE user_id = $1
            ORDER BY created_at ASC
            LIMIT 1
            "#
        )
        .bind(user.id)
        .fetch_one(&self.pool)
        .await?;

        // Create user profile
        let user_profile = UserProfile {
            id: user.id,
            username: user.username.clone(),
            email: user.email.clone(),
            display_name: user.display_name.clone(),
            organization_id: user.organization_id,
            campus_id: user.campus_id,
            role: role.clone(),
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        // Generate new tokens - convert to shared User model
        let shared_user = shared::models::User {
            id: user.id,
            username: user.username.clone(),
            email: user.email.unwrap_or_else(|| "".to_string()),
            password_hash: user.password_hash,
            role,
            school_id: user.organization_id,
            campus_id: user.campus_id,
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
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        // Get user role
        let role = sqlx::query_scalar::<_, String>(
            r#"
            SELECT CASE role
                WHEN 'root' THEN 'admin'
                WHEN 'campusadmin' THEN 'admin'
                WHEN 'teacher' THEN 'teacher'
                ELSE 'user'
            END
            FROM user_roles
            WHERE user_id = $1
            ORDER BY created_at ASC
            LIMIT 1
            "#
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(UserProfile {
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            organization_id: user.organization_id,
            campus_id: user.campus_id,
            role,
            created_at: user.created_at,
            updated_at: user.updated_at,
        })
    }

    pub async fn update_user_profile(&self, user_id: Uuid, updates: UserProfileUpdate) -> Result<UserProfile> {
        // Build dynamic update query
        let mut update_parts = vec![];
        let mut param_count = 0;

        if updates.email.is_some() {
            param_count += 1;
            update_parts.push(format!("email = COALESCE(${}, email)", param_count));
        }

        if updates.display_name.is_some() {
            param_count += 1;
            update_parts.push(format!("display_name = COALESCE(${}, display_name)", param_count));
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
}
