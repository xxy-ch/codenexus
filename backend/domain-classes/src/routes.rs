use crate::models::*;
use crate::service::ClassService;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::middleware::tenant::TenantContext;
use api_infra::state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Extension, Router,
};
use shared::models::role::Role;
use uuid::Uuid;

fn require_teacher_plus(role: &str) -> Result<Role, StatusCode> {
    let role = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(role)
}

fn require_campus_admin(role: &str) -> Result<(), StatusCode> {
    let role = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !role.is_higher_or_equal(Role::CampusAdmin) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(())
}

fn is_admin(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r.is_higher_or_equal(Role::GradeAdmin))
        .unwrap_or(false)
}

/// Verify tenant scope: class must belong to user's organization.
/// Returns the class if valid, or an error status.
async fn verify_class_tenant(
    service: &ClassService,
    class_id: i64,
    school_id: i64,
) -> Result<Class, StatusCode> {
    let class = service
        .get_class(class_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    if class.organization_id != school_id {
        return Err(StatusCode::NOT_FOUND);
    }
    Ok(class)
}

/// Verify ownership: user must be the class teacher OR an admin.
fn verify_class_owner(class: &Class, claims: &shared::models::Claims) -> Result<(), StatusCode> {
    if is_admin(&claims.role) || class.teacher_id == claims.sub {
        return Ok(());
    }
    Err(StatusCode::FORBIDDEN)
}

/// Verify tenant + ownership combined check.
async fn verify_class_access(
    service: &ClassService,
    class_id: i64,
    claims: &shared::models::Claims,
    require_owner: bool,
) -> Result<Class, StatusCode> {
    let class = verify_class_tenant(service, class_id, claims.school_id).await?;
    if require_owner {
        verify_class_owner(&class, claims)?;
    }
    Ok(class)
}

pub fn classes_router() -> Router<AppState> {
    Router::new()
        // Grade routes (CampusAdmin+)
        .route("/grades", post(create_grade))
        .route("/grades", get(list_grades))
        .route("/grades/:grade_id", put(update_grade))
        .route("/grades/:grade_id/deactivate", post(deactivate_grade))
        .route("/grades/batch/graduate", post(batch_graduate))
        .route("/grades/batch/promote", post(batch_promote))
        .route("/grades/batch/create-year", post(batch_create_year))
        // Class routes
        .route("/", post(create_class))
        .route("/", get(list_classes))
        .route("/:class_id", get(get_class))
        .route("/:class_id", put(update_class))
        .route("/:class_id", delete(delete_class))
        .route("/:class_id/stats", get(get_class_stats))
        .route("/:class_id/students", get(get_class_students))
        .route("/:class_id/students", post(add_student))
        .route("/:class_id/students/import", post(batch_import_students))
        .route("/:class_id/students/:student_id", delete(remove_student))
        .route("/enroll", post(enroll_with_code))
        // Assignment routes
        .route("/:class_id/assignments", post(create_assignment))
        .route("/:class_id/assignments", get(list_assignments))
        .route("/assignments/:assignment_id", get(get_assignment))
        .route("/assignments/:assignment_id", put(update_assignment))
        .route("/assignments/:assignment_id", delete(delete_assignment))
        .route(
            "/assignments/:assignment_id/publish",
            post(publish_assignment),
        )
        .route(
            "/assignments/:assignment_id/submissions",
            get(get_assignment_submissions),
        )
}

/// Verify grade belongs to user's campus scope.
async fn verify_grade_tenant(
    service: &ClassService,
    grade_id: i64,
    campus_id: i64,
) -> Result<Grade, StatusCode> {
    let grade = service
        .get_grade(grade_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    if grade.campus_id != campus_id {
        return Err(StatusCode::NOT_FOUND);
    }
    Ok(grade)
}

// ========== Grade Routes ==========

async fn create_grade(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(mut request): Json<CreateGradeRequest>,
) -> Result<Json<Grade>, StatusCode> {
    require_campus_admin(&claims.role)?;
    // SECURITY: Force campus_id from JWT claims, never trust client input
    request.campus_id = claims.campus_id.ok_or(StatusCode::FORBIDDEN)?;
    let service = ClassService::new(state.db_pool);
    // SECURITY: Verify campus belongs to caller's organization
    service
        .verify_campus_org(request.campus_id, claims.school_id)
        .await
        .map_err(|_| StatusCode::FORBIDDEN)?;
    let grade = service
        .create_grade(&request)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create grade: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    Ok(Json(grade))
}

async fn list_grades(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Extension(tenant_ctx): Extension<TenantContext>,
    Query(mut query): Query<ListGradesQuery>,
) -> Result<Json<GradesListResponse>, StatusCode> {
    // RBAC: require at least Teacher role
    let caller_role = require_teacher_plus(&claims.role)?;

    let service = ClassService::new(state.db_pool);

    // Tenant scope: enforce campus_id based on role
    match caller_role {
        Role::Root => {
            // Root: can query any campus (no restriction)
        }
        Role::CampusAdmin | Role::GradeAdmin | Role::Teacher => {
            // SECURITY: Force campus_id to caller's own campus — never trust query param
            query.campus_id = claims.campus_id;
            if let Some(cid) = query.campus_id {
                service.verify_campus_org(cid, claims.school_id)
                    .await.map_err(|_| StatusCode::FORBIDDEN)?;
            }
        }
        _ => {
            // Students and TAs: use claims campus
            query.campus_id = claims.campus_id;
        }
    }

    // Default to active only
    if query.is_active.is_none() {
        query.is_active = Some(true);
    }

    let mut response = service
        .list_grades(&query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // GradeAdmin: must have a grade_id; reject if missing
    if claims.role == "gradeadmin" {
        let gid = tenant_ctx.grade_id.ok_or(StatusCode::FORBIDDEN)?;
        response.grades.retain(|g| g.id == gid);
    }

    Ok(Json(response))
}

async fn update_grade(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(grade_id): Path<i64>,
    Json(request): Json<UpdateGradeRequest>,
) -> Result<Json<Grade>, StatusCode> {
    require_campus_admin(&claims.role)?;
    let service = ClassService::new(state.db_pool);

    // Verify grade belongs to user's campus
    let campus_id = claims
        .campus_id
        .ok_or(StatusCode::FORBIDDEN)?;
    // SECURITY: Verify campus belongs to caller's organization
    service
        .verify_campus_org(campus_id, claims.school_id)
        .await
        .map_err(|_| StatusCode::FORBIDDEN)?;
    verify_grade_tenant(&service, grade_id, campus_id).await?;

    let grade = service
        .update_grade(grade_id, &request)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update grade: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    Ok(Json(grade))
}

async fn deactivate_grade(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(grade_id): Path<i64>,
    Json(request): Json<GraduateGradeRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    require_campus_admin(&claims.role)?;
    let service = ClassService::new(state.db_pool);

    let campus_id = claims
        .campus_id
        .ok_or(StatusCode::FORBIDDEN)?;
    // SECURITY: Verify campus belongs to caller's organization
    service
        .verify_campus_org(campus_id, claims.school_id)
        .await
        .map_err(|_| StatusCode::FORBIDDEN)?;
    verify_grade_tenant(&service, grade_id, campus_id).await?;

    let (grade, affected) = service
        .deactivate_grade(grade_id, request.suspend_students)
        .await
        .map_err(|e| {
            tracing::error!("Failed to deactivate grade: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(serde_json::json!({
        "grade": grade,
        "affected_users": affected,
    })))
}

async fn batch_graduate(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<GraduateGradeRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    require_campus_admin(&claims.role)?;
    let campus_id = claims
        .campus_id
        .ok_or(StatusCode::FORBIDDEN)?;

    // Graduate the highest year_level grade in the campus
    let service = ClassService::new(state.db_pool);
    // SECURITY: Verify campus belongs to caller's organization
    service
        .verify_campus_org(campus_id, claims.school_id)
        .await
        .map_err(|_| StatusCode::FORBIDDEN)?;
    let query = ListGradesQuery {
        campus_id: Some(campus_id),
        is_active: Some(true),
        academic_year: None,
    };
    let grades = service.list_grades(&query).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let highest = grades.grades.iter().max_by_key(|g| g.year_level);

    match highest {
        Some(grade) => {
            let (grade, affected) = service
                .deactivate_grade(grade.id, request.suspend_students)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to graduate grade: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;
            Ok(Json(serde_json::json!({
                "graduated_grade": grade,
                "affected_users": affected,
            })))
        }
        None => Ok(Json(serde_json::json!({
            "graduated_grade": null,
            "affected_users": 0,
            "message": "No active grades found for graduation",
        }))),
    }
}

async fn batch_promote(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<PromoteGradeRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    require_campus_admin(&claims.role)?;
    let campus_id = claims
        .campus_id
        .ok_or(StatusCode::FORBIDDEN)?;

    // Determine current academic year from active grades
    let service = ClassService::new(state.db_pool);
    let query = ListGradesQuery {
        campus_id: Some(campus_id),
        is_active: Some(true),
        academic_year: None,
    };
    let current_grades = service.list_grades(&query).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let current_year = current_grades
        .grades
        .first()
        .map(|g| g.academic_year.clone())
        .unwrap_or_else(|| "2025-2026".to_string());

    let new_grades = service
        .promote_grades(campus_id, &current_year, &request.new_academic_year)
        .await
        .map_err(|e| {
            tracing::error!("Failed to promote grades: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(serde_json::json!({
        "promoted_count": new_grades.len(),
        "new_grades": new_grades,
    })))
}

async fn batch_create_year(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<CreateAcademicYearRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    require_campus_admin(&claims.role)?;
    let campus_id = claims
        .campus_id
        .ok_or(StatusCode::FORBIDDEN)?;

    let service = ClassService::new(state.db_pool);
    let grades = service
        .create_academic_year_grades(
            campus_id,
            &request.academic_year,
            &request.year_levels,
            &request.name_templates,
        )
        .await
        .map_err(|e| {
            tracing::error!("Failed to create academic year grades: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(serde_json::json!({
        "created_count": grades.len(),
        "grades": grades,
    })))
}

// ========== Class Routes ==========

async fn create_class(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<CreateClassRequest>,
) -> Result<Json<Class>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    // Tenant: force organization_id from claims, ignore request body
    let mut req = request;
    req.organization_id = claims.school_id;
    let service = ClassService::new(state.db_pool);
    let class = service
        .create_class(&req, claims.sub)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(class))
}

async fn get_class(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(class_id): Path<i64>,
) -> Result<Json<Class>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let class = verify_class_tenant(&service, class_id, claims.school_id).await?;
    // GradeAdmin grade scoping: must have grade_id; verify class belongs to their grade
    if claims.role == "gradeadmin" {
        let gid = tenant_ctx.grade_id.ok_or(StatusCode::FORBIDDEN)?;
        if class.grade_id != Some(gid) {
            return Err(StatusCode::NOT_FOUND);
        }
    }
    Ok(Json(class))
}

async fn list_classes(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Extension(tenant_ctx): Extension<TenantContext>,
    Query(mut query): Query<ListClassesQuery>,
) -> Result<Json<ClassesListResponse>, StatusCode> {
    // Tenant: force organization_id from claims
    query.organization_id = Some(claims.school_id);
    // GradeAdmin grade scoping: must have grade_id; reject if missing
    if claims.role == "gradeadmin" {
        let gid = tenant_ctx.grade_id.ok_or(StatusCode::FORBIDDEN)?;
        query.grade_id = Some(gid);
    }
    let service = ClassService::new(state.db_pool);
    let response = service
        .list_classes(&query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(response))
}

async fn update_class(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<UpdateClassRequest>,
) -> Result<Json<Class>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    verify_class_access(&service, class_id, &claims, true).await?;
    let class = service
        .update_class(class_id, &request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(class))
}

async fn delete_class(
    State(state): State<AppState>,
    Path(class_id): Path<i64>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<StatusCode, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    verify_class_access(&service, class_id, &claims, true).await?;
    service
        .delete_class(class_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn get_class_stats(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
) -> Result<Json<ClassStats>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    verify_class_tenant(&service, class_id, claims.school_id).await?;
    let stats = service
        .get_class_stats(class_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(stats))
}

// ========== Student Enrollment Routes ==========

async fn get_class_students(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
) -> Result<Json<Vec<StudentProgress>>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    // Only class teacher/admin can view student list
    verify_class_access(&service, class_id, &claims, true).await?;
    let students = service
        .get_class_students(class_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(students))
}

async fn add_student(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<AddStudentRequest>,
) -> Result<Json<ClassEnrollment>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    verify_class_access(&service, class_id, &claims, true).await?;
    let enrollment = service
        .add_student(class_id, &request.username)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(enrollment))
}

async fn enroll_with_code(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<EnrollWithCodeRequest>,
) -> Result<Json<ClassEnrollment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let code = request
        .code
        .or(request.enrollment_code)
        .ok_or(StatusCode::BAD_REQUEST)?;

    // Tenant: verify class belongs to user's org BEFORE enrolling (prevent TOCTOU)
    let class = service
        .get_class_by_code(&code)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    if class.organization_id != claims.school_id {
        return Err(StatusCode::FORBIDDEN);
    }

    let enrollment = service
        .enroll_with_code(&code, claims.sub)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    Ok(Json(enrollment))
}

async fn batch_import_students(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<BatchImportRequest>,
) -> Result<Json<Vec<ClassEnrollment>>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    verify_class_access(&service, class_id, &claims, true).await?;
    let enrollments = service
        .batch_import_students(class_id, request.usernames)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(enrollments))
}

async fn remove_student(
    State(state): State<AppState>,
    Path((class_id, student_id)): Path<(i64, Uuid)>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<StatusCode, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    verify_class_access(&service, class_id, &claims, true).await?;
    service
        .remove_student(class_id, student_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

// ========== Assignment Routes ==========

async fn create_assignment(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<CreateAssignmentRequest>,
) -> Result<Json<Assignment>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    verify_class_access(&service, class_id, &claims, true).await?;
    let assignment = service
        .create_assignment(class_id, &request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignment))
}

async fn get_assignment(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(assignment_id): Path<i64>,
) -> Result<Json<Assignment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let assignment = service
        .get_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    // Tenant: verify assignment's class belongs to user's org
    let class = verify_class_tenant(&service, assignment.class_id, claims.school_id).await?;

    // Authorization: only class members (enrolled students, teacher, or admins) can read assignments
    if !is_admin(&claims.role) && class.teacher_id != claims.sub {
        // Check if user is enrolled in the class
        let students = service
            .get_class_students(assignment.class_id)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let is_enrolled = students.iter().any(|s| s.student_id == claims.sub);
        if !is_enrolled {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    Ok(Json(assignment))
}

async fn list_assignments(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
) -> Result<Json<Vec<Assignment>>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    verify_class_tenant(&service, class_id, claims.school_id).await?;
    let assignments = service
        .list_assignments(class_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignments))
}

async fn update_assignment(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(assignment_id): Path<i64>,
    Json(request): Json<UpdateAssignmentRequest>,
) -> Result<Json<Assignment>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    let assignment = service
        .get_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    // Owner check: verify the user owns the class this assignment belongs to
    verify_class_access(&service, assignment.class_id, &claims, true).await?;
    let assignment = service
        .update_assignment(assignment_id, &request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignment))
}

async fn delete_assignment(
    State(state): State<AppState>,
    Path(assignment_id): Path<i64>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<StatusCode, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    let assignment = service
        .get_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    verify_class_access(&service, assignment.class_id, &claims, true).await?;
    service
        .delete_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn publish_assignment(
    State(state): State<AppState>,
    Path(assignment_id): Path<i64>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<Json<Assignment>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ClassService::new(state.db_pool);
    let assignment = service
        .get_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    verify_class_access(&service, assignment.class_id, &claims, true).await?;
    let assignment = service
        .publish_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignment))
}

async fn get_assignment_submissions(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(assignment_id): Path<i64>,
) -> Result<Json<Vec<AssignmentSubmission>>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let assignment = service
        .get_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    // Only teacher/admin can view submissions
    verify_class_access(&service, assignment.class_id, &claims, true).await?;
    let submissions = service
        .get_assignment_submissions(assignment_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(submissions))
}
