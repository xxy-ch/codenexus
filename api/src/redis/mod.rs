use deadpool_redis::redis::AsyncCommands;
use deadpool_redis::{Config, Pool, PoolError, Runtime};

#[allow(dead_code)]
pub type StreamMessage = (String, Vec<(String, String)>);

#[allow(dead_code)]
pub type XReadStreamResult = Vec<(String, Vec<(String, Vec<String>)>)>;

/// Creates a Redis connection pool with configurable options.
///
/// # Arguments
/// * `redis_url` - Connection string for Redis (e.g., "redis://localhost:6379")
///
/// # Returns
/// A configured `Pool` instance.
///
/// # Errors
/// Returns an error if the connection string is invalid or Redis is unreachable.
pub async fn create_pool(redis_url: &str) -> Result<Pool, deadpool_redis::CreatePoolError> {
    let cfg = Config::from_url(redis_url);
    cfg.create_pool(Some(Runtime::Tokio1))
}

#[allow(dead_code)]
pub trait RedisCacheOps {
    async fn cache_get(&self, key: &str) -> Result<Option<String>, PoolError>;
    async fn cache_set(&self, key: &str, value: &str) -> Result<(), PoolError>;
    async fn cache_delete(&self, key: &str) -> Result<i64, PoolError>;
    async fn cache_exists(&self, key: &str) -> Result<i64, PoolError>;
}

impl RedisCacheOps for Pool {
    async fn cache_get(&self, key: &str) -> Result<Option<String>, PoolError> {
        get(self, key).await
    }

    async fn cache_set(&self, key: &str, value: &str) -> Result<(), PoolError> {
        set(self, key, value).await
    }

    async fn cache_delete(&self, key: &str) -> Result<i64, PoolError> {
        delete(self, key).await
    }

    async fn cache_exists(&self, key: &str) -> Result<i64, PoolError> {
        exists(self, key).await
    }
}

#[allow(dead_code)]
pub trait RedisStreamOps {
    async fn stream_create(&self, stream_name: &str) -> Result<(), PoolError>;
    async fn stream_add_message(
        &self,
        stream_name: &str,
        fields: &[(String, String)],
    ) -> Result<String, PoolError>;
    async fn stream_read_messages(
        &self,
        stream_name: &str,
        count: Option<i64>,
        block_ms: Option<i64>,
    ) -> Result<Vec<StreamMessage>, PoolError>;
}

impl RedisStreamOps for Pool {
    async fn stream_create(&self, stream_name: &str) -> Result<(), PoolError> {
        create_stream(self, stream_name).await
    }

    async fn stream_add_message(
        &self,
        stream_name: &str,
        fields: &[(String, String)],
    ) -> Result<String, PoolError> {
        add_message(self, stream_name, fields).await
    }

    async fn stream_read_messages(
        &self,
        stream_name: &str,
        count: Option<i64>,
        block_ms: Option<i64>,
    ) -> Result<Vec<StreamMessage>, PoolError> {
        read_messages(self, stream_name, count, block_ms).await
    }
}

/// Gets a value from Redis by key.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `key` - The key to retrieve
///
/// # Returns
/// The value associated with key, or None if not found.
#[allow(dead_code)]
pub async fn get(pool: &Pool, key: &str) -> Result<Option<String>, PoolError> {
    let mut conn = pool.get().await?;
    Ok(conn.get(key).await?)
}

/// Sets a key-value pair in Redis.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `key` - The key to set
/// * `value` - The value to associate with key
///
/// # Returns
/// Ok(()) if successful.
#[allow(dead_code)]
pub async fn set(pool: &Pool, key: &str, value: &str) -> Result<(), PoolError> {
    let mut conn = pool.get().await?;
    Ok(conn.set(key, value).await?)
}

/// Deletes a key from Redis.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `key` - The key to delete
///
/// # Returns
/// The number of keys deleted (0 or 1).
#[allow(dead_code)]
pub async fn delete(pool: &Pool, key: &str) -> Result<i64, PoolError> {
    let mut conn = pool.get().await?;
    Ok(conn.del(key).await?)
}

/// Checks if a key exists in Redis.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `key` - The key to check
///
/// # Returns
/// 1 if the key exists, 0 otherwise.
#[allow(dead_code)]
pub async fn exists(pool: &Pool, key: &str) -> Result<i64, PoolError> {
    let mut conn = pool.get().await?;
    Ok(conn.exists(key).await?)
}

/// Creates a Redis Stream.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `stream_name` - The name of the stream to create
///
/// # Returns
/// Ok(()) if successful.
#[allow(dead_code)]
pub async fn create_stream(pool: &Pool, stream_name: &str) -> Result<(), PoolError> {
    let mut conn = pool.get().await?;
    let _: () = deadpool_redis::redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(stream_name)
        .arg("dummy-group")
        .arg("0")
        .arg("MKSTREAM")
        .query_async(&mut conn)
        .await?;
    let _: () = deadpool_redis::redis::cmd("XGROUP")
        .arg("DESTROY")
        .arg(stream_name)
        .arg("dummy-group")
        .query_async(&mut conn)
        .await?;
    Ok(())
}

/// Adds a message to a Redis Stream.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `stream_name` - The name of the stream
/// * `fields` - Key-value pairs to add as message fields
///
/// # Returns
/// The ID of the added message.
#[allow(dead_code)]
pub async fn add_message(
    pool: &Pool,
    stream_name: &str,
    fields: &[(String, String)],
) -> Result<String, PoolError> {
    let mut conn = pool.get().await?;
    let mut cmd = deadpool_redis::redis::cmd("XADD");
    cmd.arg(stream_name).arg("*");
    for (key, value) in fields {
        cmd.arg(key).arg(value);
    }
    Ok(cmd.query_async(&mut conn).await?)
}

/// Reads messages from a Redis Stream.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `stream_name` - The name of the stream
/// * `count` - Maximum number of messages to read (default: 1)
/// * `block_ms` - Block time in milliseconds (default: 0 for non-blocking)
///
/// # Returns
/// A vector of messages, where each message is a tuple of (id, fields).
#[allow(dead_code)]
pub async fn read_messages(
    pool: &Pool,
    stream_name: &str,
    count: Option<i64>,
    block_ms: Option<i64>,
) -> Result<Vec<StreamMessage>, PoolError> {
    let mut conn = pool.get().await?;
    let mut cmd = deadpool_redis::redis::cmd("XREAD");
    if let Some(ms) = block_ms {
        cmd.arg("BLOCK").arg(ms);
    }
    if let Some(c) = count {
        cmd.arg("COUNT").arg(c);
    }
    cmd.arg("STREAMS").arg(stream_name).arg("0");

    let result: XReadStreamResult = cmd.query_async(&mut conn).await?;
    let messages = result
        .into_iter()
        .flat_map(|(_, msgs)| {
            msgs.into_iter().map(|(id, fields)| {
                let field_pairs: Vec<(String, String)> = fields
                    .chunks(2)
                    .map(|chunk| (chunk[0].clone(), chunk[1].clone()))
                    .collect();
                (id, field_pairs)
            })
        })
        .collect();

    Ok(messages)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_pool_invalid_url() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(async { create_pool("invalid://url").await });
        assert!(result.is_err(), "Expected error for invalid REDIS_URL");
    }

    #[tokio::test]
    #[ignore = "requires Redis to be running; set REDIS_URL environment variable"]
    async fn test_stream() {
        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set for this test");
        let pool = create_pool(&redis_url)
            .await
            .expect("Failed to create Redis pool");

        let _ = delete(&pool, "test_stream_key").await;

        create_stream(&pool, "test_stream_key")
            .await
            .expect("Failed to create stream");

        let message_id = add_message(
            &pool,
            "test_stream_key",
            &[("field1".to_string(), "value1".to_string())],
        )
        .await
        .expect("Failed to add message");
        assert!(!message_id.is_empty(), "Message ID should not be empty");

        let messages = read_messages(&pool, "test_stream_key", Some(1), None)
            .await
            .expect("Failed to read messages");
        assert!(!messages.is_empty(), "Should have at least one message");

        let (id, fields) = &messages[0];
        assert!(!id.is_empty(), "Message ID should not be empty");
        assert_eq!(fields.len(), 1, "Should have one field");
        assert_eq!(fields[0].0, "field1", "Field name should match");
        assert_eq!(fields[0].1, "value1", "Field value should match");

        delete(&pool, "test_stream_key")
            .await
            .expect("Failed to clean up test stream");
    }
}
