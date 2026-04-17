//! In-memory circuit breaker using atomic primitives.
//!
//! Per-dependency breakers protect the judge worker from cascade failures
//! when Redis or the API become unavailable (D-04, D-05, D-06, D-07).
//!
//! State machine: Closed -> Open (after `failure_threshold` consecutive failures)
//!                Open   -> HalfOpen (after `half_open_timeout_secs` elapsed)
//!                HalfOpen -> Closed (on first success)
//!                HalfOpen -> Open (on failure)

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::Instant;

/// Operational state of a circuit breaker.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BreakerState {
    /// Normal operation -- requests are allowed.
    Closed,
    /// Failing -- requests are rejected until the half-open timeout elapses.
    Open,
    /// Testing recovery -- one request is allowed through to probe the dependency.
    HalfOpen,
}

/// In-memory circuit breaker with atomic state transitions.
///
/// No external state (no Redis). Resets on worker restart, which is acceptable
/// per D-05.
pub struct CircuitBreaker {
    failure_count: AtomicUsize,
    is_open: AtomicBool,
    half_open_in_progress: AtomicBool,
    last_failure_time: Mutex<Option<Instant>>,
    failure_threshold: usize,
    half_open_timeout_secs: u64,
}

impl CircuitBreaker {
    /// Create a new circuit breaker.
    ///
    /// * `failure_threshold` -- consecutive failures required to open (default 5 per D-06)
    /// * `half_open_timeout_secs` -- seconds before transitioning Open -> HalfOpen (default 30 per D-06)
    pub fn new(failure_threshold: usize, half_open_timeout_secs: u64) -> Self {
        Self {
            failure_count: AtomicUsize::new(0),
            is_open: AtomicBool::new(false),
            half_open_in_progress: AtomicBool::new(false),
            last_failure_time: Mutex::new(None),
            failure_threshold,
            half_open_timeout_secs,
        }
    }

    /// Returns `true` if requests should be allowed through.
    ///
    /// - Closed: always true
    /// - Open: false, unless the half-open timeout has elapsed (transitions to HalfOpen, returns true)
    /// - HalfOpen: true (probing)
    pub fn allow_request(&self) -> bool {
        if !self.is_open.load(Ordering::Relaxed) {
            // Closed or HalfOpen (is_open = false for both).
            // If in HalfOpen, check if a probe is already in flight.
            if self.half_open_in_progress.load(Ordering::Relaxed) {
                // A probe is already in flight -- reject additional requests
                return false;
            }
            return true; // Closed state or first HalfOpen probe
        }

        // Open state -- check if enough time has elapsed for half-open
        if let Ok(guard) = self.last_failure_time.lock() {
            if let Some(last) = *guard {
                let elapsed = last.elapsed().as_secs();
                if elapsed >= self.half_open_timeout_secs {
                    // Transition to HalfOpen -- only one caller wins the race
                    let won = self.half_open_in_progress.compare_exchange(
                        false, true, Ordering::Relaxed, Ordering::Relaxed
                    ).is_ok();
                    if won {
                        self.is_open.store(false, Ordering::Relaxed);
                        return true;
                    }
                    return false; // Another caller already probing
                }
            }
        }

        // Still open, timeout not elapsed
        false
    }

    /// Record a successful call. Resets failure count, closes the breaker, clears half-open gate.
    pub fn record_success(&self) {
        self.failure_count.store(0, Ordering::Relaxed);
        self.is_open.store(false, Ordering::Relaxed);
        self.half_open_in_progress.store(false, Ordering::Relaxed);
        if let Ok(mut guard) = self.last_failure_time.lock() {
            *guard = None;
        }
    }

    /// Record a failed call. Opens the breaker once the threshold is reached.
    pub fn record_failure(&self) {
        let count = self.failure_count.fetch_add(1, Ordering::Relaxed) + 1;
        if count >= self.failure_threshold {
            self.is_open.store(true, Ordering::Relaxed);
            self.half_open_in_progress.store(false, Ordering::Relaxed);
            if let Ok(mut guard) = self.last_failure_time.lock() {
                *guard = Some(Instant::now());
            }
        }
    }

    /// Read the current state for monitoring / heartbeat reporting.
    pub fn state(&self) -> BreakerState {
        if self.is_open.load(Ordering::Relaxed) {
            BreakerState::Open
        } else if self.half_open_in_progress.load(Ordering::Relaxed) {
            BreakerState::HalfOpen
        } else {
            BreakerState::Closed
        }
    }

    /// Read current failure count for monitoring.
    pub fn failure_count(&self) -> usize {
        self.failure_count.load(Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn closed_start_allows_requests() {
        let breaker = CircuitBreaker::new(5, 30);
        assert!(breaker.allow_request());
        assert_eq!(breaker.state(), BreakerState::Closed);
    }

    #[test]
    fn opens_after_threshold_failures() {
        let breaker = CircuitBreaker::new(5, 30);
        for _ in 0..4 {
            breaker.record_failure();
            assert!(breaker.allow_request(), "Should still allow before threshold");
        }
        breaker.record_failure(); // 5th failure
        assert!(!breaker.allow_request(), "Should reject after 5 failures");
        assert_eq!(breaker.state(), BreakerState::Open);
    }

    #[tokio::test]
    async fn half_open_after_timeout() {
        let breaker = CircuitBreaker::new(5, 1); // 1 second timeout for test speed
        for _ in 0..5 {
            breaker.record_failure();
        }
        assert!(!breaker.allow_request(), "Should be open");
        assert_eq!(breaker.state(), BreakerState::Open);

        // Wait for half-open timeout
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        assert!(breaker.allow_request(), "Should allow after timeout (HalfOpen)");
        // State is now HalfOpen (is_open = false, but we have failure history)
        assert_eq!(breaker.state(), BreakerState::HalfOpen);
    }

    #[tokio::test]
    async fn closes_on_half_open_success() {
        let breaker = CircuitBreaker::new(5, 1);
        for _ in 0..5 {
            breaker.record_failure();
        }

        // Wait for half-open
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        assert!(breaker.allow_request());

        // Record success
        breaker.record_success();
        assert!(breaker.allow_request());
        assert_eq!(breaker.state(), BreakerState::Closed);
        assert_eq!(breaker.failure_count(), 0);
    }

    #[test]
    fn resets_on_closed_success() {
        let breaker = CircuitBreaker::new(5, 30);

        // Accumulate 3 failures (below threshold)
        for _ in 0..3 {
            breaker.record_failure();
        }
        assert_eq!(breaker.failure_count(), 3);
        assert!(breaker.allow_request());

        // Success resets count
        breaker.record_success();
        assert_eq!(breaker.failure_count(), 0);
        assert!(breaker.allow_request());
        assert_eq!(breaker.state(), BreakerState::Closed);
    }
}
