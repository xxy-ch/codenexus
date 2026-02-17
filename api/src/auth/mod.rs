use once_cell::sync::Lazy;
use shared::models::User;
use std::collections::HashMap;
use uuid::Uuid;

mod jwt_service;
mod password;
mod routes;

pub use jwt_service::JwtService;
pub use routes::{login, refresh};

pub trait AuthUserStore: Send + Sync {
    fn get_by_username(&self, username: &str) -> Option<User>;
    fn get_by_email(&self, email: &str) -> Option<User>;
    fn get_by_id(&self, id: &Uuid) -> Option<User>;
}

struct InMemoryUserStore {
    users_by_username: HashMap<String, User>,
    users_by_email: HashMap<String, User>,
    users_by_id: HashMap<Uuid, User>,
}

impl InMemoryUserStore {
    fn new() -> Self {
        let mut users_by_username = HashMap::new();
        let mut users_by_email = HashMap::new();
        let mut users_by_id = HashMap::new();

        // Create demo admin user
        let username = "1001"; // Numeric username
        let email = "admin@example.com";
        let password = "admin123";
        let organization_id = 1;
        let role = "admin";

        let password_hash =
            password::hash_password(&password).expect("Failed to hash demo password");
        let user_id = Uuid::new_v4();

        let user = User {
            id: user_id,
            email: email.to_string(),
            password_hash,
            role: role.to_string(),
            school_id: organization_id,
            campus_id: None,
        };

        users_by_username.insert(username.to_string(), user.clone());
        users_by_email.insert(email.to_string(), user.clone());
        users_by_id.insert(user.id, user);

        Self { users_by_username, users_by_email, users_by_id }
    }
}

impl AuthUserStore for InMemoryUserStore {
    fn get_by_username(&self, username: &str) -> Option<User> {
        self.users_by_username.get(username).cloned()
    }

    fn get_by_email(&self, email: &str) -> Option<User> {
        self.users_by_email.get(email).cloned()
    }

    fn get_by_id(&self, id: &Uuid) -> Option<User> {
        self.users_by_id.get(id).cloned()
    }
}

static USER_STORE: Lazy<InMemoryUserStore> = Lazy::new(InMemoryUserStore::new);

pub fn get_user_store() -> &'static dyn AuthUserStore {
    &*USER_STORE as &dyn AuthUserStore
}
