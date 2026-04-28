//! Prometheus metrics recorder setup.
//!
//! Initializes the `metrics` facade with a Prometheus exporter.
//! Uses `build_recorder()` + `set_global_recorder()` with graceful
//! fallback when a recorder is already installed (e.g., in tests).

use std::sync::OnceLock;

use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle};

/// Histogram buckets for HTTP request duration.
/// Covers 5ms to 10s with exponential-like spacing.
const HTTP_DURATION_BUCKETS: &[f64] = &[
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
];

/// Global recorder handle, initialized once per process.
static RECORDER_HANDLE: OnceLock<PrometheusHandle> = OnceLock::new();

/// Initialize the Prometheus metrics recorder.
///
/// Returns a `PrometheusHandle` used to render metrics and store in `AppState`.
/// Safe to call multiple times -- the global recorder is installed exactly once,
/// and subsequent calls return the same handle.
///
/// Spawns a background upkeep task for histogram maintenance every 5 seconds
/// on first invocation only.
pub fn setup_metrics_recorder() -> PrometheusHandle {
    RECORDER_HANDLE
        .get_or_init(|| {
            let recorder = PrometheusBuilder::new()
                .set_buckets_for_metric(
                    Matcher::Full("http_request_duration_seconds".to_string()),
                    HTTP_DURATION_BUCKETS,
                )
                .expect("Failed to set histogram buckets")
                .build_recorder();

            let handle = recorder.handle();

            // Install as the global recorder; should succeed on first call.
            let _ = metrics::set_global_recorder(recorder);

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
        })
        .clone()
}
