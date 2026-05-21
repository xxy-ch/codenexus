mod auth;
mod db;
mod error;
mod judge_monitor;
mod middleware;
mod notifications;
mod plagiarism;
mod redis;
mod websocket;
mod worker_heartbeat;

use api_infra::metrics::setup_metrics_recorder;
use api_infra::state::AppState;
use axum::serve;
use axum::{
    extract::State,
    http::{header, Method, StatusCode},
    response::{IntoResponse, Json, Redirect},
    routing::{get, post},
    Router,
};
use db::schema::MIGRATOR;
use std::net::SocketAddr;
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use websocket::WebSocketServer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Check for --migrate-only flag before initializing logging
    let args: Vec<String> = std::env::args().collect();
    let migrate_only = args.len() > 1 && args[1] == "--migrate-only";

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=debug,axum=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();

    let config = api_infra::config::AppConfig::from_env()
        .map_err(|e| anyhow::anyhow!("Configuration error: {}", e))?;

    info!("Connecting to database...");
    let db_pool = db::create_pool(&config.database_url, Some(10), Some(30)).await?;
    info!("Database connection pool created");
    info!("Running embedded database migrations...");
    MIGRATOR.run(&db_pool).await?;
    info!("Database migrations complete");

    // If --migrate-only flag is set, exit successfully after migrations
    if migrate_only {
        println!("Migrations completed successfully");
        return Ok(());
    }

    let redis_pool = if let Ok(pool) = redis::create_pool(&config.redis_url).await {
        info!("Redis connection pool created");
        Some(pool)
    } else {
        info!("Redis connection failed, running without Redis pool");
        None
    };

    let jwt_service = auth::JwtService::new(&config.jwt_secret);
    let websocket_server = std::sync::Arc::new(WebSocketServer::new());
    let class_membership_checker: std::sync::Arc<
        dyn api_infra::traits::class_repo::ClassMembershipChecker,
    > = std::sync::Arc::new(domain_classes::service::ClassService::new(db_pool.clone()));

    let prometheus_handle = setup_metrics_recorder();
    let preview_cache = std::sync::Arc::new(dashmap::DashMap::new());

    let gateway_url = std::env::var("FEATURE_GATEWAY_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3001".to_string());
    let gateway_client = std::sync::Arc::new(api_infra::feature_gateway::GatewayClient::new(
        gateway_url,
        config.worker_secret.clone(),
    ));

    let state = AppState {
        db_pool,
        redis_pool,
        redis_url: config.redis_url.clone(),
        jwt_service: std::sync::Arc::new(jwt_service),
        jwt_secret: config.jwt_secret.clone(),
        worker_secret: config.worker_secret.clone(),
        websocket_server,
        class_membership_checker,
        prometheus_handle,
        preview_cache,
        gateway_client,
        app_env: config.app_env,
    };

    // Control-signal pause flag: shared between polling task and middleware.
    let api_paused: std::sync::Arc<std::sync::atomic::AtomicBool> =
        std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    middleware::control_signal::start_control_signal_polling(
        state.redis_pool.clone(),
        api_paused.clone(),
    );

    let app = create_router(state, config.clone(), api_paused);

    let addr: SocketAddr = config
        .bind_address
        .parse()
        .expect("Invalid API_BIND_ADDRESS format");

    info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("Server listening on {}", addr);

    serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;
    Ok(())
}

fn create_router(
    state: AppState,
    config: api_infra::config::AppConfig,
    api_paused: std::sync::Arc<std::sync::atomic::AtomicBool>,
) -> Router {
    if config.cors_origins.contains(&"*".to_string()) {
        tracing::warn!(
            "CORS: Allow-all wildcard is active. This should NOT be used in production."
        );
    } else {
        tracing::info!(
            "CORS: Configured with {} allowed origin(s): {:?}",
            config.cors_origins.len(),
            config.cors_origins
        );
    }

    let cors = if config.cors_origins.contains(&"*".to_string()) {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::PATCH,
                Method::DELETE,
                Method::OPTIONS,
            ])
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
    } else {
        let origins: Vec<axum::http::HeaderValue> = config
            .cors_origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::PATCH,
                Method::DELETE,
                Method::OPTIONS,
            ])
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
    };

    // Rate limit user-facing endpoints per IP while allowing normal SPA page
    // hydration, which fans out multiple API calls after login/navigation.
    let governor_config = std::sync::Arc::new(
        GovernorConfigBuilder::default()
            .per_second(50)
            .burst_size(1000)
            .finish()
            .unwrap(),
    );

    // Clone the pause flag for both rate_limited_public and protected_router.
    let api_paused_public = api_paused.clone();
    let api_paused_protected = api_paused;

    // Unrestricted endpoints: health probes, metrics, worker heartbeat
    // These must not be rate-limited to avoid breaking infrastructure
    let unrestricted_router = Router::new()
        // Kubernetes-style health endpoints
        .route("/health/live", get(health_live))
        .route("/health/ready", get(health_ready))
        // Backward-compatible redirects
        .route("/health", get(health_redirect))
        .route("/status", get(status_redirect))
        // Prometheus metrics endpoint
        .route("/metrics", get(metrics_handler))
        // Internal worker heartbeat (auth via X-Worker-Secret, not JWT)
        .route(
            "/internal/worker/heartbeat",
            post(worker_heartbeat::handle_heartbeat),
        )
        // Internal judge result callback (auth via X-Worker-Secret, not JWT)
        .nest("/submissions", domain_submissions::worker_results_router());

    // Rate-limited public endpoints (auth, websocket)
    let rate_limited_public = Router::new()
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        .route("/auth/register", post(auth::register))
        .route("/ws", get(websocket::handler::websocket_upgrade_handler))
        .layer(axum::middleware::from_fn(move |req, next| {
            let flag = api_paused_public.clone();
            async move { middleware::control_signal::pause_middleware(flag, req, next).await }
        }))
        .layer(GovernorLayer {
            config: governor_config.clone(),
        });

    // Feature-gate analysis endpoints with per-route granularity:
    //   - General analysis (features, similar, etc.) → ai_analysis_enabled
    //   - LLM code assistant (trigger-feedback)      → llm_code_assistant
    //   - LLM problem recommendation (recommend)     → llm_problem_recommend
    let analysis_base = Router::new()
        .route(
            "/submissions/:submission_id/features",
            get(domain_analysis::routes::get_submission_features),
        )
        .route(
            "/submissions/:submission_id/ai-feedback",
            get(domain_analysis::routes::get_ai_feedback),
        )
        .route(
            "/submissions/:submission_id/similar",
            get(domain_analysis::routes::get_similar_submissions),
        )
        .route(
            "/submissions/:submission_id/similar-cross",
            get(domain_analysis::routes::get_cross_problem_similar),
        )
        .route(
            "/problems/:problem_id/teaching-cards",
            get(domain_analysis::routes::get_teaching_cards),
        )
        .route(
            "/problems/:problem_id/clusters",
            get(domain_analysis::routes::get_solution_clusters),
        )
        .route(
            "/classes/:class_id/cognition",
            get(domain_analysis::routes::get_class_cognition),
        )
        .route_layer(axum::middleware::from_fn(
            api_infra::feature_gateway::middleware::feature_gate(
                "ai_analysis_enabled",
                state.gateway_client.clone(),
            ),
        ));

    let analysis_llm_code = Router::new()
        .route(
            "/submissions/:submission_id/trigger-feedback",
            post(domain_analysis::routes::trigger_feedback),
        )
        .route_layer(axum::middleware::from_fn(
            api_infra::feature_gateway::middleware::feature_gate(
                "llm_code_assistant",
                state.gateway_client.clone(),
            ),
        ));

    let analysis_llm_recommend = Router::new()
        .route(
            "/problems/:problem_id/recommend",
            get(domain_analysis::routes::get_problem_recommendations),
        )
        .route_layer(axum::middleware::from_fn(
            api_infra::feature_gateway::middleware::feature_gate(
                "llm_problem_recommend",
                state.gateway_client.clone(),
            ),
        ));

    let protected_router = Router::new()
        .route("/auth/logout", post(auth::logout))
        .nest("/users", domain_users::user_router())
        .nest("/problems", domain_problems::problems_router())
        .nest("/contests", domain_contests::contests_router())
        .nest("/leaderboard", domain_leaderboard::leaderboard_router())
        .nest("/submissions", domain_submissions::submissions_router())
        .nest(
            "/analysis",
            analysis_base
                .merge(analysis_llm_code)
                .merge(analysis_llm_recommend),
        )
        .nest("/classes", domain_classes::classes_router())
        .nest("/discussions", domain_community::discussions_router())
        .nest("/blog", domain_community::blog_router())
        .nest("/search", domain_search::search_router())
        .nest("/notifications", notifications::notifications_router())
        .nest("/messages", domain_community::messages_router())
        .nest("/imex", domain_imex::imex_router())
        .nest("/admin/plagiarism", plagiarism::plagiarism_router())
        .nest("/admin/judge", judge_monitor::judge_monitor_router())
        .nest("/features", api_infra::feature_gateway::features_router())
        .route_layer(axum::middleware::from_fn(
            api_infra::middleware::tenant::tenant_middleware,
        ))
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::auth::auth_middleware,
        ))
        // Control-signal pause middleware: returns 503 when paused.
        .layer(axum::middleware::from_fn(move |req, next| {
            let flag = api_paused_protected.clone();
            async move { middleware::control_signal::pause_middleware(flag, req, next).await }
        }))
        .layer(GovernorLayer {
            config: governor_config,
        });

    // Layer ordering: CORS -> request id -> metrics -> handler
    // Rate limiting applied per-router above (not on unrestricted routes)
    unrestricted_router
        .merge(rate_limited_public)
        .merge(protected_router)
        .route_layer(axum::middleware::from_fn(
            middleware::metrics::track_metrics,
        ))
        .route_layer(axum::middleware::from_fn(
            middleware::request_id::request_id_middleware,
        ))
        .layer(cors)
        .with_state(state)
}

/// Liveness probe -- returns 200 if the process is alive.
async fn health_live() -> &'static str {
    "OK"
}

/// Readiness probe -- checks DB and Redis connectivity.
/// Returns 200 with status JSON when both dependencies are reachable,
/// or 503 SERVICE_UNAVAILABLE when any critical dependency fails.
///
/// Per T-06-03 mitigation: response only contains "connected"/"unavailable"
/// status strings; no connection strings, hostnames, or error messages.
async fn health_ready(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.db_pool)
        .await
        .is_ok();

    let (redis_ok, redis_status) = match &state.redis_pool {
        Some(pool) => {
            let conn_result = pool.get().await;
            match conn_result {
                Ok(mut conn) => {
                    let ping_ok = deadpool_redis::redis::cmd("PING")
                        .query_async::<String>(&mut conn)
                        .await
                        .is_ok();
                    (ping_ok, "connected")
                }
                Err(_) => (false, "unavailable"),
            }
        }
        None => (false, "not_configured"),
    };

    if db_ok && redis_ok {
        Ok(Json(serde_json::json!({
            "status": "ok",
            "db": "connected",
            "redis": "connected",
        })))
    } else {
        let db_status = if db_ok { "connected" } else { "unavailable" };
        Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "unavailable",
                "db": db_status,
                "redis": redis_status,
            })),
        ))
    }
}

/// Redirect old /health endpoint to /health/live (307 preserves method).
async fn health_redirect() -> Redirect {
    Redirect::temporary("/health/live")
}

/// Redirect old /status endpoint to /health/ready (307 preserves method).
async fn status_redirect() -> Redirect {
    Redirect::temporary("/health/ready")
}

/// Prometheus metrics handler.
/// Returns Prometheus-formatted text for scraping.
async fn metrics_handler(State(state): State<AppState>) -> String {
    state.prometheus_handle.render()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::{to_bytes, Body};
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    /// Build a minimal test router with just the health endpoints.
    fn health_test_router() -> Router {
        Router::new()
            .route("/health/live", get(health_live))
            .route("/health/ready", get(health_ready))
            .route("/health", get(health_redirect))
            .route("/status", get(status_redirect))
            .with_state(AppState {
                db_pool: sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
                redis_pool: None,
                redis_url: String::new(),
                jwt_secret: String::new(),
                worker_secret: String::new(),
                jwt_service: std::sync::Arc::new(crate::auth::JwtService::new("test")),
                websocket_server: std::sync::Arc::new(WebSocketServer::new()),
                class_membership_checker: std::sync::Arc::new(
                    api_infra::traits::class_repo::NoopClassMembershipChecker,
                ),
                prometheus_handle: api_infra::metrics::setup_metrics_recorder(),
                preview_cache: std::sync::Arc::new(dashmap::DashMap::new()),
                gateway_client: std::sync::Arc::new(
                    api_infra::feature_gateway::GatewayClient::new(
                        "http://127.0.0.1:3001".to_string(),
                        "test_secret".to_string(),
                    ),
                ),
                app_env: api_infra::config::AppEnv::Test,
            })
    }

    #[tokio::test]
    async fn test_health_live_returns_200_ok() {
        let app = health_test_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health/live")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = to_bytes(response.into_body(), 1024).await.unwrap();
        assert_eq!(&body[..], b"OK");
    }

    #[tokio::test]
    async fn test_health_ready_returns_503_when_db_unreachable() {
        let app = health_test_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health/ready")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);

        let body = to_bytes(response.into_body(), 1024).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "unavailable");
        assert_eq!(json["db"], "unavailable");
        assert_eq!(json["redis"], "not_configured");
    }

    #[tokio::test]
    async fn test_health_ready_handles_redis_pool_none() {
        let app = health_test_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health/ready")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // DB is unreachable too (lazy pool to nonexistent), so 503
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);

        let body = to_bytes(response.into_body(), 1024).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        // Redis pool is None, so status should be "not_configured"
        assert_eq!(json["redis"], "not_configured");
    }

    #[tokio::test]
    async fn test_health_redirects_to_health_live() {
        let app = health_test_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::TEMPORARY_REDIRECT);
        let location = response
            .headers()
            .get("location")
            .expect("missing location header")
            .to_str()
            .unwrap();
        assert_eq!(location, "/health/live");
    }

    #[tokio::test]
    async fn test_status_redirects_to_health_ready() {
        let app = health_test_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/status")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::TEMPORARY_REDIRECT);
        let location = response
            .headers()
            .get("location")
            .expect("missing location header")
            .to_str()
            .unwrap();
        assert_eq!(location, "/health/ready");
    }
}
