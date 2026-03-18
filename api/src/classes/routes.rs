use axum::{
    Router,
    routing::{get, post, put, delete},
    extract::{State, Path, Query},
    response::Json,
    http::StatusCode,
};
use uuid::Uuid;
use crate::AppState;
use crate::classes::models::*;
use crate::classes::service::ClassService;
use crate::middleware::auth::AuthExtractor;

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
        .route("/assignments/:assignment_id/publish", post(publish_assignment))
        .route("/assignments/:assignment_id/submissions", get(get_assignment_submissions))
}

// ========== Class Routes ==========

async fn create_class(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<CreateClassRequest>,
) -> Result<Json<Class>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let class = service.create_class(&request, claims.sub)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(class))
}

async fn get_class(
    State(state): State<AppState>,
    Path(class_id): Path<i64>,
) -> Result<Json<Class>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let class = service.get_class(class_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(class))
}

async fn list_classes(
    State(state): State<AppState>,
    Query(query): Query<ListClassesQuery>,
) -> Result<Json<ClassesListResponse>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let response = service.list_classes(&query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(response))
}

async fn update_class(
    State(state): State<AppState>,
    AuthExtractor(_auth): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<UpdateClassRequest>,
) -> Result<Json<Class>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let class = service.update_class(class_id, &request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(class))
}

async fn delete_class(
    State(state): State<AppState>,
    Path(class_id): Path<i64>,
    AuthExtractor(_auth): AuthExtractor,
) -> Result<StatusCode, StatusCode> {
    let service = ClassService::new(state.db_pool);
    service.delete_class(class_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn get_class_stats(
    State(state): State<AppState>,
    Path(class_id): Path<i64>,
) -> Result<Json<ClassStats>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let stats = service.get_class_stats(class_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(stats))
}

// ========== Student Enrollment Routes ==========

async fn get_class_students(
    State(state): State<AppState>,
    Path(class_id): Path<i64>,
) -> Result<Json<Vec<StudentProgress>>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let students = service.get_class_students(class_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(students))
}

async fn add_student(
    State(state): State<AppState>,
    AuthExtractor(auth): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<AddStudentRequest>,
) -> Result<Json<ClassEnrollment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let enrollment = service.add_student(class_id, auth.sub, &request.student_email)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(enrollment))
}

async fn enroll_with_code(
    State(state): State<AppState>,
    AuthExtractor(auth): AuthExtractor,
    Json(request): Json<EnrollWithCodeRequest>,
) -> Result<Json<ClassEnrollment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let code = request.code
        .or(request.enrollment_code)
        .ok_or(StatusCode::BAD_REQUEST)?;
    let enrollment = service.enroll_with_code(&code, auth.sub)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(enrollment))
}

async fn batch_import_students(
    State(state): State<AppState>,
    AuthExtractor(auth): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<BatchImportRequest>,
) -> Result<Json<Vec<ClassEnrollment>>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let enrollments = service.batch_import_students(class_id, auth.sub, request.emails)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(enrollments))
}

async fn remove_student(
    State(state): State<AppState>,
    Path((class_id, student_id)): Path<(i64, Uuid)>,
    AuthExtractor(_auth): AuthExtractor,
) -> Result<StatusCode, StatusCode> {
    let service = ClassService::new(state.db_pool);
    service.remove_student(class_id, student_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

// ========== Assignment Routes ==========

async fn create_assignment(
    State(state): State<AppState>,
    AuthExtractor(_auth): AuthExtractor,
    Path(class_id): Path<i64>,
    Json(request): Json<CreateAssignmentRequest>,
) -> Result<Json<Assignment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let assignment = service.create_assignment(class_id, &request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignment))
}

async fn get_assignment(
    State(state): State<AppState>,
    Path(assignment_id): Path<i64>,
) -> Result<Json<Assignment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let assignment = service.get_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(assignment))
}

async fn list_assignments(
    State(state): State<AppState>,
    Path(class_id): Path<i64>,
) -> Result<Json<Vec<Assignment>>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let assignments = service.list_assignments(class_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignments))
}

async fn update_assignment(
    State(state): State<AppState>,
    AuthExtractor(_auth): AuthExtractor,
    Path(assignment_id): Path<i64>,
    Json(request): Json<UpdateAssignmentRequest>,
) -> Result<Json<Assignment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let assignment = service.update_assignment(assignment_id, &request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignment))
}

async fn delete_assignment(
    State(state): State<AppState>,
    Path(assignment_id): Path<i64>,
    AuthExtractor(_auth): AuthExtractor,
) -> Result<StatusCode, StatusCode> {
    let service = ClassService::new(state.db_pool);
    service.delete_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn publish_assignment(
    State(state): State<AppState>,
    Path(assignment_id): Path<i64>,
    AuthExtractor(_auth): AuthExtractor,
) -> Result<Json<Assignment>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let assignment = service.publish_assignment(assignment_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(assignment))
}

async fn get_assignment_submissions(
    State(state): State<AppState>,
    Path(assignment_id): Path<i64>,
) -> Result<Json<Vec<AssignmentSubmission>>, StatusCode> {
    let service = ClassService::new(state.db_pool);
    let submissions = service.get_assignment_submissions(assignment_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(submissions))
}
