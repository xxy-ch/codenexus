pub mod error;
pub mod middleware;
pub mod rbac;
pub mod websocket;

// NOTE: AppState stays in the api crate because it references api::auth::JwtService.
// It will move to api-infra in Phase 2 when domain crates are extracted and
// JwtService is abstracted behind a trait.
