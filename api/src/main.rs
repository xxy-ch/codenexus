mod db;
mod redis;
mod auth;
mod middleware;
mod rbac;
mod problems;
mod users;
mod submissions;
mod contests;
mod leaderboard;

use axum::{
    routing::{get, post},
    Router,
    extract::State,
    response::Json,
    http::StatusCode,
};
use axum::serve;
use deadpool_redis::Pool as RedisPool;
use sqlx::PgPool;
use std::net::SocketAddr;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use auth::JwtService;

#[derive(Clone)]
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<RedisPool>,
    pub redis_url: String,
    pub jwt_service: JwtService,
}

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

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let jwt_secret =
        std::env::var("JWT_SECRET").unwrap_or_else(|_| "default_jwt_secret_change_me".to_string());
    let bind_address = std::env::var("API_BIND_ADDRESS")
        .unwrap_or_else(|_| "0.0.0.0:3000".to_string());

    info!("Connecting to database...");
    let db_pool = db::create_pool(&database_url, Some(10), Some(30)).await?;
    info!("Database connection pool created");

    let redis_pool = if let Ok(pool) = redis::create_pool(&redis_url).await {
        info!("Redis connection pool created");
        Some(pool)
    } else {
        info!("Redis connection failed, running without Redis pool");
        None
    };

    let jwt_service = auth::JwtService::new(&jwt_secret);
    let state = AppState { db_pool, redis_pool, redis_url, jwt_service };

    let app = create_router(state);

    let addr: SocketAddr = bind_address
        .parse()
        .expect("Invalid API_BIND_ADDRESS format");

    info!("Starting server on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("Server listening on {}", addr);
    
    serve(listener, app).await?;
    Ok(())
}

fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/status", get(get_system_status))
        // Auth routes (public)
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        .route("/auth/register", post(users::register))
        // User routes
        .nest("/users", users::user_router())
        // Problem routes
        .nest("/problems", problems::problems_router())
        // Contest routes
        .nest("/contests", contests::contests_router())
        // Leaderboard routes
        .nest("/leaderboard", leaderboard::leaderboard_router())
        // Submission routes
        .nest("/submissions", submissions::submissions_router())
        // Apply middleware
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::tenant::tenant_middleware,
        ))
        .route_layer(axum::middleware::from_fn(middleware::auth::auth_middleware))
        .with_state(state)
}

async fn health_check() -> &'static str {
    "OK"
}

async fn get_system_status(State(state): State<AppState>) -> Result<Json<serde_json::Value>, StatusCode> {
    // Check database connection
    let db_status = sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&state.db_pool)
        .await
        .is_ok();

    let mut status = serde_json::json!({
        "status": "healthy",
        "version": "1.0.0",
        "database": if db_status { "connected" } else { "disconnected" },
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    // Check Redis connection if available
    if let Some(redis_pool) = &state.redis_pool {
        let redis_status = redis_pool.get().await.is_ok();
        status["redis"] = serde_json::json!(if redis_status { "connected" } else { "disconnected" });
    }

    if db_status {
        Ok(Json(status))
    } else {
        status["status"] = serde_json::json!("unhealthy");
        Err(StatusCode::SERVICE_UNAVAILABLE)
    }
}
