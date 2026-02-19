pub mod models;
pub mod routes;
pub mod service;

pub use routes::leaderboard_router;

use axum::{Router, routing::get};
use crate::AppState;

pub fn leaderboard_router() -> Router<AppState> {
    Router::new()
        .route("/global", get(routes::get_global_leaderboard))
        .route("/school/:school_id", get(routes::get_school_leaderboard))
        .route("/campus/:campus_id", get(routes::get_campus_leaderboard))
        .route("/class/:class_id", get(routes::get_class_leaderboard))
        .route("/user/:user_id/stats", get(routes::get_user_stats))
        .route("/problem/:problem_id", get(routes::get_problem_leaderboard))
}
