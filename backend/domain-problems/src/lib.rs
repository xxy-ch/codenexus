pub mod access;
pub mod models;
pub mod problem_access;
pub mod routes;
pub mod test_cases;

use api_infra::state::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn problems_router() -> Router<AppState> {
    Router::new()
        .route("/languages", get(routes::get_supported_languages))
        .route("/languages", put(routes::update_supported_languages))
        .route("/", get(routes::list_problems))
        .route("/", post(routes::create_problem))
        .route("/:id", get(routes::get_problem))
        .route("/:id", put(routes::update_problem))
        .route("/:id", delete(routes::delete_problem))
        .route(
            "/:id/correct-answer-visibility",
            put(routes::update_correct_answer_visibility),
        )
        .route("/:id/statistics", get(routes::get_problem_statistics))
        .route("/:id/test-cases", get(test_cases::list_test_cases))
        .route("/:id/test-cases", post(test_cases::create_test_case))
        .route(
            "/:id/test-cases/import",
            post(test_cases::batch_import_test_cases),
        )
        .route(
            "/:id/test-cases/:test_case_id",
            put(test_cases::update_test_case),
        )
        .route(
            "/:id/test-cases/:test_case_id",
            delete(test_cases::delete_test_case),
        )
}
