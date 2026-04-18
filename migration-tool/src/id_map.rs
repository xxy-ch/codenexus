use std::collections::HashMap;

use anyhow::Result;
use sqlx::PgPool;

/// Persistent ID mapping between UOJ old identifiers and AlgoMaster new identifiers.
///
/// Uses an in-memory HashMap for fast lookups during the hot path, backed by a
/// PostgreSQL `migration_mappings` table for persistence across re-runs (D-10-5).
pub struct IdMap {
    pub(crate) pool: PgPool,
    /// Key: (entity_type, old_id) -> Value: new_id
    pub(crate) mappings: HashMap<(String, String), String>,
}

impl IdMap {
    /// Create a new IdMap, initializing the migration_mappings table and loading
    /// any existing mappings into memory for idempotent re-runs (D-10-7).
    pub async fn new(pool: PgPool) -> Result<Self> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS migration_mappings (
                entity_type TEXT NOT NULL,
                old_id TEXT NOT NULL,
                new_id TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (entity_type, old_id)
            )
            "#,
        )
        .execute(&pool)
        .await?;

        let mut mappings = HashMap::new();
        let rows: Vec<(String, String, String)> =
            sqlx::query_as("SELECT entity_type, old_id, new_id FROM migration_mappings")
                .fetch_all(&pool)
                .await?;

        for (entity_type, old_id, new_id) in rows {
            mappings.insert((entity_type, old_id), new_id);
        }

        tracing::info!("Loaded {} existing ID mappings", mappings.len());

        Ok(Self { pool, mappings })
    }

    /// Look up a mapping in the in-memory HashMap (fast path).
    pub fn get(&self, entity_type: &str, old_id: &str) -> Option<String> {
        self.mappings
            .get(&(entity_type.to_string(), old_id.to_string()))
            .cloned()
    }

    /// Check whether a mapping exists without retrieving the value.
    pub fn contains(&self, entity_type: &str, old_id: &str) -> bool {
        self.mappings
            .contains_key(&(entity_type.to_string(), old_id.to_string()))
    }

    /// Insert a new mapping. If a mapping already exists for this (entity_type, old_id),
    /// return the existing new_id without inserting (idempotency per D-10-7).
    /// Otherwise, persist to DB and in-memory HashMap, then return the new_id.
    pub async fn get_or_insert(
        &mut self,
        entity_type: &str,
        old_id: &str,
        new_id: String,
    ) -> Result<String> {
        let key = (entity_type.to_string(), old_id.to_string());

        if let Some(existing) = self.mappings.get(&key) {
            return Ok(existing.clone());
        }

        // Persist to database
        sqlx::query(
            "INSERT INTO migration_mappings (entity_type, old_id, new_id) VALUES ($1, $2, $3) ON CONFLICT (entity_type, old_id) DO NOTHING",
        )
        .bind(entity_type)
        .bind(old_id)
        .bind(&new_id)
        .execute(&self.pool)
        .await?;

        // If another concurrent process inserted between our check and insert,
        // load the actual value from DB.
        let actual_new_id = match sqlx::query_scalar::<_, String>(
            "SELECT new_id FROM migration_mappings WHERE entity_type = $1 AND old_id = $2",
        )
        .bind(entity_type)
        .bind(old_id)
        .fetch_one(&self.pool)
        .await
        {
            Ok(id) => id,
            Err(_) => new_id,
        };

        self.mappings.insert(key, actual_new_id.clone());
        Ok(actual_new_id)
    }

    /// Return the number of mappings currently held in memory.
    pub fn len(&self) -> usize {
        self.mappings.len()
    }

    /// Return true if there are no mappings.
    pub fn is_empty(&self) -> bool {
        self.mappings.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn get_returns_none_for_missing_mapping() {
        let map = IdMap {
            pool: PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            mappings: HashMap::new(),
        };
        assert!(map.get("user", "alice").is_none());
    }

    #[tokio::test]
    async fn contains_returns_false_for_missing_mapping() {
        let map = IdMap {
            pool: PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            mappings: HashMap::new(),
        };
        assert!(!map.contains("user", "alice"));
    }

    #[tokio::test]
    async fn get_returns_value_for_existing_mapping() {
        let mut hm = HashMap::new();
        hm.insert(
            ("user".to_string(), "alice".to_string()),
            "uuid-123".to_string(),
        );
        let map = IdMap {
            pool: PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            mappings: hm,
        };
        assert_eq!(map.get("user", "alice"), Some("uuid-123".to_string()));
        assert!(map.contains("user", "alice"));
    }

    #[tokio::test]
    async fn len_and_is_empty_reflect_mappings() {
        let mut hm = HashMap::new();
        let map = IdMap {
            pool: PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            mappings: hm.clone(),
        };
        assert!(map.is_empty());
        assert_eq!(map.len(), 0);

        hm.insert(
            ("problem".to_string(), "42".to_string()),
            "uuid-456".to_string(),
        );
        let map2 = IdMap {
            pool: PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            mappings: hm,
        };
        assert!(!map2.is_empty());
        assert_eq!(map2.len(), 1);
    }

    // Integration tests that need a real database are marked #[ignore].
    // Run with: cargo test -p migration-tool --lib -- --ignored
    #[tokio::test]
    #[ignore]
    async fn id_map_creates_table_and_roundtrips() {
        let pool = PgPool::connect("postgres://localhost/migration_test")
            .await
            .expect("Need PostgreSQL");
        let mut map = IdMap::new(pool.clone()).await.unwrap();

        assert!(map.is_empty());

        let id = map
            .get_or_insert("user", "alice", "uuid-alice-123".to_string())
            .await
            .unwrap();
        assert_eq!(id, "uuid-alice-123");
        assert_eq!(map.len(), 1);

        // Idempotent: same insert returns same value
        let id2 = map
            .get_or_insert("user", "alice", "uuid-different".to_string())
            .await
            .unwrap();
        assert_eq!(id2, "uuid-alice-123");
        assert_eq!(map.len(), 1);

        // Re-instantiating loads existing mappings
        let map2 = IdMap::new(pool.clone()).await.unwrap();
        assert_eq!(map2.get("user", "alice"), Some("uuid-alice-123".to_string()));
        assert_eq!(map2.len(), 1);
    }
}
