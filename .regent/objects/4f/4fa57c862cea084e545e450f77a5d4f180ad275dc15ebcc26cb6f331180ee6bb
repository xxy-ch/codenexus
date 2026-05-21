use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use shared::models::Claims;
use uuid::Uuid;

use api_infra::traits::token_service::TokenService;

const ACCESS_TOKEN_EXPIRATION_HOURS: i64 = 4;
const REFRESH_TOKEN_EXPIRATION_DAYS: i64 = 30;

#[derive(Clone)]
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_ref()),
            decoding_key: DecodingKey::from_secret(secret.as_ref()),
        }
    }

    pub fn generate_access_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let exp = now + Duration::hours(ACCESS_TOKEN_EXPIRATION_HOURS);

        let claims = Claims {
            sub: user.id,
            email: user.email.clone(),
            role: user.role.clone(),
            school_id: user.school_id,
            campus_id: user.campus_id,
            grade_id: user.grade_id,
            iat: now.timestamp(),
            exp: exp.timestamp(),
            jti: Uuid::new_v4(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
    }

    pub fn generate_refresh_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let exp = now + Duration::days(REFRESH_TOKEN_EXPIRATION_DAYS);

        let claims = Claims {
            sub: user.id,
            email: user.email.clone(),
            role: user.role.clone(),
            school_id: user.school_id,
            campus_id: user.campus_id,
            grade_id: user.grade_id,
            iat: now.timestamp(),
            exp: exp.timestamp(),
            jti: Uuid::new_v4(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
    }

    pub fn decode_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let token_data = decode::<Claims>(
            token,
            &self.decoding_key,
            &Validation::new(Algorithm::HS256),
        )?;
        Ok(token_data.claims)
    }

    pub fn validate_token(&self, token: &str) -> Result<Claims, String> {
        self.decode_token(token).map_err(|e| e.to_string())
    }
}

impl TokenService for JwtService {
    fn generate_access_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        JwtService::generate_access_token(self, user)
    }

    fn generate_refresh_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        JwtService::generate_refresh_token(self, user)
    }

    fn validate_token(&self, token: &str) -> Result<Claims, String> {
        JwtService::validate_token(self, token)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared::models::User;

    #[test]
    fn test_generate_and_decode_access_token() {
        let secret = "test_secret_key_for_testing";
        let service = JwtService::new(secret);

        let user = User {
            id: Uuid::new_v4(),
            username: "test-user".to_string(),
            email: "test@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            role: "root".to_string(),
            school_id: 123,
            campus_id: Some(456),
            grade_id: None,
        };

        let token = service
            .generate_access_token(&user)
            .expect("Failed to generate token");
        let claims = service
            .decode_token(&token)
            .expect("Failed to decode token");

        assert_eq!(claims.sub, user.id);
        assert_eq!(claims.email, user.email);
        assert_eq!(claims.role, user.role);
        assert_eq!(claims.school_id, user.school_id);
        assert_eq!(claims.campus_id, user.campus_id);
        assert_eq!(claims.grade_id, user.grade_id);
    }

    #[test]
    fn test_invalid_token() {
        let secret = "test_secret_key_for_testing";
        let service = JwtService::new(secret);

        let result = service.decode_token("invalid_token");
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_secret() {
        let service1 = JwtService::new("secret1");
        let service2 = JwtService::new("secret2");

        let user = User {
            id: Uuid::new_v4(),
            username: "test-user".to_string(),
            email: "test@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            role: "root".to_string(),
            school_id: 123,
            campus_id: Some(456),
            grade_id: None,
        };

        let token = service1
            .generate_access_token(&user)
            .expect("Failed to generate token");
        let result = service2.decode_token(&token);
        assert!(result.is_err());
    }
}
