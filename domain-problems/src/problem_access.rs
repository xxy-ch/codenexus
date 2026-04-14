use axum::http::StatusCode;

use api_infra::middleware::auth::AuthExtractor;
use shared::models::role::Role;

use super::access::{
    can_create_problem_in_organization, can_mutate_problem, can_read_problem,
    can_view_management_problem_data, fetch_problem_access_record, parse_role, ProblemAccessRecord,
};

pub fn management_role_from_claims(claims: &AuthExtractor) -> Result<Role, StatusCode> {
    let role = parse_role(&claims.0.role)?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(role)
}

pub fn ensure_problem_create_access(
    role: Role,
    claims: &shared::models::Claims,
    organization_id: i64,
) -> Result<(), StatusCode> {
    if can_create_problem_in_organization(role, claims, organization_id) {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn ensure_problem_read_access(
    role: Role,
    claims: &shared::models::Claims,
    problem: &ProblemAccessRecord,
) -> Result<(), StatusCode> {
    if can_read_problem(role, claims, problem) {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn ensure_management_problem_read_access(
    role: Role,
    claims: &shared::models::Claims,
    problem: &ProblemAccessRecord,
) -> Result<(), StatusCode> {
    if can_view_management_problem_data(role, claims, problem) {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn ensure_problem_mutation_access(
    role: Role,
    claims: &shared::models::Claims,
    problem: &ProblemAccessRecord,
) -> Result<(), StatusCode> {
    if can_mutate_problem(role, claims, problem) {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub async fn load_problem_access(
    state: &api_infra::state::AppState,
    problem_id: i64,
) -> Result<ProblemAccessRecord, StatusCode> {
    fetch_problem_access_record(state, problem_id).await
}
