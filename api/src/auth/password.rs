use bcrypt::{hash, verify, DEFAULT_COST};

pub fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    hash(password, DEFAULT_COST)
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
    verify(password, hash)
}

pub fn verify_legacy_md5_password(password: &str, legacy_hash: &str) -> bool {
    let normalized = legacy_hash.trim().to_ascii_lowercase();
    let computed = format!("{:x}", md5::compute(password.as_bytes()));
    computed == normalized
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let password = "test_password_123";
        let hash = hash_password(password).expect("Failed to hash password");
        assert!(verify_password(password, &hash).expect("Failed to verify"));
        assert!(!verify_password("wrong_password", &hash).expect("Failed to verify"));
    }

    #[test]
    fn test_empty_password() {
        let password = "";
        let hash = hash_password(password).expect("Failed to hash empty password");
        assert!(verify_password(password, &hash).expect("Failed to verify"));
    }

    #[test]
    fn test_verify_legacy_md5_password() {
        assert!(verify_legacy_md5_password(
            "password",
            "5f4dcc3b5aa765d61d8327deb882cf99"
        ));
        assert!(!verify_legacy_md5_password(
            "wrong_password",
            "5f4dcc3b5aa765d61d8327deb882cf99"
        ));
    }
}
