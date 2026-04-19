use tower_governor::governor::GovernorConfigBuilder;
use governor::clock::QuantaInstant;
use governor::middleware::NoOpMiddleware;

/// Rate limiter for authentication endpoints (10 requests per minute)
pub fn auth_rate_limiter() -> tower_governor::governor::GovernorConfig<
    tower_governor::key_extractor::PeerIpKeyExtractor,
    NoOpMiddleware<QuantaInstant>,
> {
    GovernorConfigBuilder::default()
        .per_second(60) // 60 seconds = 1 minute
        .burst_size(10) // Allow 10 requests
        .finish()
        .unwrap()
}

/// Rate limiter for submission endpoints (10 requests per minute)
pub fn submission_rate_limiter() -> tower_governor::governor::GovernorConfig<
    tower_governor::key_extractor::PeerIpKeyExtractor,
    NoOpMiddleware<QuantaInstant>,
> {
    GovernorConfigBuilder::default()
        .per_second(6) // ~6 seconds per request = 10 per minute
        .burst_size(10) // Allow 10 requests
        .finish()
        .unwrap()
}
