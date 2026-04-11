pub mod db;
pub mod auth;
pub mod error;
pub mod users;
pub mod problems;
pub mod submissions;
pub mod contests;
pub mod leaderboard;
pub mod classes;
pub mod websocket;
pub mod discussions;
pub mod blog;
pub mod search;
pub mod notifications;
pub mod messages;
pub mod plagiarism;
pub mod redis;
pub mod middleware;
pub mod rbac;

pub use db::*;
pub use auth::*;

#[derive(Clone)]
pub struct AppState {
    pub db_pool: sqlx::PgPool,
    pub redis_pool: Option<deadpool_redis::Pool>,
    pub redis_url: String,
    pub jwt_service: auth::JwtService,
    pub jwt_secret: String,
    pub websocket_server: std::sync::Arc<websocket::WebSocketServer>,
}
