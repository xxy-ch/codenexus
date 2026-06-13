//! JWT authentication extractor.
//!
//! Extracts pre-validated JWT claims from request extensions.
//! The `auth_middleware` must run before this extractor to populate
//! the extensions with validated claims.

use axum::{async_trait, extract::FromRequestParts, http::StatusCode};
use shared::models::Claims;

/// Extractor that reads pre-validated JWT claims from request extensions.
///
/// Requires `auth_middleware` to have run first, which validates the token
/// using `state.jwt_secret` and inserts the claims into extensions.
pub struct AuthExtractor(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthExtractor
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let claims = parts
            .extensions
            .get::<Claims>()
            .cloned()
            .ok_or(StatusCode::UNAUTHORIZED)?;
        Ok(AuthExtractor(claims))
    }
}
