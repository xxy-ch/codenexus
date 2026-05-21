use axum::http::StatusCode;
use sqlx::FromRow;
use uuid::Uuid;

use api_infra::state::AppState;
use shared::models::{role::Role, Claims};

use super::models::ListProblemsQuery;

#[derive(Debug, Clone, FromRow)]
pub struct ProblemAccessRecord {
    pub id: i64,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub author_id: Option<Uuid>,
    pub visibility: String,
}

pub fn parse_role(role: &str) -> Result<Role, StatusCode> {
    role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)
}

pub fn requests_management_problem_view(query: &ListProblemsQuery) -> bool {
    matches!(query.is_public, Some(false))
        || matches!(
            query.visibility.as_deref(),
            Some("private" | "campus" | "class")
        )
}

pub fn can_create_problem_in_organization(
    role: Role,
    claims: &Claims,
    organization_id: i64,
) -> bool {
    role == Role::Root
        || (role.is_higher_or_equal(Role::Teacher) && claims.school_id == organization_id)
}

pub fn can_view_management_problem_data(
    role: Role,
    claims: &Claims,
    problem: &ProblemAccessRecord,
) -> bool {
    if role == Role::Root {
        return true;
    }
    if claims.school_id != problem.organization_id {
        return false;
    }
    match role {
        Role::CampusAdmin | Role::GradeAdmin => {
            let Some(cid) = claims.campus_id else { return false };
            problem.campus_id == Some(cid)
        }
        _ => role.is_higher_or_equal(Role::Teacher),
    }
}

pub fn can_read_problem(role: Role, claims: &Claims, problem: &ProblemAccessRecord) -> bool {
    problem.visibility == "public" || can_view_management_problem_data(role, claims, problem)
}

pub fn can_mutate_problem(role: Role, claims: &Claims, problem: &ProblemAccessRecord) -> bool {
    if role == Role::Root {
        return true;
    }

    if !role.is_higher_or_equal(Role::Teacher) || claims.school_id != problem.organization_id {
        return false;
    }

    match role {
        Role::CampusAdmin | Role::GradeAdmin => {
            let Some(cid) = claims.campus_id else { return false };
            problem.campus_id == Some(cid)
        }
        Role::Teacher => problem.author_id == Some(claims.sub),
        _ => false,
    }
}

pub async fn fetch_problem_access_record(
    state: &AppState,
    problem_id: i64,
) -> Result<ProblemAccessRecord, StatusCode> {
    sqlx::query_as::<_, ProblemAccessRecord>(
        r#"
        SELECT
            id,
            organization_id,
            campus_id,
            author_id,
            visibility
        FROM problems
        WHERE id = $1
        "#,
    )
    .bind(problem_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claims(role: &str, school_id: i64) -> Claims {
        Claims {
            sub: Uuid::from_u128(1),
            email: "test@example.com".to_string(),
            role: role.to_string(),
            school_id,
            campus_id: Some(1),
            grade_id: None,
            iat: 0,
            exp: 1,
            jti: Uuid::from_u128(2),
        }
    }

    fn problem(organization_id: i64, author_id: u128, visibility: &str) -> ProblemAccessRecord {
        ProblemAccessRecord {
            id: 42,
            organization_id,
            campus_id: Some(1),
            author_id: Some(Uuid::from_u128(author_id)),
            visibility: visibility.to_string(),
        }
    }

    #[test]
    fn management_problem_view_detection_is_explicit() {
        assert!(requests_management_problem_view(&ListProblemsQuery {
            is_public: Some(false),
            visibility: None,
            difficulty: None,
            search: None,
            tags: None,
            page: None,
            limit: None,
            sort_by: None,
            sort_order: None,
        }));

        assert!(requests_management_problem_view(&ListProblemsQuery {
            is_public: None,
            visibility: Some("private".to_string()),
            difficulty: None,
            search: None,
            tags: None,
            page: None,
            limit: None,
            sort_by: None,
            sort_order: None,
        }));

        assert!(!requests_management_problem_view(&ListProblemsQuery {
            is_public: Some(true),
            visibility: Some("public".to_string()),
            difficulty: None,
            search: None,
            tags: None,
            page: None,
            limit: None,
            sort_by: None,
            sort_order: None,
        }));
    }

    #[test]
    fn teacher_can_only_create_problems_inside_own_tenant() {
        let teacher_claims = claims("teacher", 7);
        assert!(can_create_problem_in_organization(
            Role::Teacher,
            &teacher_claims,
            7
        ));
        assert!(!can_create_problem_in_organization(
            Role::Teacher,
            &teacher_claims,
            8
        ));
        assert!(can_create_problem_in_organization(
            Role::Root,
            &teacher_claims,
            8
        ));
    }

    #[test]
    fn public_problem_read_is_open_but_private_problem_requires_management_scope() {
        let student_claims = claims("student", 7);
        let teacher_claims = claims("teacher", 7);
        let public_problem = problem(9, 10, "public");
        let private_problem = problem(9, 10, "private");

        assert!(can_read_problem(
            Role::Student,
            &student_claims,
            &public_problem
        ));
        assert!(!can_read_problem(
            Role::Student,
            &student_claims,
            &private_problem
        ));
        assert!(!can_read_problem(
            Role::Teacher,
            &teacher_claims,
            &private_problem
        ));
        assert!(can_read_problem(
            Role::GradeAdmin,
            &claims("gradeadmin", 9),
            &private_problem
        ));
    }

    #[test]
    fn public_read_access_does_not_grant_management_scope() {
        let cross_tenant_teacher = claims("teacher", 7);
        let public_problem = problem(9, 10, "public");

        assert!(can_read_problem(
            Role::Teacher,
            &cross_tenant_teacher,
            &public_problem
        ));
        assert!(!can_view_management_problem_data(
            Role::Teacher,
            &cross_tenant_teacher,
            &public_problem
        ));
        assert!(can_view_management_problem_data(
            Role::CampusAdmin,
            &claims("campusadmin", 9),
            &public_problem
        ));
    }

    #[test]
    fn teacher_problem_mutation_requires_ownership_and_same_tenant() {
        let owner_claims = claims("teacher", 7);
        let same_tenant_non_owner = Claims {
            sub: Uuid::from_u128(99),
            ..claims("teacher", 7)
        };
        assert_eq!(same_tenant_non_owner.grade_id, None);
        let cross_tenant_grade_admin = claims("gradeadmin", 9);
        let owned_problem = problem(7, 1, "private");

        assert!(can_mutate_problem(
            Role::Teacher,
            &owner_claims,
            &owned_problem
        ));
        assert!(!can_mutate_problem(
            Role::Teacher,
            &same_tenant_non_owner,
            &owned_problem
        ));
        assert!(can_mutate_problem(
            Role::CampusAdmin,
            &claims("campusadmin", 7),
            &owned_problem
        ));
        assert!(!can_mutate_problem(
            Role::GradeAdmin,
            &cross_tenant_grade_admin,
            &owned_problem
        ));
        assert!(can_mutate_problem(
            Role::Root,
            &claims("root", 99),
            &owned_problem
        ));
    }
}
