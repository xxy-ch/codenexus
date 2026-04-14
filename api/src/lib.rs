pub mod auth;
pub mod blog;
pub mod classes;
pub mod contests;
pub mod db;
pub mod discussions;
pub mod error;
pub mod leaderboard;
pub mod messages;
pub mod middleware;
pub mod notifications;
pub mod plagiarism;
pub mod rbac;
pub mod redis;
pub mod search;
pub mod submissions;
pub mod websocket;

pub use auth::*;
pub use db::*;

pub use api_infra::state::AppState;

#[cfg(test)]
mod release_gate_tests;
