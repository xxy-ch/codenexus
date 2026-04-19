pub mod blog;
pub mod discussions;
pub mod messages;

pub use blog::routes::blog_router;
pub use discussions::routes::discussions_router;
pub use messages::messages_router;
