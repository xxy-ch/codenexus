use std::env;
use std::error::Error;
use std::fmt;
use std::time::{Duration, Instant};

use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

const DEFAULT_TIMEOUT: Duration = Duration::from_secs(10);
const DEFAULT_MODEL: &str = "text-embedding-3-small";
const EMBEDDINGS_PATH: &str = "/v1/embeddings";

pub type Result<T> = std::result::Result<T, EmbeddingError>;

#[derive(Debug)]
pub enum EmbeddingError {
    Config {
        message: String,
    },
    Http {
        endpoint: String,
        source: reqwest::Error,
    },
    Api {
        endpoint: String,
        status: Option<u16>,
        message: String,
    },
    MalformedResponse {
        endpoint: String,
        message: String,
    },
}

impl fmt::Display for EmbeddingError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Config { message } => {
                write!(formatter, "embedding configuration error: {message}")
            }
            Self::Http { endpoint, source } => {
                write!(
                    formatter,
                    "embedding HTTP request failed for {endpoint}: {source}"
                )
            }
            Self::Api {
                endpoint,
                status,
                message,
            } => match status {
                Some(status) => write!(
                    formatter,
                    "embedding API request failed for {endpoint} with status {status}: {message}"
                ),
                None => write!(
                    formatter,
                    "embedding API request failed for {endpoint}: {message}"
                ),
            },
            Self::MalformedResponse { endpoint, message } => {
                write!(
                    formatter,
                    "embedding API returned malformed response from {endpoint}: {message}"
                )
            }
        }
    }
}

impl Error for EmbeddingError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Http { source, .. } => Some(source),
            _ => None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct EmbeddingClient {
    primary_url: Url,
    fallback_url: Option<Url>,
    api_key: Option<String>,
    model: String,
    http: Client,
}

impl EmbeddingClient {
    pub fn new(
        primary_url: String,
        fallback_url: Option<String>,
        api_key: Option<String>,
        model: String,
        timeout: Duration,
    ) -> Result<Self> {
        let primary_url = normalize_embeddings_url(&primary_url)?;
        let fallback_url = fallback_url
            .filter(|value| !value.trim().is_empty())
            .map(|value| normalize_embeddings_url(&value))
            .transpose()?;
        let model = if model.trim().is_empty() {
            DEFAULT_MODEL.to_string()
        } else {
            model
        };
        let api_key = api_key.filter(|value| !value.trim().is_empty());
        let http = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|source| EmbeddingError::Config {
                message: format!("failed to build HTTP client: {source}"),
            })?;

        Ok(Self {
            primary_url,
            fallback_url,
            api_key,
            model,
            http,
        })
    }

    pub fn from_env() -> Result<Option<Self>> {
        let primary_url = match env::var("EMBEDDING_API_URL") {
            Ok(value) if !value.trim().is_empty() => value,
            _ => return Ok(None),
        };
        let fallback_url = env::var("EMBEDDING_FALLBACK_URL")
            .ok()
            .filter(|value| !value.trim().is_empty());
        let api_key = env::var("EMBEDDING_API_KEY")
            .ok()
            .filter(|value| !value.trim().is_empty());
        let model = env::var("EMBEDDING_MODEL")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_MODEL.to_string());

        Self::new(primary_url, fallback_url, api_key, model, DEFAULT_TIMEOUT).map(Some)
    }

    pub async fn embed(&self, text: &str) -> Result<Vec<f64>> {
        let primary_start = Instant::now();
        match self.call_endpoint(&self.primary_url, text).await {
            Ok(embedding) => {
                self.record_success(&self.primary_url, embedding.len(), primary_start.elapsed());
                Ok(embedding)
            }
            Err(primary_error) => {
                warn!(
                    model = %self.model,
                    endpoint = %self.primary_url,
                    error = %primary_error,
                    "Primary embedding endpoint failed"
                );

                let Some(fallback_url) = &self.fallback_url else {
                    return Err(primary_error);
                };

                let fallback_start = Instant::now();
                match self.call_endpoint(fallback_url, text).await {
                    Ok(embedding) => {
                        self.record_success(
                            fallback_url,
                            embedding.len(),
                            fallback_start.elapsed(),
                        );
                        Ok(embedding)
                    }
                    Err(fallback_error) => Err(EmbeddingError::Api {
                        endpoint: fallback_url.to_string(),
                        status: None,
                        message: format!(
                            "primary failed ({primary_error}); fallback failed ({fallback_error})"
                        ),
                    }),
                }
            }
        }
    }

    async fn call_endpoint(&self, endpoint: &Url, text: &str) -> Result<Vec<f64>> {
        let request = EmbeddingRequest {
            model: &self.model,
            input: text,
        };
        let mut builder = self.http.post(endpoint.clone()).json(&request);
        if let Some(api_key) = &self.api_key {
            builder = builder.bearer_auth(api_key);
        }

        let response = builder
            .send()
            .await
            .map_err(|source| EmbeddingError::Http {
                endpoint: endpoint.to_string(),
                source,
            })?;
        let status = response.status();
        if !status.is_success() {
            let body = response
                .text()
                .await
                .unwrap_or_else(|error| format!("failed to read error body: {error}"));
            return Err(EmbeddingError::Api {
                endpoint: endpoint.to_string(),
                status: Some(status.as_u16()),
                message: extract_error_message(&body),
            });
        }

        let response = response
            .json::<EmbeddingResponse>()
            .await
            .map_err(|source| EmbeddingError::Http {
                endpoint: endpoint.to_string(),
                source,
            })?;
        let embedding = response
            .data
            .into_iter()
            .min_by_key(|item| item.index.unwrap_or(u32::MAX))
            .ok_or_else(|| EmbeddingError::MalformedResponse {
                endpoint: endpoint.to_string(),
                message: "missing data[0].embedding".to_string(),
            })?
            .embedding;

        Ok(embedding)
    }

    fn record_success(&self, endpoint: &Url, dimension: usize, elapsed: Duration) {
        info!(
            model = %self.model,
            endpoint = %endpoint,
            dimension,
            elapsed_ms = elapsed.as_millis() as u64,
            "Embedding generated"
        );
    }
}

fn normalize_embeddings_url(raw_url: &str) -> Result<Url> {
    let trimmed = raw_url.trim().trim_end_matches('/');
    let normalized = if trimmed.ends_with(EMBEDDINGS_PATH) {
        trimmed.to_string()
    } else {
        format!("{trimmed}{EMBEDDINGS_PATH}")
    };

    Url::parse(&normalized).map_err(|source| EmbeddingError::Config {
        message: format!("invalid embedding URL '{raw_url}': {source}"),
    })
}

fn extract_error_message(body: &str) -> String {
    serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|value| {
            value
                .pointer("/error/message")
                .or_else(|| value.get("message"))
                .and_then(|message| message.as_str())
                .map(ToOwned::to_owned)
        })
        .unwrap_or_else(|| body.to_string())
}

#[derive(Debug, Serialize)]
struct EmbeddingRequest<'a> {
    model: &'a str,
    input: &'a str,
}

#[derive(Debug, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingData {
    embedding: Vec<f64>,
    #[serde(default)]
    index: Option<u32>,
}

#[cfg(test)]
mod tests {
    use std::sync::{Mutex, OnceLock};
    use std::time::Duration;

    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use tokio::sync::oneshot;

    use super::EmbeddingClient;

    #[derive(Debug)]
    struct RecordedRequest {
        request_line: String,
        headers: String,
        body: String,
    }

    async fn spawn_embedding_server(
        status: u16,
        body: impl Into<String>,
    ) -> (String, oneshot::Receiver<RecordedRequest>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let response_body = body.into();
        let (tx, rx) = oneshot::channel();

        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut buffer = Vec::new();
            let mut chunk = [0_u8; 1024];

            loop {
                let read = socket.read(&mut chunk).await.unwrap();
                if read == 0 {
                    break;
                }
                buffer.extend_from_slice(&chunk[..read]);

                if let Some(header_end) = find_header_end(&buffer) {
                    let headers = String::from_utf8_lossy(&buffer[..header_end]).to_string();
                    let content_length = headers
                        .lines()
                        .find_map(|line| {
                            let (name, value) = line.split_once(':')?;
                            name.eq_ignore_ascii_case("content-length")
                                .then(|| value.trim().parse::<usize>().ok())?
                        })
                        .unwrap_or(0);
                    if buffer.len() >= header_end + 4 + content_length {
                        break;
                    }
                }
            }

            let header_end = find_header_end(&buffer).unwrap();
            let raw_headers = String::from_utf8_lossy(&buffer[..header_end]).to_string();
            let body_start = header_end + 4;
            let request_body = String::from_utf8_lossy(&buffer[body_start..]).to_string();
            let request_line = raw_headers.lines().next().unwrap_or_default().to_string();
            let headers = raw_headers
                .lines()
                .skip(1)
                .map(|line| line.to_ascii_lowercase())
                .collect::<Vec<_>>()
                .join("\n");

            let _ = tx.send(RecordedRequest {
                request_line,
                headers,
                body: request_body,
            });

            let reason = match status {
                200 => "OK",
                400 => "Bad Request",
                500 => "Internal Server Error",
                _ => "OK",
            };
            let response = format!(
                "HTTP/1.1 {status} {reason}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                response_body.len(), response_body
            );
            socket.write_all(response.as_bytes()).await.unwrap();
        });

        (format!("http://{address}"), rx)
    }

    fn find_header_end(buffer: &[u8]) -> Option<usize> {
        buffer.windows(4).position(|window| window == b"\r\n\r\n")
    }

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    #[tokio::test]
    async fn embed_posts_openai_request_and_returns_first_vector() {
        let (url, request) = spawn_embedding_server(
            200,
            r#"{"data":[{"object":"embedding","index":0,"embedding":[0.1,0.2,0.3]}],"model":"demo-model","object":"list"}"#
                .replace('\\', ""),
        )
        .await;
        let client = EmbeddingClient::new(
            url,
            None,
            Some("test-secret".to_string()),
            "demo-model".to_string(),
            Duration::from_secs(10),
        )
        .unwrap();

        let embedding = client.embed("fn main() {}").await.unwrap();

        assert_eq!(embedding, vec![0.1, 0.2, 0.3]);
        let request = request.await.unwrap();
        assert!(request.request_line.starts_with("POST /v1/embeddings "));
        assert!(request
            .headers
            .contains("authorization: bearer test-secret"));
        assert!(request.body.contains(r#""model":"demo-model""#));
        assert!(request.body.contains(r#""input":"fn main() {}""#));
    }

    #[tokio::test]
    async fn embed_uses_fallback_when_primary_fails() {
        let (primary_url, primary_request) = spawn_embedding_server(
            500,
            r#"{"error":{"message":"primary unavailable"}}"#.replace('\\', ""),
        )
        .await;
        let (fallback_url, fallback_request) = spawn_embedding_server(
            200,
            r#"{"data":[{"index":0,"embedding":[1.0,2.0]}],"model":"fallback-model"}"#
                .replace('\\', ""),
        )
        .await;
        let client = EmbeddingClient::new(
            primary_url,
            Some(fallback_url),
            None,
            "demo-model".to_string(),
            Duration::from_secs(10),
        )
        .unwrap();

        let embedding = client.embed("fallback please").await.unwrap();

        assert_eq!(embedding, vec![1.0, 2.0]);
        assert!(primary_request
            .await
            .unwrap()
            .body
            .contains("fallback please"));
        assert!(fallback_request
            .await
            .unwrap()
            .body
            .contains("fallback please"));
    }

    #[tokio::test]
    async fn embed_returns_api_error_when_all_endpoints_fail() {
        let (url, _request) = spawn_embedding_server(
            400,
            r#"{"error":{"message":"invalid input"}}"#.replace('\\', ""),
        )
        .await;
        let client = EmbeddingClient::new(
            url,
            None,
            None,
            "demo-model".to_string(),
            Duration::from_secs(10),
        )
        .unwrap();

        let error = client.embed("bad input").await.unwrap_err();

        assert!(error.to_string().contains("embedding API request failed"));
        assert!(error.to_string().contains("400"));
    }

    #[test]
    fn from_env_returns_none_when_no_url_set() {
        let _guard = env_lock().lock().unwrap();
        std::env::remove_var("EMBEDDING_API_URL");
        std::env::remove_var("EMBEDDING_FALLBACK_URL");
        std::env::remove_var("EMBEDDING_API_KEY");
        std::env::remove_var("EMBEDDING_MODEL");

        let result = EmbeddingClient::from_env().unwrap();
        assert!(result.is_none(), "should return Ok(None) when EMBEDDING_API_URL is unset");
    }

    #[test]
    fn new_normalizes_bare_base_url() {
        let client = EmbeddingClient::new(
            "http://localhost:8000".to_string(),
            None,
            None,
            "model-a".to_string(),
            Duration::from_secs(5),
        )
        .unwrap();
        assert_eq!(
            client.primary_url.as_str(),
            "http://localhost:8000/v1/embeddings"
        );
    }

    #[test]
    fn new_preserves_already_complete_url() {
        let client = EmbeddingClient::new(
            "http://localhost:8000/v1/embeddings".to_string(),
            None,
            None,
            "model-a".to_string(),
            Duration::from_secs(5),
        )
        .unwrap();
        assert_eq!(
            client.primary_url.as_str(),
            "http://localhost:8000/v1/embeddings"
        );
    }

    #[test]
    fn new_strips_trailing_slash_before_appending_path() {
        let client = EmbeddingClient::new(
            "http://localhost:8000/".to_string(),
            None,
            None,
            "model-a".to_string(),
            Duration::from_secs(5),
        )
        .unwrap();
        assert_eq!(
            client.primary_url.as_str(),
            "http://localhost:8000/v1/embeddings"
        );
    }

    #[test]
    fn new_uses_default_model_when_empty() {
        let client = EmbeddingClient::new(
            "http://localhost:8000".to_string(),
            None,
            None,
            "".to_string(),
            Duration::from_secs(5),
        )
        .unwrap();
        assert_eq!(client.model, "text-embedding-3-small");
    }

    #[test]
    fn new_ignores_empty_fallback_url() {
        let client = EmbeddingClient::new(
            "http://localhost:8000".to_string(),
            Some("".to_string()),
            None,
            "m".to_string(),
            Duration::from_secs(5),
        )
        .unwrap();
        assert!(client.fallback_url.is_none());
    }

    #[test]
    fn new_ignores_whitespace_only_api_key() {
        let client = EmbeddingClient::new(
            "http://localhost:8000".to_string(),
            None,
            Some("   ".to_string()),
            "m".to_string(),
            Duration::from_secs(5),
        )
        .unwrap();
        assert!(client.api_key.is_none());
    }

    #[test]
    fn new_rejects_invalid_url() {
        let result = EmbeddingClient::new(
            "not a url".to_string(),
            None,
            None,
            "m".to_string(),
            Duration::from_secs(5),
        );
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("invalid embedding URL"), "error: {err}");
    }

    #[tokio::test]
    async fn embed_returns_error_on_empty_data_array() {
        let (url, _req) = spawn_embedding_server(
            200,
            r#"{"data":[],"model":"demo","object":"list"}"#.to_string(),
        )
        .await;
        let client = EmbeddingClient::new(
            url,
            None,
            None,
            "demo-model".to_string(),
            Duration::from_secs(10),
        )
        .unwrap();

        let error = client.embed("anything").await.unwrap_err();
        assert!(
            error.to_string().contains("missing data[0].embedding"),
            "expected malformed response error, got: {error}"
        );
    }

    #[tokio::test]
    async fn embed_returns_fallback_error_when_both_endpoints_fail() {
        let (primary_url, _) = spawn_embedding_server(
            500,
            r#"{"error":{"message":"primary down"}}"#.to_string(),
        )
        .await;
        let (fallback_url, _) = spawn_embedding_server(
            503,
            r#"{"error":{"message":"fallback down"}}"#.to_string(),
        )
        .await;
        let client = EmbeddingClient::new(
            primary_url,
            Some(fallback_url),
            None,
            "demo-model".to_string(),
            Duration::from_secs(10),
        )
        .unwrap();

        let error = client.embed("anything").await.unwrap_err();
        let msg = error.to_string();
        assert!(msg.contains("primary failed"), "error: {msg}");
        assert!(msg.contains("fallback failed"), "error: {msg}");
    }
}
