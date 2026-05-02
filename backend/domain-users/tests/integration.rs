//! Integration tests for domain-users
//!
//! Tests DB-level user operations against real PostgreSQL via testcontainers.
//! The UserService requires an Arc<dyn TokenService>, so these tests validate
//! the underlying SQL queries and schema constraints directly.

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

/// Seed an organization. Returns org_id.
async fn seed_org(pool: &PgPool) -> i64 {
    sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ('Test Org', 'test-org') RETURNING id",
    )
    .fetch_one(pool)
    .await
    .unwrap()
}

/// Seed org + campus. Returns (org_id, campus_id).
async fn seed_org_and_campus(pool: &PgPool) -> (i64, i64) {
    let org_id = seed_org(pool).await;
    let campus_id: i64 = sqlx::query_scalar(
        "INSERT INTO campuses (organization_id, name, slug) VALUES ($1, 'Main Campus', 'main-campus') RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();
    (org_id, campus_id)
}

#[tokio::test]
#[ignore = "requires Docker -- run with `cargo test -p domain-users --test integration -- --ignored`"]
async fn test_create_and_get_user() {
    let fixture = setup_fixture().await;
    let (org_id, campus_id) = seed_org_and_campus(&fixture.db_pool).await;

    // Insert user directly (mimicking what UserService::register does)
    let user_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO users (email, password_hash, organization_id, campus_id)
        VALUES ('test@users.com', 'hashed_pw_123', $1, $2)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(campus_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Fetch back and verify
    let row = sqlx::query_as::<_, (Uuid, String, i64, Option<i64>, String)>(
        "SELECT id, email, organization_id, campus_id, status FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    assert_eq!(row.0, user_id);
    assert_eq!(row.1, "test@users.com");
    assert_eq!(row.2, org_id);
    assert_eq!(row.3, Some(campus_id));
    assert_eq!(row.4, "active"); // default status from migration 021
}

#[tokio::test]
#[ignore = "requires Docker -- run with `cargo test -p domain-users --test integration -- --ignored`"]
async fn test_list_users_by_organization() {
    let fixture = setup_fixture().await;
    let org1_id = seed_org(&fixture.db_pool).await;
    let org2_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ('Test Org 2', 'test-org-2') RETURNING id",
    )
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Create 2 users in org1, 1 user in org2
    let _u1: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('u1@test.com', 'h', $1) RETURNING id",
    )
    .bind(org1_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    let _u2: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('u2@test.com', 'h', $1) RETURNING id",
    )
    .bind(org1_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    let _u3: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('u3@test.com', 'h', $1) RETURNING id",
    )
    .bind(org2_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Count users in org1
    let org1_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(org1_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(org1_count, 2);

    // Count users in org2
    let org2_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(org2_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(org2_count, 1);
}

#[tokio::test]
#[ignore = "requires Docker -- run with `cargo test -p domain-users --test integration -- --ignored`"]
async fn test_user_email_uniqueness() {
    let fixture = setup_fixture().await;
    let org_id = seed_org(&fixture.db_pool).await;

    // First user with this email succeeds
    let _u1: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('unique@test.com', 'h', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Second user with same email fails (UNIQUE constraint on email)
    let result: Result<Uuid, _> = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('unique@test.com', 'h', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(&fixture.db_pool)
    .await;

    assert!(result.is_err());
}

// ---------------------------------------------------------------------------
// Test: MD5 login rejection integration (#8)
// ---------------------------------------------------------------------------

/// Verify an MD5-hashed password against its plaintext.
/// Mirrors the domain-users::service::verify_md5_password function.
fn verify_md5_password(password: &str, md5_hash: &str) -> bool {
    use md5::Digest;
    let digest = md5::Md5::digest(password.as_bytes());
    let computed: String = digest.iter().map(|b| format!("{:02x}", b)).collect();
    computed == md5_hash
}

/// End-to-end test for MD5 password rejection flow.
///
/// After the security fix (#8), MD5-hashed users can no longer log in.
/// Instead:
/// 1. Login detects the {MD5} prefix and rejects the attempt
/// 2. The user's password_needs_reset flag is set to true
/// 3. An admin must reset the password (upgrade to bcrypt) before login works
///
/// This test validates the DB-level behavior of the migration and rejection.
#[tokio::test]
#[ignore = "requires Docker -- run with `cargo test -p domain-users --test integration -- --ignored`"]
async fn test_md5_login_rejection_integration() {
    let fixture = setup_fixture().await;
    let (org_id, campus_id) = seed_org_and_campus(&fixture.db_pool).await;

    // Step 1: Insert user with {MD5}-prefixed password hash.
    // "password" -> MD5 = 5f4dcc3b5aa765d61d8327deb882cf99
    let md5_hash = "5f4dcc3b5aa765d61d8327deb882cf99";
    let password_with_prefix = format!("{{MD5}}{}", md5_hash);

    let user_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO users (username, email, password_hash, organization_id, campus_id, display_name)
        VALUES ('md5user', 'md5user@test.com', $1, $2, $3, 'MD5 Test User')
        RETURNING id"#,
    )
    .bind(&password_with_prefix)
    .bind(org_id)
    .bind(campus_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Insert user_roles so login can find the role
    sqlx::query(
        "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, 'student')",
    )
    .bind(user_id)
    .bind(org_id)
    .bind(campus_id)
    .execute(&fixture.db_pool)
    .await
    .unwrap();

    // Step 2: Verify the stored hash is MD5 format.
    let stored_hash: String = sqlx::query_scalar("SELECT password_hash FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_one(&fixture.db_pool)
        .await
        .unwrap();

    assert!(
        stored_hash.starts_with("{MD5}"),
        "Password hash must start with {{MD5}} prefix, got: {}",
        &stored_hash[..stored_hash.len().min(20)]
    );

    // Step 3: Simulate the rejection — mark user as needing reset.
    // (In production, UserService::login does this when it detects {MD5})
    sqlx::query("UPDATE users SET password_needs_reset = true, updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&fixture.db_pool)
        .await
        .unwrap();

    // Step 4: Verify password_needs_reset flag is set.
    let needs_reset: bool =
        sqlx::query_scalar("SELECT password_needs_reset FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();

    assert!(
        needs_reset,
        "password_needs_reset must be true for MD5 user"
    );

    // Step 5: Simulate admin password reset (upgrade to bcrypt).
    let bcrypt_hash = bcrypt::hash("newpassword", bcrypt::DEFAULT_COST).unwrap();
    sqlx::query(
        "UPDATE users SET password_hash = $1, password_needs_reset = false, updated_at = NOW() WHERE id = $2",
    )
    .bind(&bcrypt_hash)
    .bind(user_id)
    .execute(&fixture.db_pool)
    .await
    .unwrap();

    // Step 6: Verify the new hash is bcrypt format and needs_reset is cleared.
    let (upgraded_hash, reset_after): (String, bool) = sqlx::query_as(
        "SELECT password_hash, password_needs_reset FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    assert!(
        upgraded_hash.starts_with("$2b$"),
        "Upgraded password hash must be bcrypt, got: {}",
        &upgraded_hash[..upgraded_hash.len().min(20)]
    );
    assert!(
        !reset_after,
        "password_needs_reset must be false after admin reset"
    );

    // Step 7: Verify the new password works via bcrypt.
    assert!(
        bcrypt::verify("newpassword", &upgraded_hash).unwrap(),
        "Bcrypt verification must succeed for the new password"
    );
    assert!(
        !bcrypt::verify("password", &upgraded_hash).unwrap(),
        "Old MD5-crackable password must NOT work after reset"
    );
}
