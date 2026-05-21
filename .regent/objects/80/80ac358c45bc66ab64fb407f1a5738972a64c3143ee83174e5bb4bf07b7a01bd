//! Re-export from api-infra.
//! The `From<sqlx::Error>` impl that previously lived here cannot be
//! preserved due to the Rust orphan rule (AppError is now defined in
//! api-infra, a foreign crate relative to api). The `AppError::database()`
//! constructor in api-infra can be used for manual sqlx error conversion.
//! In practice, route handlers call service methods returning anyhow::Result,
//! and the `From<anyhow::Error>` impl handles that conversion via `?`.

pub use api_infra::error::AppError;
