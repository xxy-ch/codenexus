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
    migrator.run(&fixture.db_pool).await.expect("Failed to run migrations");
    fixture
}

/// Seed an organization. Returns org_id.
async fn seed_org(pool: &PgPool) -> i64 {
    sqlx::query_scalar("INSERT INTO organizations (name) VALUES ('Test Org') RETURNING id")
        .fetch_one(pool)
        .await
        .unwrap()
}

/// Seed org + campus. Returns (org_id, campus_id).
async fn seed_org_and_campus(pool: &PgPool) -> (i64, i64) {
    let org_id = seed_org(pool).await;
    let campus_id: i64 = sqlx::query_scalar(
        "INSERT INTO campuses (organization_id, name) VALUES ($1, 'Main Campus') RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();
    (org_id, campus_id)
}

#[tokio::test]
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
async fn test_list_users_by_organization() {
    let fixture = setup_fixture().await;
    let org1_id = seed_org(&fixture.db_pool).await;
    let org2_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name) VALUES ('Test Org 2') RETURNING id",
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
// Test: MD5 login upgrade integration (D-10-2)
// ---------------------------------------------------------------------------

/// Verify an MD5-hashed password against its plaintext.
/// Mirrors the domain-users::service::verify_md5_password function.
fn verify_md5_password(password: &str, md5_hash: &str) -> bool {
    use md5::Digest;
    let digest = md5::Md5::digest(password.as_bytes());
    let computed: String = digest.iter().map(|b| format!("{:02x}", b)).collect();
    computed == md5_hash
}

/// End-to-end test for the transparent MD5-to-bcrypt password upgrade flow.
///
/// Simulates the full login upgrade cycle:
/// 1. Insert a user with `{MD5}` prefixed password hash (as the migrator does)
/// 2. Verify the password matches via MD5 (simulating login's first path)
/// 3. Upgrade the password hash to bcrypt (simulating login's upgrade step)
/// 4. Verify the new hash is bcrypt format (starts with "$2b$")
/// 5. Verify the same password still works via bcrypt verification
#[tokio::test]
async fn test_md5_login_upgrade_integration() {
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

    // Step 2: Verify the password matches via MD5.
    // This simulates what UserService::login does when it detects the {MD5} prefix.
    let stored_hash: String =
        sqlx::query_scalar("SELECT password_hash FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();

    assert!(
        stored_hash.starts_with("{MD5}"),
        "Password hash must start with {{MD5}} prefix before upgrade, got: {}",
        &stored_hash[..stored_hash.len().min(20)]
    );

    let md5_part = &stored_hash[5..]; // strip "{MD5}" prefix
    assert!(
        verify_md5_password("password", md5_part),
        "MD5 verification must succeed for correct password"
    );
    assert!(
        !verify_md5_password("wrongpassword", md5_part),
        "MD5 verification must fail for incorrect password"
    );

    // Step 3: Upgrade the password hash to bcrypt (simulating what login does).
    let bcrypt_hash = bcrypt::hash("password", bcrypt::DEFAULT_COST).unwrap();
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&bcrypt_hash)
        .bind(user_id)
        .execute(&fixture.db_pool)
        .await
        .unwrap();

    // Step 4: Verify the new hash is bcrypt format.
    let upgraded_hash: String =
        sqlx::query_scalar("SELECT password_hash FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();

    assert!(
        upgraded_hash.starts_with("$2b$"),
        "Upgraded password hash must be bcrypt (start with $2b$), got: {}",
        &upgraded_hash[..upgraded_hash.len().min(20)]
    );
    assert!(
        !upgraded_hash.starts_with("{MD5}"),
        "Upgraded password hash must NOT have {{MD5}} prefix"
    );

    // Step 5: Verify the same password still works via bcrypt verification.
    assert!(
        bcrypt::verify("password", &upgraded_hash).unwrap(),
        "Bcrypt verification must succeed for the same password after upgrade"
    );
    assert!(
        !bcrypt::verify("wrongpassword", &upgraded_hash).unwrap(),
        "Bcrypt verification must fail for incorrect password"
    );

    // Step 6 (extra): Verify the user record is otherwise unchanged.
    let user: (Uuid, String, i64, String) = sqlx::query_as(
        "SELECT id, username, organization_id, status FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    assert_eq!(user.0, user_id);
    assert_eq!(user.1, "md5user");
    assert_eq!(user.2, org_id);
    assert_eq!(user.3, "active");
}
