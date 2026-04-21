//! HTTP client for the standalone Feature Gateway service.
//!
//! Provides `GatewayClient` with TTL-based caching and fail-open behavior
//! per D-18, D-21, D-23, and D-24.

use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::http::StatusCode;
use dashmap::DashMap;
use serde::Deserialize;
use tracing::warn;

use super::models::{FeatureSource, ResolvedFeature};

/// Cached resolve result with expiry timestamp.
#[cfg(test)]
pub struct CachedResolve {
    pub resolved: ResolvedFeature,
    pub expires_at: Instant,
}

/// Cached resolve result with expiry timestamp (production).
#[cfg(not(test))]
struct CachedResolve {
    resolved: ResolvedFeature,
    expires_at: Instant,
}

/// HTTP client for the standalone Feature Gateway service.
///
/// Calls Gateway via REST (D-18), caches results with 10s TTL (D-21),
/// and returns enabled=true on failure (D-23 fail-open).
/// Authenticates via WORKER_SECRET Bearer token (D-24).
pub struct GatewayClient {
    http: reqwest::Client,
    base_url: String,
    /// In-memory TTL cache. Visible to tests in this crate for pre-population.
    #[cfg(test)]
    pub cache: Arc<DashMap<String, CachedResolve>>,
    #[cfg(not(test))]
    cache: Arc<DashMap<String, CachedResolve>>,
    auth_header: String,
}

/// Response from the Gateway's `/resolve` endpoint.
#[derive(Debug, Deserialize)]
struct ResolveResponse {
    enabled: bool,
    source: String,
}

impl GatewayClient {
    /// Create a new GatewayClient.
    ///
    /// # Arguments
    /// * `base_url` - Gateway base URL (e.g. `http://127.0.0.1:3001`)
    /// * `worker_secret` - Shared secret for Bearer token auth (D-24)
    pub fn new(base_url: String, worker_secret: String) -> Self {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .connect_timeout(Duration::from_secs(2))
            .build()
            .expect("Failed to build reqwest client");

        let auth_header = format!("Bearer {}", worker_secret);

        Self {
            http,
            base_url: base_url.trim_end_matches('/').to_string(),
            cache: Arc::new(DashMap::new()),
            auth_header,
        }
    }

    /// Resolve a feature flag via HTTP call to Gateway with TTL cache.
    ///
    /// Cache key format: `"{slug}:{campus_id:?}:{grade_id:?}"`
    /// TTL: 10 seconds (D-21).
    /// On failure: returns enabled=true with warning log (D-23 fail-open).
    pub async fn resolve(
        &self,
        slug: &str,
        campus_id: Option<i64>,
        grade_id: Option<i64>,
    ) -> ResolvedFeature {
        let cache_key = format!("{}:{:?}:{:?}", slug, campus_id, grade_id);

        // Check cache
        if let Some(cached) = self.cache.get(&cache_key) {
            if Instant::now() < cached.expires_at {
                return cached.resolved.clone();
            }
            // Expired -- remove and fall through to HTTP
            drop(cached);
            self.cache.remove(&cache_key);
        }

        // Build URL
        let mut url = format!("{}/resolve?slug={}", self.base_url, slug);
        if let Some(cid) = campus_id {
            url.push_str(&format!("&campus_id={}", cid));
        }
        if let Some(gid) = grade_id {
            url.push_str(&format!("&grade_id={}", gid));
        }

        // HTTP call
        match self
            .http
            .get(&url)
            .header("Authorization", &self.auth_header)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<ResolveResponse>().await {
                    Ok(body) => {
                        let source = FeatureSource::from_scope_str(&body.source)
                            .unwrap_or(FeatureSource::Default);
                        let resolved = ResolvedFeature {
                            enabled: body.enabled,
                            source,
                        };

                        // Cache with 10s TTL (D-21)
                        self.cache.insert(
                            cache_key,
                            CachedResolve {
                                resolved: resolved.clone(),
                                expires_at: Instant::now() + Duration::from_secs(10),
                            },
                        );

                        resolved
                    }
                    Err(e) => {
                        warn!(
                            "feature gateway response parse error for slug={}, fail-open: {}",
                            slug, e
                        );
                        ResolvedFeature {
                            enabled: true,
                            source: FeatureSource::Default,
                        }
                    }
                }
            }
            Ok(resp) => {
                warn!(
                    "feature gateway returned {} for slug={}, fail-open",
                    resp.status(),
                    slug
                );
                ResolvedFeature {
                    enabled: true,
                    source: FeatureSource::Default,
                }
            }
            Err(e) => {
                warn!(
                    "feature gateway unavailable for slug={}, fail-open: {}",
                    slug, e
                );
                ResolvedFeature {
                    enabled: true,
                    source: FeatureSource::Default,
                }
            }
        }
    }

    /// Proxy a GET request to the Gateway.
    ///
    /// Returns the Gateway's JSON response as-is, or a 502 Bad Gateway on failure.
    pub async fn get(&self, path: &str) -> Result<reqwest::Response, (StatusCode, String)> {
        let url = format!("{}{}", self.base_url, path);
        self.http
            .get(&url)
            .header("Authorization", &self.auth_header)
            .send()
            .await
            .map_err(|e| {
                (
                    StatusCode::BAD_GATEWAY,
                    format!("Feature gateway unavailable: {}", e),
                )
            })
    }

    /// Proxy a POST request to the Gateway with a JSON body.
    ///
    /// Returns the Gateway's JSON response as-is, or a 502 Bad Gateway on failure.
    pub async fn post_json(
        &self,
        path: &str,
        body: serde_json::Value,
    ) -> Result<reqwest::Response, (StatusCode, String)> {
        let url = format!("{}{}", self.base_url, path);
        self.http
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                (
                    StatusCode::BAD_GATEWAY,
                    format!("Feature gateway unavailable: {}", e),
                )
            })
    }

    /// Proxy a DELETE request to the Gateway.
    ///
    /// Returns the Gateway's JSON response as-is, or a 502 Bad Gateway on failure.
    pub async fn delete(
        &self,
        path: &str,
    ) -> Result<reqwest::Response, (StatusCode, String)> {
        let url = format!("{}{}", self.base_url, path);
        self.http
            .delete(&url)
            .header("Authorization", &self.auth_header)
            .send()
            .await
            .map_err(|e| {
                (
                    StatusCode::BAD_GATEWAY,
                    format!("Feature gateway unavailable: {}", e),
                )
            })
    }

    /// Get the configured base URL (for diagnostics).
    pub fn base_url(&self) -> &str {
        &self.base_url
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creates_with_defaults() {
        let client = GatewayClient::new(
            "http://127.0.0.1:3001".to_string(),
            "test_secret".to_string(),
        );
        assert_eq!(client.base_url(), "http://127.0.0.1:3001");
    }

    #[test]
    fn test_client_trims_trailing_slash() {
        let client = GatewayClient::new(
            "http://127.0.0.1:3001/".to_string(),
            "test_secret".to_string(),
        );
        assert_eq!(client.base_url(), "http://127.0.0.1:3001");
    }

    #[tokio::test]
    async fn test_resolve_fail_open_on_connection_refused() {
        // Use a port that's definitely not listening
        let client = GatewayClient::new(
            "http://127.0.0.1:19999".to_string(),
            "test_secret".to_string(),
        );

        let result = client.resolve("plagiarism", Some(1), Some(2)).await;

        // D-23: fail-open -- should return enabled=true
        assert!(result.enabled);
        assert_eq!(result.source, FeatureSource::Default);
    }

    #[tokio::test]
    async fn test_resolve_caches_result() {
        // Verifies the cache mechanism by pre-populating the cache
        // and confirming resolve() returns the cached value without HTTP call.
        let client = GatewayClient::new(
            "http://127.0.0.1:19998".to_string(),
            "test_secret".to_string(),
        );

        // Pre-populate cache with a known value
        let cache_key = format!("test_slug:Some(1):Some(2)");
        client.cache.insert(
            cache_key,
            CachedResolve {
                resolved: ResolvedFeature {
                    enabled: false,
                    source: FeatureSource::GradeOverride,
                },
                expires_at: std::time::Instant::now() + std::time::Duration::from_secs(10),
            },
        );

        // resolve() should return the cached value (not fail-open)
        let result = client.resolve("test_slug", Some(1), Some(2)).await;
        assert!(!result.enabled);
        assert_eq!(result.source, FeatureSource::GradeOverride);
    }

    #[tokio::test]
    async fn test_get_returns_error_on_connection_refused() {
        let client = GatewayClient::new(
            "http://127.0.0.1:19997".to_string(),
            "test_secret".to_string(),
        );

        let result = client.get("/registry").await;
        assert!(result.is_err());
        let (status, msg) = result.unwrap_err();
        assert_eq!(status, StatusCode::BAD_GATEWAY);
        assert!(msg.contains("Feature gateway unavailable"));
    }
}
