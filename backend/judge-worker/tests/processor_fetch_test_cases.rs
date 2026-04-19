use anyhow::Result;
use judge_worker::db::{get_db_connection, TestCase};
use judge_worker::processor::service::fetch_test_cases;
use sqlx::PgPool;

/// Test fetching test cases from database
#[tokio::test]
async fn test_fetch_test_cases_happy_path() -> Result<()> {
    // Setup test database connection
    let pool = setup_test_db().await?;
    
    // Insert test data
    let problem_id = 123i64;
    insert_test_case(&pool, problem_id, 1, "1 2\n3\n", "3\n", false, 10).await?;
    insert_test_case(&pool, problem_id, 2, "4 5\n9\n", "9\n", false, 20).await?;
    
    // Set DATABASE_URL for the function to use
    std::env::set_var("DATABASE_URL", &get_test_db_url());
    
    // Test the function
    let test_cases = fetch_test_cases(problem_id).await?;
    
    // Verify results
    assert_eq!(test_cases.len(), 2);
    assert_eq!(test_cases[0].id, 1);
    assert_eq!(test_cases[0].input, "1 2\n3\n");
    assert_eq!(test_cases[0].expected_output, "3\n");
    assert_eq!(test_cases[0].is_hidden, false);
    assert_eq!(test_cases[0].score, 10);
    
    assert_eq!(test_cases[1].id, 2);
    assert_eq!(test_cases[1].input, "4 5\n9\n");
    assert_eq!(test_cases[1].expected_output, "9\n");
    assert_eq!(test_cases[1].is_hidden, false);
    assert_eq!(test_cases[1].score, 20);
    
    cleanup_test_db(&pool).await?;
    Ok(())
}

/// Test fetching test cases when none exist
#[tokio::test]
async fn test_fetch_test_cases_empty() -> Result<()> {
    // Setup test database connection
    let pool = setup_test_db().await?;
    
    let problem_id = 999i64; // Non-existent problem ID
    
    // Set DATABASE_URL for the function to use
    std::env::set_var("DATABASE_URL", &get_test_db_url());
    
    // Test the function
    let test_cases = fetch_test_cases(problem_id).await?;
    
    // Verify results
    assert_eq!(test_cases.len(), 0);
    
    cleanup_test_db(&pool).await?;
    Ok(())
}

/// Test fetching test cases with mixed visibility
#[tokio::test]
async fn test_fetch_test_cases_mixed_visibility() -> Result<()> {
    // Setup test database connection
    let pool = setup_test_db().await?;
    
    let problem_id = 456i64;
    insert_test_case(&pool, problem_id, 1, "input1\n", "output1\n", false, 10).await?;
    insert_test_case(&pool, problem_id, 2, "input2\n", "output2\n", true, 15).await?;
    insert_test_case(&pool, problem_id, 3, "input3\n", "output3\n", false, 20).await?;
    
    // Set DATABASE_URL for the function to use
    std::env::set_var("DATABASE_URL", &get_test_db_url());
    
    // Test the function
    let test_cases = fetch_test_cases(problem_id).await?;
    
    // Verify results - should return all test cases regardless of visibility
    assert_eq!(test_cases.len(), 3);
    
    // Verify ordering - should be ordered by 'order' field then by id
    assert_eq!(test_cases[0].id, 1);
    assert_eq!(test_cases[1].id, 2);
    assert_eq!(test_cases[2].id, 3);
    
    cleanup_test_db(&pool).await?;
    Ok(())
}

/// Helper function to setup test database
async fn setup_test_db() -> Result<PgPool> {
    let database_url = get_test_db_url();
    let pool = sqlx::PgPool::connect(&database_url).await?;
    
    // Create the test table if it doesn't exist
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS problems_test_cases (
            id BIGSERIAL PRIMARY KEY,
            problem_id BIGINT NOT NULL,
            input TEXT NOT NULL,
            expected_output TEXT NOT NULL,
            is_hidden BOOLEAN DEFAULT false,
            score INTEGER DEFAULT 10,
            "order" INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    "#)
    .execute(&pool)
    .await?;
    
    Ok(pool)
}

/// Helper function to cleanup test database
async fn cleanup_test_db(pool: &PgPool) -> Result<()> {
    sqlx::query("DELETE FROM problems_test_cases")
        .execute(pool)
        .await?;
    Ok(())
}

/// Helper function to insert test case
async fn insert_test_case(
    pool: &PgPool,
    problem_id: i64,
    id: i64,
    input: &str,
    expected_output: &str,
    is_hidden: bool,
    score: i32,
) -> Result<()> {
    sqlx::query(r#"
        INSERT INTO problems_test_cases (id, problem_id, input, expected_output, is_hidden, score, "order")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
            problem_id = EXCLUDED.problem_id,
            input = EXCLUDED.input,
            expected_output = EXCLUDED.expected_output,
            is_hidden = EXCLUDED.is_hidden,
            score = EXCLUDED.score,
            "order" = EXCLUDED."order"
    "#)
    .bind(id)
    .bind(problem_id)
    .bind(input)
    .bind(expected_output)
    .bind(is_hidden)
    .bind(score)
    .bind(id) // Use id as order for predictable ordering
    .execute(pool)
    .await?;
    
    Ok(())
}

/// Helper function to get test database URL
fn get_test_db_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://postgres:postgres@localhost:5432/online_judge".to_string()
    })
}