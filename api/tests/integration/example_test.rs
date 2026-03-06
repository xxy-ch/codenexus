mod common;

#[test]
fn test_setup_test_db() {
    let test_db = common::setup_test_db();
    
    let rt = tokio::runtime::Runtime::new().unwrap();
    
    rt.block_on(async {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
            .fetch_one(&test_db.pool)
            .await
            .expect("Failed to execute query");
        
        assert!(result.0 > 0, "Database should have public tables after migrations");
    });
}