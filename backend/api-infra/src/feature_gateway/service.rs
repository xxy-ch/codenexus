//! Feature gateway service.
//!
//! Provides feature flag resolution with scoped hierarchy precedence
//! (class > grade > campus > global > default), DashMap in-process caching,
//! and emergency-off short-circuit via `FEATURE_GATEWAY_ENABLED` env var.

use std::env;
use std::sync::Arc;

use dashmap::DashMap;
use sqlx::PgPool;

use super::models::{
    FeatureFlagEntry, FeatureRegistryEntry, FeatureSource, ResolvedFeature,
};

/// Feature gateway service.
///
/// Resolves feature flag state with three-ring precedence:
/// 1. Emergency-off check (FEATURE_GATEWAY_ENABLED env var)
/// 2. Scoped override lookup (class > grade > campus > global)
/// 3. Registry default fallback
///
/// Results are cached in a DashMap for sub-millisecond reads.
/// Cache is invalidated on every write (set_flag/delete_flag).
pub struct FeatureGatewayService {
    db_pool: PgPool,
    cache: Arc<DashMap<String, ResolvedFeature>>,
    enabled: bool,
}

impl FeatureGatewayService {
    /// Create a new FeatureGatewayService.
    ///
    /// Reads `FEATURE_GATEWAY_ENABLED` env var (defaults to "true").
    /// When set to "false", all resolve calls return disabled immediately
    /// with no DB queries (D-11 emergency-off).
    pub fn new(db_pool: PgPool) -> Self {
        let enabled = env::var("FEATURE_GATEWAY_ENABLED")
            .map(|v| v != "false")
            .unwrap_or(true);
        Self {
            db_pool,
            cache: Arc::new(DashMap::new()),
            enabled,
        }
    }

    /// Create a service with explicit enabled state (for testing).
    #[cfg(test)]
    pub fn new_with_enabled(db_pool: PgPool, enabled: bool) -> Self {
        Self {
            db_pool,
            cache: Arc::new(DashMap::new()),
            enabled,
        }
    }

    /// Build a cache key from feature slug and scope identifier.
    ///
    /// Format: `"{slug}:{scope}"` where scope is one of:
    /// "global", "campus:{id}", "grade:{id}", "class:{id}"
    fn cache_key(slug: &str, scope: &str) -> String {
        format!("{}:{}", slug, scope)
    }

    /// Resolve feature state for a given context without class scope.
    ///
    /// Resolution precedence: grade > campus > global > default.
    /// Use `resolve_for_class` when class context is available.
    pub async fn resolve(
        &self,
        slug: &str,
        campus_id: Option<i64>,
        grade_id: Option<i64>,
    ) -> ResolvedFeature {
        // D-11: Emergency-off short-circuit (no DB queries)
        if !self.enabled {
            return ResolvedFeature {
                enabled: false,
                source: FeatureSource::SystemEmergencyOff,
            };
        }

        // Check cache at each scope level (most specific first)
        if let Some(grade_id) = grade_id {
            let key = Self::cache_key(slug, &format!("grade:{}", grade_id));
            if let Some(cached) = self.cache.get(&key) {
                return cached.value().clone();
            }
        }
        if let Some(campus_id) = campus_id {
            let key = Self::cache_key(slug, &format!("campus:{}", campus_id));
            if let Some(cached) = self.cache.get(&key) {
                return cached.value().clone();
            }
        }
        let global_key = Self::cache_key(slug, "global");
        if let Some(cached) = self.cache.get(&global_key) {
            return cached.value().clone();
        }

        // DB query: fetch most specific override
        self.resolve_from_db(slug, None, campus_id, grade_id).await
    }

    /// Resolve feature state including class scope.
    ///
    /// Resolution precedence: class > grade > campus > global > default.
    pub async fn resolve_for_class(
        &self,
        slug: &str,
        class_id: i64,
        campus_id: Option<i64>,
        grade_id: Option<i64>,
    ) -> ResolvedFeature {
        // D-11: Emergency-off short-circuit (no DB queries)
        if !self.enabled {
            return ResolvedFeature {
                enabled: false,
                source: FeatureSource::SystemEmergencyOff,
            };
        }

        // Check class-level cache first
        let class_key = Self::cache_key(slug, &format!("class:{}", class_id));
        if let Some(cached) = self.cache.get(&class_key) {
            return cached.value().clone();
        }

        // Then check other scope levels
        if let Some(grade_id) = grade_id {
            let key = Self::cache_key(slug, &format!("grade:{}", grade_id));
            if let Some(cached) = self.cache.get(&key) {
                return cached.value().clone();
            }
        }
        if let Some(campus_id) = campus_id {
            let key = Self::cache_key(slug, &format!("campus:{}", campus_id));
            if let Some(cached) = self.cache.get(&key) {
                return cached.value().clone();
            }
        }
        let global_key = Self::cache_key(slug, "global");
        if let Some(cached) = self.cache.get(&global_key) {
            return cached.value().clone();
        }

        // DB query: fetch most specific override including class scope
        self.resolve_from_db(slug, Some(class_id), campus_id, grade_id)
            .await
    }

    /// Internal: resolve from database with full scope hierarchy.
    ///
    /// Queries feature_flags for the most specific override, falling back
    /// to feature_registry default_enabled.
    async fn resolve_from_db(
        &self,
        slug: &str,
        class_id: Option<i64>,
        campus_id: Option<i64>,
        grade_id: Option<i64>,
    ) -> ResolvedFeature {
        // Build dynamic query based on available scope IDs.
        // This avoids complex SQL with many nullable OR conditions.
        let result: Option<(bool, String)> = self.query_most_specific_override(
            slug,
            class_id,
            campus_id,
            grade_id,
        )
        .await;

        if let Some((enabled, scope)) = result {
            let source = FeatureSource::from_scope_str(&scope)
                .unwrap_or(FeatureSource::Default);

            let resolved = ResolvedFeature { enabled, source };

            // Cache at the resolved scope level
            let cache_scope = match source {
                FeatureSource::ClassOverride => {
                    format!("class:{}", class_id.unwrap_or(0))
                }
                FeatureSource::GradeOverride => {
                    format!("grade:{}", grade_id.unwrap_or(0))
                }
                FeatureSource::CampusOverride => {
                    format!("campus:{}", campus_id.unwrap_or(0))
                }
                FeatureSource::GlobalOverride => "global".to_string(),
                _ => "global".to_string(),
            };
            let key = Self::cache_key(slug, &cache_scope);
            self.cache.insert(key, resolved.clone());

            return resolved;
        }

        // Fallback to registry default
        let default_enabled = self.query_registry_default(slug).await;
        ResolvedFeature {
            enabled: default_enabled,
            source: FeatureSource::Default,
        }
    }

    /// Query feature_flags for the most specific override.
    ///
    /// Returns the first match ordered by specificity (class > grade > campus > global).
    async fn query_most_specific_override(
        &self,
        slug: &str,
        class_id: Option<i64>,
        campus_id: Option<i64>,
        grade_id: Option<i64>,
    ) -> Option<(bool, String)> {
        // Try each scope level individually, most specific first.
        // This is simpler and more maintainable than a complex OR query.

        // Class scope
        if let Some(cid) = class_id {
            let row: Option<(bool, String)> = sqlx::query_as(
                "SELECT enabled, scope FROM feature_flags \
                 WHERE feature_slug = $1 AND scope = 'class' AND scope_id = $2",
            )
            .bind(slug)
            .bind(cid)
            .fetch_optional(&self.db_pool)
            .await
            .ok()
            .flatten();
            if row.is_some() {
                return row;
            }
        }

        // Grade scope
        if let Some(gid) = grade_id {
            let row: Option<(bool, String)> = sqlx::query_as(
                "SELECT enabled, scope FROM feature_flags \
                 WHERE feature_slug = $1 AND scope = 'grade' AND scope_id = $2",
            )
            .bind(slug)
            .bind(gid)
            .fetch_optional(&self.db_pool)
            .await
            .ok()
            .flatten();
            if row.is_some() {
                return row;
            }
        }

        // Campus scope
        if let Some(campid) = campus_id {
            let row: Option<(bool, String)> = sqlx::query_as(
                "SELECT enabled, scope FROM feature_flags \
                 WHERE feature_slug = $1 AND scope = 'campus' AND scope_id = $2",
            )
            .bind(slug)
            .bind(campid)
            .fetch_optional(&self.db_pool)
            .await
            .ok()
            .flatten();
            if row.is_some() {
                return row;
            }
        }

        // Global scope
        let row: Option<(bool, String)> = sqlx::query_as(
            "SELECT enabled, scope FROM feature_flags \
             WHERE feature_slug = $1 AND scope = 'global' AND scope_id IS NULL",
        )
        .bind(slug)
        .fetch_optional(&self.db_pool)
        .await
        .ok()
        .flatten();
        row
    }

    /// Query the feature_registry for default_enabled value.
    async fn query_registry_default(&self, slug: &str) -> bool {
        let row: Option<(bool,)> = sqlx::query_as(
            "SELECT default_enabled FROM feature_registry WHERE slug = $1",
        )
        .bind(slug)
        .fetch_optional(&self.db_pool)
        .await
        .ok()
        .flatten();

        row.map(|(e,)| e).unwrap_or(false)
    }

    /// Invalidate cached entries for a given feature slug and scope.
    ///
    /// Called after set_flag and delete_flag operations to ensure
    /// subsequent reads reflect the latest state (D-10).
    pub fn invalidate(&self, slug: &str, scope: &str) {
        self.cache.remove(&Self::cache_key(slug, scope));
    }

    /// List all entries in the feature registry.
    pub async fn list_registry(&self) -> anyhow::Result<Vec<FeatureRegistryEntry>> {
        let entries = sqlx::query_as::<_, FeatureRegistryEntry>(
            "SELECT * FROM feature_registry ORDER BY slug",
        )
        .fetch_all(&self.db_pool)
        .await?;
        Ok(entries)
    }

    /// List all flag overrides for a given feature slug.
    pub async fn list_flags(&self, slug: &str) -> anyhow::Result<Vec<FeatureFlagEntry>> {
        let flags = sqlx::query_as::<_, FeatureFlagEntry>(
            "SELECT * FROM feature_flags WHERE feature_slug = $1 ORDER BY scope",
        )
        .bind(slug)
        .fetch_all(&self.db_pool)
        .await?;
        Ok(flags)
    }

    /// Set (upsert) a feature flag override.
    ///
    /// Invalidates cache for the affected scope after successful write.
    pub async fn set_flag(
        &self,
        slug: &str,
        scope: &str,
        scope_id: Option<i64>,
        enabled: bool,
    ) -> anyhow::Result<()> {
        sqlx::query(
            "INSERT INTO feature_flags (feature_slug, scope, scope_id, enabled) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (feature_slug, scope, scope_id) \
             DO UPDATE SET enabled = $4, updated_at = now()",
        )
        .bind(slug)
        .bind(scope)
        .bind(scope_id)
        .bind(enabled)
        .execute(&self.db_pool)
        .await?;

        self.invalidate(slug, scope);
        Ok(())
    }

    /// Delete a feature flag override.
    ///
    /// Invalidates cache for the affected scope after successful delete.
    pub async fn delete_flag(
        &self,
        slug: &str,
        scope: &str,
        scope_id: Option<i64>,
    ) -> anyhow::Result<()> {
        sqlx::query(
            "DELETE FROM feature_flags \
             WHERE feature_slug = $1 AND scope = $2 AND scope_id IS NOT DISTINCT FROM $3",
        )
        .bind(slug)
        .bind(scope)
        .bind(scope_id)
        .execute(&self.db_pool)
        .await?;

        self.invalidate(slug, scope);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Create a lazy PgPool for unit tests.
    /// PgPool::connect_lazy requires a Tokio context even though it never connects,
    /// so callers must use #[tokio::test].
    fn make_test_pool() -> PgPool {
        PgPool::connect_lazy("postgres://localhost/nonexistent_test_db")
            .expect("lazy connect should not fail")
    }

    #[test]
    fn test_cache_key_format() {
        assert_eq!(
            FeatureGatewayService::cache_key("plagiarism", "global"),
            "plagiarism:global"
        );
        assert_eq!(
            FeatureGatewayService::cache_key("blog", "campus:42"),
            "blog:campus:42"
        );
        assert_eq!(
            FeatureGatewayService::cache_key("discussions", "grade:7"),
            "discussions:grade:7"
        );
        assert_eq!(
            FeatureGatewayService::cache_key("direct_messages", "class:15"),
            "direct_messages:class:15"
        );
    }

    #[tokio::test]
    async fn test_emergency_off_returns_disabled() {
        let pool = make_test_pool();
        let service = FeatureGatewayService::new_with_enabled(pool, false);

        let result = service.resolve("plagiarism", Some(1), Some(1)).await;
        assert!(!result.enabled);
        assert_eq!(result.source, FeatureSource::SystemEmergencyOff);
    }

    #[tokio::test]
    async fn test_emergency_off_resolve_for_class_returns_disabled() {
        let pool = make_test_pool();
        let service = FeatureGatewayService::new_with_enabled(pool, false);

        let result = service
            .resolve_for_class("plagiarism", 5, Some(1), Some(1))
            .await;
        assert!(!result.enabled);
        assert_eq!(result.source, FeatureSource::SystemEmergencyOff);
    }

    #[tokio::test]
    async fn test_invalidate_removes_cache_entry() {
        let pool = make_test_pool();
        let service = FeatureGatewayService::new_with_enabled(pool, true);

        let key = FeatureGatewayService::cache_key("plagiarism", "global");
        service.cache.insert(
            key.clone(),
            ResolvedFeature {
                enabled: true,
                source: FeatureSource::GlobalOverride,
            },
        );

        assert!(service.cache.contains_key(&key));
        service.invalidate("plagiarism", "global");
        assert!(!service.cache.contains_key(&key));
    }

    #[tokio::test]
    async fn test_cache_returns_cached_value() {
        let pool = make_test_pool();
        let service = FeatureGatewayService::new_with_enabled(pool, true);

        let grade_key = FeatureGatewayService::cache_key("plagiarism", "grade:5");
        service.cache.insert(
            grade_key,
            ResolvedFeature {
                enabled: false,
                source: FeatureSource::GradeOverride,
            },
        );

        let result = service.resolve("plagiarism", Some(1), Some(5)).await;
        assert!(!result.enabled);
        assert_eq!(result.source, FeatureSource::GradeOverride);
    }

    #[tokio::test]
    async fn test_cache_precedence_grade_over_campus() {
        let pool = make_test_pool();
        let service = FeatureGatewayService::new_with_enabled(pool, true);

        let campus_key = FeatureGatewayService::cache_key("plagiarism", "campus:1");
        service.cache.insert(
            campus_key,
            ResolvedFeature {
                enabled: true,
                source: FeatureSource::CampusOverride,
            },
        );
        let grade_key = FeatureGatewayService::cache_key("plagiarism", "grade:5");
        service.cache.insert(
            grade_key,
            ResolvedFeature {
                enabled: false,
                source: FeatureSource::GradeOverride,
            },
        );

        let result = service.resolve("plagiarism", Some(1), Some(5)).await;
        assert!(!result.enabled);
        assert_eq!(result.source, FeatureSource::GradeOverride);
    }

    #[tokio::test]
    async fn test_cache_precedence_class_over_grade() {
        let pool = make_test_pool();
        let service = FeatureGatewayService::new_with_enabled(pool, true);

        let grade_key = FeatureGatewayService::cache_key("plagiarism", "grade:5");
        service.cache.insert(
            grade_key,
            ResolvedFeature {
                enabled: true,
                source: FeatureSource::GradeOverride,
            },
        );
        let class_key = FeatureGatewayService::cache_key("plagiarism", "class:10");
        service.cache.insert(
            class_key,
            ResolvedFeature {
                enabled: false,
                source: FeatureSource::ClassOverride,
            },
        );

        let result = service
            .resolve_for_class("plagiarism", 10, Some(1), Some(5))
            .await;
        assert!(!result.enabled);
        assert_eq!(result.source, FeatureSource::ClassOverride);
    }
}
