//! Unified monitoring snapshot model.
//!
//! All data types produced by collectors and consumed by the API (S03).
//! The `MonitorSnapshot` is the top-level aggregate that combines every
//! monitoring dimension. It serializes directly to JSON for future API use.

use serde::Serialize;
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Health status
// ---------------------------------------------------------------------------

/// Overall system health status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Ok,
    Degraded,
    Unavailable,
}

// ---------------------------------------------------------------------------
// Per-worker status (from Redis heartbeat data)
// ---------------------------------------------------------------------------

/// Status of a single worker extracted from its heartbeat key.
#[derive(Debug, Clone, Serialize)]
pub struct ServiceStatus {
    pub worker_id: String,
    pub active_judgements: usize,
    pub total_processed: usize,
    pub avg_wait_ms: usize,
    pub redis_breaker_state: String,
    pub api_breaker_state: String,
    pub last_seen: String,
}

// ---------------------------------------------------------------------------
// Stream backlog (from Redis XINFO)
// ---------------------------------------------------------------------------

/// Backlog depth for a single stream + consumer group.
#[derive(Debug, Clone, Serialize)]
pub struct StreamBacklog {
    pub stream: String,
    pub consumer_group: String,
    /// Messages delivered but not yet ACKed.
    pub pending: usize,
    /// Messages in the stream not yet delivered to this group.
    pub lag: usize,
    /// Total backlog = pending + lag.
    pub total: usize,
}

// ---------------------------------------------------------------------------
// Analysis metrics (from PostgreSQL analysis_jobs)
// ---------------------------------------------------------------------------

/// Aggregated analysis job metrics.
#[derive(Debug, Clone, Serialize)]
pub struct AnalysisMetrics {
    /// Number of jobs in each status.
    pub pending: i64,
    pub processing: i64,
    pub completed: i64,
    pub failed: i64,
    /// Sum of prompt tokens across all jobs.
    pub total_prompt_tokens: i64,
    /// Sum of completion tokens across all jobs.
    pub total_completion_tokens: i64,
    /// Average job latency in milliseconds (0 if no completed jobs).
    pub avg_latency_ms: f64,
}

// ---------------------------------------------------------------------------
// Feature flags (from PostgreSQL feature_registry + feature_flags)
// ---------------------------------------------------------------------------

/// Status of a single feature flag.
#[derive(Debug, Clone, Serialize)]
pub struct FeatureFlagStatus {
    pub slug: String,
    pub name: String,
    pub default_enabled: bool,
    /// Number of scoped overrides in feature_flags table.
    pub override_count: i64,
}

// ---------------------------------------------------------------------------
// Top-level snapshot
// ---------------------------------------------------------------------------

/// Unified monitoring snapshot combining all collector outputs.
///
/// This is the single aggregate type that the S03 API will serve.
/// Includes a placeholder `control_signals` map for S02 dynamic
/// configuration so downstream slices don't need to restructure.
#[derive(Debug, Clone, Serialize)]
pub struct MonitorSnapshot {
    /// ISO 8601 timestamp of when this snapshot was taken.
    pub timestamp: String,
    /// Worker heartbeat statuses from Redis.
    pub services: Vec<ServiceStatus>,
    /// Stream backlog depths from Redis.
    pub streams: Vec<StreamBacklog>,
    /// Analysis job metrics from PostgreSQL.
    pub analysis_metrics: AnalysisMetrics,
    /// Feature flag visibility from PostgreSQL.
    pub feature_flags: Vec<FeatureFlagStatus>,
    /// Placeholder for S02 dynamic control signals.
    /// Empty in S01; populated when control-plane lands.
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub control_signals: HashMap<String, String>,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_status_serializes_to_lowercase() {
        assert_eq!(serde_json::to_string(&HealthStatus::Ok).unwrap(), "\"ok\"");
        assert_eq!(
            serde_json::to_string(&HealthStatus::Degraded).unwrap(),
            "\"degraded\""
        );
        assert_eq!(
            serde_json::to_string(&HealthStatus::Unavailable).unwrap(),
            "\"unavailable\""
        );
    }

    #[test]
    fn monitor_snapshot_serializes_with_all_fields() {
        let snapshot = MonitorSnapshot {
            timestamp: "2026-04-30T12:00:00Z".to_string(),
            services: vec![ServiceStatus {
                worker_id: "worker-1".to_string(),
                active_judgements: 2,
                total_processed: 100,
                avg_wait_ms: 150,
                redis_breaker_state: "Closed".to_string(),
                api_breaker_state: "Closed".to_string(),
                last_seen: "2026-04-30T11:59:00Z".to_string(),
            }],
            streams: vec![StreamBacklog {
                stream: "submissions".to_string(),
                consumer_group: "judge_workers".to_string(),
                pending: 3,
                lag: 7,
                total: 10,
            }],
            analysis_metrics: AnalysisMetrics {
                pending: 5,
                processing: 2,
                completed: 100,
                failed: 3,
                total_prompt_tokens: 50000,
                total_completion_tokens: 20000,
                avg_latency_ms: 1234.5,
            },
            feature_flags: vec![FeatureFlagStatus {
                slug: "plagiarism".to_string(),
                name: "Plagiarism Detection".to_string(),
                default_enabled: true,
                override_count: 2,
            }],
            control_signals: HashMap::new(),
        };

        let json = serde_json::to_string(&snapshot).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        // Verify top-level structure
        assert_eq!(parsed["timestamp"], "2026-04-30T12:00:00Z");
        assert!(parsed["services"].is_array());
        assert!(parsed["streams"].is_array());
        assert!(parsed["analysis_metrics"].is_object());
        assert!(parsed["feature_flags"].is_array());
        // control_signals is empty, should be skipped by skip_serializing_if
        assert!(parsed.get("control_signals").is_none());
    }

    #[test]
    fn monitor_snapshot_includes_control_signals_when_non_empty() {
        let mut signals = HashMap::new();
        signals.insert("max_concurrent_jobs".to_string(), "10".to_string());

        let snapshot = MonitorSnapshot {
            timestamp: "2026-04-30T12:00:00Z".to_string(),
            services: vec![],
            streams: vec![],
            analysis_metrics: AnalysisMetrics {
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                total_prompt_tokens: 0,
                total_completion_tokens: 0,
                avg_latency_ms: 0.0,
            },
            feature_flags: vec![],
            control_signals: signals,
        };

        let json = serde_json::to_string(&snapshot).unwrap();
        assert!(json.contains("control_signals"));
        assert!(json.contains("max_concurrent_jobs"));
    }

    #[test]
    fn analysis_metrics_default_values() {
        let metrics = AnalysisMetrics {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
            avg_latency_ms: 0.0,
        };
        let json = serde_json::to_string(&metrics).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["pending"], 0);
        assert_eq!(parsed["avg_latency_ms"], 0.0);
    }

    #[test]
    fn feature_flag_status_serializes_all_fields() {
        let flag = FeatureFlagStatus {
            slug: "direct_messages".to_string(),
            name: "Direct Messages".to_string(),
            default_enabled: true,
            override_count: 0,
        };
        let json = serde_json::to_string(&flag).unwrap();
        assert!(json.contains("\"slug\":\"direct_messages\""));
        assert!(json.contains("\"default_enabled\":true"));
        assert!(json.contains("\"override_count\":0"));
    }

    #[test]
    fn stream_backlog_total_is_sum() {
        let backlog = StreamBacklog {
            stream: "submissions".to_string(),
            consumer_group: "judge_workers".to_string(),
            pending: 5,
            lag: 10,
            total: 15,
        };
        assert_eq!(backlog.total, backlog.pending + backlog.lag);
    }

    #[test]
    fn empty_snapshot_serializes_cleanly() {
        let snapshot = MonitorSnapshot {
            timestamp: "2026-04-30T12:00:00Z".to_string(),
            services: vec![],
            streams: vec![],
            analysis_metrics: AnalysisMetrics {
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                total_prompt_tokens: 0,
                total_completion_tokens: 0,
                avg_latency_ms: 0.0,
            },
            feature_flags: vec![],
            control_signals: HashMap::new(),
        };

        let json = serde_json::to_string(&snapshot).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed["services"].as_array().unwrap().is_empty());
        assert!(parsed["streams"].as_array().unwrap().is_empty());
        assert!(parsed["feature_flags"].as_array().unwrap().is_empty());
    }
}
