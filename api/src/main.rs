mod auth;
mod db;
mod error;
mod middleware;
mod notifications;
mod plagiarism;
mod rbac;
mod redis;
mod websocket;

use api_infra::state::AppState;
use axum::serve;
use axum::{
    extract::State,
    http::{header, Method, StatusCode},
    response::Json,
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

    let state = AppState {
        db_pool,
        redis_pool,
        redis_url: config.redis_url.clone(),
        jwt_service: std::sync::Arc::new(jwt_service),
        jwt_secret: config.jwt_secret.clone(),
        worker_secret: config.worker_secret.clone(),
        websocket_server,
        class_membership_checker,
    };

    let app = create_router(state, config.clone());

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

fn create_router(state: AppState, config: api_infra::config::AppConfig) -> Router {
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

    // Rate limit: 30 requests per minute per IP (covers all endpoints including internal worker)
    let governor_config = GovernorConfigBuilder::default()
        .per_second(1)
        .burst_size(30)
        .finish()
        .unwrap();

    let public_router = Router::new()
        .route("/health", get(health_check))
        .route("/status", get(get_system_status))
        // Public auth routes
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        .route("/auth/register", post(auth::register))
        .route("/auth/logout", post(auth::logout))
        // WebSocket route (public, auth handled in handler)
        .route("/ws", get(websocket::handler::websocket_upgrade_handler));

    let protected_router = Router::new()
        // Protected routes
        .nest("/users", domain_users::user_router())
        .nest("/problems", domain_problems::problems_router())
        .nest("/contests", domain_contests::contests_router())
        .nest("/leaderboard", domain_leaderboard::leaderboard_router())
        .nest("/submissions", domain_submissions::submissions_router())
        .nest("/classes", domain_classes::classes_router())
        .nest("/discussions", domain_community::discussions_router())
        .nest("/blog", domain_community::blog_router())
        .nest("/search", domain_search::search_router())
        .nest("/notifications", notifications::notifications_router())
        .nest("/messages", domain_community::messages_router())
        .nest("/admin/plagiarism", plagiarism::plagiarism_router())
        // Apply auth/tenant middleware only to protected routes
        .route_layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::auth::auth_middleware,
        ));

    // Layer ordering (outermost to innermost): CORS -> rate limit -> auth -> handler
    public_router
        .merge(protected_router)
        .layer(GovernorLayer {
            config: std::sync::Arc::new(governor_config),
        })
        .layer(cors)
        .with_state(state)
}

async fn health_check() -> &'static str {
    "OK"
}

async fn get_system_status(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Check database connection
    let db_ok = sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&state.db_pool)
        .await
        .is_ok();

    if db_ok {
        Ok(Json(serde_json::json!({ "status": "ok" })))
    } else {
        Err(StatusCode::SERVICE_UNAVAILABLE)
    }
}
