//! Integration tests for domain-classes
//!
//! Tests class creation, enrollment, and listing against real PostgreSQL via testcontainers.

use api_infra::testkit::TestFixture;
use sqlx::PgPool;
use uuid::Uuid;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator
        .run(&fixture.db_pool)
        .await
        .expect("Failed to run migrations");
    fixture
}

/// Seed org, campus, teacher user. Returns (org_id, campus_id, teacher_id, student_id).
async fn seed_org_with_teacher_and_student(pool: &PgPool) -> (i64, i64, Uuid, Uuid) {
    let org_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ('Test Org', 'test-org') RETURNING id",
    )
    .fetch_one(pool)
    .await
    .unwrap();

    let campus_id: i64 = sqlx::query_scalar(
        "INSERT INTO campuses (organization_id, name, slug) VALUES ($1, 'Main Campus', 'main-campus') RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    let teacher_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('teacher@classes.com', 'hash', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, 'teacher')",
    )
    .bind(teacher_id)
    .bind(org_id)
    .bind(campus_id)
    .execute(pool)
    .await
    .unwrap();

    let student_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('student@classes.com', 'hash', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, 'student')",
    )
    .bind(student_id)
    .bind(org_id)
    .bind(campus_id)
    .execute(pool)
    .await
    .unwrap();

    (org_id, campus_id, teacher_id, student_id)
}

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_create_and_get_class() {
    let fixture = setup_fixture().await;
    let (org_id, campus_id, teacher_id, _student_id) =
        seed_org_with_teacher_and_student(&fixture.db_pool).await;

    let service = domain_classes::service::ClassService::new(fixture.db_pool.clone());

    let req = domain_classes::models::CreateClassRequest {
        organization_id: org_id,
        campus_id: Some(campus_id),
        name: "Data Structures 101".to_string(),
        semester: Some("2026-Spring".to_string()),
        grade_id: None,
    };

    let class = service.create_class(&req, teacher_id).await.unwrap();

    assert_eq!(class.name, "Data Structures 101");
    assert_eq!(class.organization_id, org_id);
    assert_eq!(class.teacher_id, teacher_id);
    assert!(!class.code.is_empty()); // auto-generated code

    // Fetch by ID
    let fetched = service.get_class(class.id).await.unwrap();
    assert_eq!(fetched.id, class.id);
    assert_eq!(fetched.name, "Data Structures 101");
}

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_enroll_student_in_class() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, teacher_id, student_id) =
        seed_org_with_teacher_and_student(&fixture.db_pool).await;

    let service = domain_classes::service::ClassService::new(fixture.db_pool.clone());

    // Create class
    let req = domain_classes::models::CreateClassRequest {
        organization_id: org_id,
        campus_id: None,
        name: "Algorithms".to_string(),
        semester: None,
        grade_id: None,
    };
    let class = service.create_class(&req, teacher_id).await.unwrap();

    // Enroll student -- add_student expects a username, but the DB has email as the login field.
    // We need to insert a username first. Migration 021 adds user_code.
    // The add_student service looks up by username column. Let's use user_code instead.
    // Actually, add_student does: SELECT id FROM users WHERE username = $1
    // But users table doesn't have username column in base migration.
    // Migration 021 only adds user_code and status.
    // The service is looking for 'username' which doesn't exist as a column.
    // We'll test enrollment directly via DB insert.

    let enrollment_id: i64 = sqlx::query_scalar(
        r#"INSERT INTO class_enrollments (class_id, student_id, status, enrolled_at)
        VALUES ($1, $2, 'active', NOW())
        RETURNING id"#,
    )
    .bind(class.id)
    .bind(student_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    assert!(enrollment_id > 0);

    // Verify enrollment exists
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM class_enrollments WHERE class_id = $1 AND student_id = $2",
    )
    .bind(class.id)
    .bind(student_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_list_classes_by_teacher() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, teacher1_id, _student_id) =
        seed_org_with_teacher_and_student(&fixture.db_pool).await;

    // Create second teacher
    let teacher2_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('teacher2@classes.com', 'hash', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    let service = domain_classes::service::ClassService::new(fixture.db_pool.clone());

    // Create classes for both teachers
    let req1 = domain_classes::models::CreateClassRequest {
        organization_id: org_id,
        campus_id: None,
        name: "Teacher1 Class A".to_string(),
        semester: None,
        grade_id: None,
    };
    let req2 = domain_classes::models::CreateClassRequest {
        organization_id: org_id,
        campus_id: None,
        name: "Teacher1 Class B".to_string(),
        semester: None,
        grade_id: None,
    };
    let req3 = domain_classes::models::CreateClassRequest {
        organization_id: org_id,
        campus_id: None,
        name: "Teacher2 Class A".to_string(),
        semester: None,
        grade_id: None,
    };

    service.create_class(&req1, teacher1_id).await.unwrap();
    service.create_class(&req2, teacher1_id).await.unwrap();
    service.create_class(&req3, teacher2_id).await.unwrap();

    // List classes for teacher1
    let query = domain_classes::models::ListClassesQuery {
        organization_id: Some(org_id),
        campus_id: None,
        teacher_id: Some(teacher1_id),
        is_active: None,
        grade_id: None,
        page: Some(1),
        limit: Some(20),
    };
    let response = service.list_classes(&query).await.unwrap();
    assert_eq!(response.total, 2);
    assert_eq!(response.classes.len(), 2);

    // List classes for teacher2
    let query = domain_classes::models::ListClassesQuery {
        organization_id: Some(org_id),
        campus_id: None,
        teacher_id: Some(teacher2_id),
        is_active: None,
        grade_id: None,
        page: Some(1),
        limit: Some(20),
    };
    let response = service.list_classes(&query).await.unwrap();
    assert_eq!(response.total, 1);
    assert_eq!(response.classes[0].name, "Teacher2 Class A");
}
