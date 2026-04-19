//! JWT authentication extractor.
//!
//! Extracts and validates JWT tokens from the Authorization header or
//! access_token cookie. This extractor is independent of the concrete
//! `JwtService` type in the `api` crate.

use axum::{async_trait, extract::FromRequestParts, http::StatusCode};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use shared::models::Claims;

/// Extractor that validates JWT from Authorization header or access_token cookie.
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
        let token = parts
            .headers
            .get("authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(|t| t.to_string())
            .or_else(|| {
                parts
                    .headers
                    .get("cookie")
                    .and_then(|c| c.to_str().ok())
                    .and_then(|c| {
                        c.split(';').find_map(|cookie| {
                            let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                            if parts.len() == 2 && parts[0] == "access_token" {
                                Some(parts[1].to_string())
                            } else {
                                None
                            }
                        })
                    })
            })
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| StatusCode::UNAUTHORIZED)?;

        let token_data = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(jwt_secret.as_ref()),
            &Validation::new(Algorithm::HS256),
        )
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(AuthExtractor(token_data.claims))
    }
}
