pub mod auth;
pub mod db;
pub mod error;
pub mod middleware;
pub mod notifications;
pub mod plagiarism;
pub mod redis;
pub mod websocket;

pub use auth::*;
pub use db::*;

pub use api_infra::state::AppState;

#[cfg(test)]
mod release_gate_tests;
