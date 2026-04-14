use crate::classes::models::*;
use crate::classes::service::ClassService;
use crate::middleware::auth::AuthExtractor;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
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

fn is_admin(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r.is_higher_or_equal(Role::OrganizationAdmin))
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
    Path(class_id): Path<i64>,
) -> Result<Json<Class>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let class = verify_class_tenant(&service, class_id, claims.school_id).await?;
    Ok(Json(class))
}

async fn list_classes(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(mut query): Query<ListClassesQuery>,
) -> Result<Json<ClassesListResponse>, StatusCode> {
    // Tenant: force organization_id from claims
    query.organization_id = Some(claims.school_id);
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
        .add_student(class_id, claims.sub, &request.student_email)
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
        .batch_import_students(class_id, claims.sub, request.emails)
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
    verify_class_tenant(&service, assignment.class_id, claims.school_id).await?;
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
