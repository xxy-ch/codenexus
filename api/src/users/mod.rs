pub mod models;
pub mod routes;
pub mod service;

pub use routes::{user_router, register};
pub use models::UserProfileUpdate;