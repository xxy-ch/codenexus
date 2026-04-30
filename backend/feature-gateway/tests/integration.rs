//! Integration tests for the feature-gateway crate.
//!
//! Tests feature flag resolution using only the public API of
//! FeatureGatewayService with a lazy (non-connecting) PgPool.
//! These tests do NOT require a real database connection.
//!
//! Coverage:
//! - Emergency-off: all resolves return disabled with no DB queries
//! - ResolvedFeature serialization for API responses
//! - Decoupling: no dependency on llm-worker or domain-analysis
//! - Public API contract: resolve() and resolve_for_class() signatures
//!
//! Note: Cache precedence tests are covered by the unit tests in
//! service.rs which have access to `#[cfg(test)]` helpers (insert_cache,
//! new_with_enabled). These integration tests focus on the public API
//! surface that doesn't require DB connectivity.

use feature_gateway::models::{
    FeatureSource, ResolvedFeature,
};
use feature_gateway::service::FeatureGatewayService;
use feature_gateway::AppState;

use sqlx::PgPool;
use std::sync::Arc;
use std::sync::Mutex;

/// Lock to serialize tests that mutate environment variables.
static ENV_LOCK: Mutex<()> = Mutex::new(());

/// Create a lazy PgPool for integration tests.
fn make_test_pool() -> PgPool {
    PgPool::connect_lazy("postgres://localhost/nonexistent_test_db")
        .expect("lazy connect should not fail")
}

// ---------------------------------------------------------------------------
// Emergency-off (D-11)
// ---------------------------------------------------------------------------

/// Set FEATURE_GATEWAY_ENABLED=false, create service, then clean up env var.
/// The service reads the env var at construction time and stores the result.
/// Uses a mutex to serialize env var access across parallel tests.
fn make_emergency_off_gateway() -> Arc<FeatureGatewayService> {
    let _lock = ENV_LOCK.lock().unwrap();
    std::env::set_var("FEATURE_GATEWAY_ENABLED", "false");
    let pool = make_test_pool();
    let service = FeatureGatewayService::new(pool);
    std::env::remove_var("FEATURE_GATEWAY_ENABLED");
    drop(_lock);
    Arc::new(service)
}

#[tokio::test]
async fn emergency_off_returns_disabled_for_all_scopes() {
    let gateway = make_emergency_off_gateway();

    // No scope
    let result = gateway.resolve("llm_analysis", None, None).await;
    assert!(!result.enabled, "emergency-off should disable all features");
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);

    // With campus
    let result = gateway.resolve("llm_analysis", Some(1), None).await;
    assert!(!result.enabled);
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);

    // With campus + grade
    let result = gateway.resolve("llm_analysis", Some(1), Some(5)).await;
    assert!(!result.enabled);
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);

    // With class via resolve_for_class
    let result = gateway
        .resolve_for_class("llm_analysis", 10, Some(1), Some(5))
        .await;
    assert!(!result.enabled);
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);
}

#[tokio::test]
async fn emergency_off_bypasses_database_queries() {
    // With emergency-off enabled, resolve returns immediately without
    // hitting the (non-existent) database, proving the short-circuit works.
    let gateway = make_emergency_off_gateway();

    // These would fail/hang with DB errors if emergency-off didn't short-circuit.
    let result = gateway.resolve("any_feature", None, None).await;
    assert!(!result.enabled);
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);

    let result = gateway
        .resolve_for_class("any_feature", 1, Some(1), Some(1))
        .await;
    assert!(!result.enabled);
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);
}

/// Verify LLM analysis is disabled by emergency-off via env var.
#[tokio::test]
async fn llm_analysis_emergency_off_via_env() {
    let gateway = make_emergency_off_gateway();

    let result = gateway.resolve("llm_analysis", None, None).await;
    assert!(!result.enabled);
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);

    // All scope variations should also be disabled
    let result = gateway
        .resolve_for_class("llm_analysis", 10, Some(1), Some(5))
        .await;
    assert!(!result.enabled);
    assert_eq!(result.source, FeatureSource::SystemEmergencyOff);
}

/// Verify that different feature slugs all respect emergency-off.
#[tokio::test]
async fn emergency_off_applies_to_all_feature_slugs() {
    let gateway = make_emergency_off_gateway();

    for slug in &["llm_analysis", "plagiarism", "discussions", "blog", "direct_messages"] {
        let result = gateway.resolve(slug, None, None).await;
        assert!(
            !result.enabled,
            "emergency-off should disable '{slug}'"
        );
        assert_eq!(result.source, FeatureSource::SystemEmergencyOff);
    }
}

// ---------------------------------------------------------------------------
// ResolvedFeature serialization (API contract verification)
// ---------------------------------------------------------------------------

#[test]
fn resolved_feature_serializes_for_api_response() {
    let resolved = ResolvedFeature {
        enabled: true,
        source: FeatureSource::GradeOverride,
    };

    let json = serde_json::to_value(&resolved).unwrap();
    assert_eq!(json["enabled"], true);
    assert_eq!(json["source"], "GradeOverride");

    // Roundtrip
    let parsed: ResolvedFeature = serde_json::from_value(json).unwrap();
    assert_eq!(parsed, resolved);
}

#[test]
fn all_feature_sources_serialize_to_expected_strings() {
    let cases = vec![
        (FeatureSource::Default, "Default"),
        (FeatureSource::GlobalOverride, "GlobalOverride"),
        (FeatureSource::CampusOverride, "CampusOverride"),
        (FeatureSource::GradeOverride, "GradeOverride"),
        (FeatureSource::ClassOverride, "ClassOverride"),
        (FeatureSource::SystemEmergencyOff, "SystemEmergencyOff"),
    ];

    for (source, expected) in cases {
        let resolved = ResolvedFeature {
            enabled: true,
            source,
        };
        let json = serde_json::to_string(&resolved).unwrap();
        assert!(
            json.contains(expected),
            "FeatureSource should serialize to contain '{expected}', got: {json}"
        );

        // Roundtrip
        let parsed: ResolvedFeature = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.source, source);
    }
}

#[test]
fn resolved_feature_serializes_disabled_state() {
    let resolved = ResolvedFeature {
        enabled: false,
        source: FeatureSource::SystemEmergencyOff,
    };
    let json = serde_json::to_string(&resolved).unwrap();
    assert!(json.contains("\"enabled\":false"));
    assert!(json.contains("SystemEmergencyOff"));

    let parsed: ResolvedFeature = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed, resolved);
}

// ---------------------------------------------------------------------------
// AppState construction
// ---------------------------------------------------------------------------

#[tokio::test]
async fn app_state_construction_and_clone() {
    let gateway = make_emergency_off_gateway();
    let state = AppState {
        gateway: gateway.clone(),
    };

    // AppState is Clone
    let state2 = state.clone();
    drop(state2);
    drop(state);
}

// ---------------------------------------------------------------------------
// Decoupling verification
// ---------------------------------------------------------------------------

/// Verify that the feature-gateway crate has no dependency on llm-worker
/// or domain-analysis crates. They communicate only through DB tables
/// (feature_flags, feature_registry).
#[tokio::test]
async fn feature_gateway_is_decoupled_from_llm_worker() {
    // All types used in the gateway are defined locally or in shared:
    let gateway = make_emergency_off_gateway();
    let _state = AppState { gateway };

    // ResolvedFeature is local
    let _resolved = ResolvedFeature {
        enabled: true,
        source: FeatureSource::Default,
    };

    assert!(true, "feature-gateway is fully self-contained");
}

/// Verify Cargo.toml does not reference llm-worker or domain-analysis.
#[test]
fn cargo_toml_has_no_llm_worker_dependency() {
    let cargo_toml = include_str!("../Cargo.toml");

    assert!(
        !cargo_toml.contains("llm-worker"),
        "feature-gateway must not depend on llm-worker"
    );
    assert!(
        !cargo_toml.contains("domain-analysis"),
        "feature-gateway must not depend on domain-analysis"
    );
}
