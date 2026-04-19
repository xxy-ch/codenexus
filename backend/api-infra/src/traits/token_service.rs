//! Token service trait for JWT operations.
//!
//! Abstracts JWT token generation and validation so that domain crates
//! can depend on the trait without depending on the concrete `JwtService`
//! implementation in the `api` crate.

use shared::models::Claims;

/// Trait for generating and validating JWT tokens.
///
/// Implemented by `api::auth::JwtService`. Domain crates use this trait
/// via `AppState.jwt_service: Arc<dyn TokenService>`.
pub trait TokenService: Send + Sync {
    /// Generate a short-lived access token for the given user.
    fn generate_access_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error>;

    /// Generate a long-lived refresh token for the given user.
    fn generate_refresh_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error>;

    /// Validate a token string and return the decoded claims.
    fn validate_token(&self, token: &str) -> Result<Claims, String>;
}
