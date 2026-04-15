//! Prometheus metrics recorder setup.
//!
//! Initializes the `metrics` facade with a Prometheus exporter.
//! Uses `install_recorder()` (not `install()`) to avoid panics on
//! double-initialization in tests.

use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle};

/// Histogram buckets for HTTP request duration.
/// Covers 5ms to 10s with exponential-like spacing.
const HTTP_DURATION_BUCKETS: &[f64] = &[
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
];

/// Initialize the Prometheus metrics recorder.
///
/// Returns a `PrometheusHandle` used to render metrics and store in `AppState`.
/// Uses `install_recorder()` (not `install()`) to avoid panics on double-init in tests.
///
/// Spawns a background upkeep task for histogram maintenance every 5 seconds.
pub fn setup_metrics_recorder() -> PrometheusHandle {
    let handle = PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full("http_request_duration_seconds".to_string()),
            HTTP_DURATION_BUCKETS,
        )
        .expect("Failed to set histogram buckets")
        .install_recorder()
        .expect("Failed to install Prometheus recorder");

    // Periodic upkeep for histogram maintenance
    let upkeep_handle = handle.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
        loop {
            interval.tick().await;
            upkeep_handle.run_upkeep();
        }
    });

    handle
}
