use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisJob {
    pub id: i64,
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub llm_model: Option<String>,
    pub prompt_tokens: Option<i32>,
    pub completion_tokens: Option<i32>,
    pub latency_ms: Option<i32>,
    pub retry_count: Option<i32>,
    pub max_retries: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisSubmissionFeatures {
    pub id: i64,
    pub submission_id: i64,
    pub organization_id: i64,
    pub cyclomatic_complexity: Option<f64>,
    pub lines_of_code: Option<i32>,
    pub token_count: Option<i32>,
    pub function_count: Option<i32>,
    pub nesting_depth: Option<i32>,
    pub has_recursion: Option<bool>,
    pub loop_count: Option<i32>,
    pub avg_loop_nesting: Option<f64>,
    pub distinct_operators: Option<i32>,
    pub distinct_operands: Option<i32>,
    pub halstead_volume: Option<f64>,
    pub embedding_vector: Option<sqlx::types::Json<Vec<f64>>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisSolutionCluster {
    pub id: i64,
    pub problem_id: i64,
    pub organization_id: i64,
    pub cluster_name: Option<String>,
    pub centroid_embedding: Option<sqlx::types::Json<Vec<f64>>>,
    pub member_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisClusterMember {
    pub id: i64,
    pub cluster_id: i64,
    pub submission_id: i64,
    pub organization_id: i64,
    pub distance_to_centroid: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisTeachingCard {
    pub id: i64,
    pub problem_id: i64,
    pub organization_id: i64,
    pub card_type: String,
    pub title: String,
    pub content: sqlx::types::Json<serde_json::Value>,
    pub source_cluster_ids: Vec<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisClassSnapshot {
    pub id: i64,
    pub class_id: i64,
    pub organization_id: i64,
    pub snapshot_date: NaiveDate,
    pub cognition_profile: sqlx::types::Json<serde_json::Value>,
    pub student_count: i32,
    pub avg_complexity: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisFlag {
    pub id: i64,
    pub organization_id: i64,
    pub flag_key: String,
    pub scope: String,
    pub scope_id: Option<i64>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAnalysisJob {
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisEvent {
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub verdict: String,
    pub runtime_ms: i64,
    pub memory_mb: i64,
    pub language: String,
}

/// Submission metadata needed to create an analysis job.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SubmissionMeta {
    pub user_id: Uuid,
    pub problem_id: i64,
    pub organization_id: i64,
}

// ---------------------------------------------------------------------------
// Similarity retrieval models
// ---------------------------------------------------------------------------

/// Row returned by the cross-problem similarity query.
/// Extends the feature columns with a joined problem_id.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct FeatureWithProblem {
    // analysis_submission_features columns
    pub id: i64,
    pub submission_id: i64,
    pub organization_id: i64,
    pub cyclomatic_complexity: Option<f64>,
    pub lines_of_code: Option<i32>,
    pub token_count: Option<i32>,
    pub function_count: Option<i32>,
    pub nesting_depth: Option<i32>,
    pub has_recursion: Option<bool>,
    pub loop_count: Option<i32>,
    pub avg_loop_nesting: Option<f64>,
    pub distinct_operators: Option<i32>,
    pub distinct_operands: Option<i32>,
    pub halstead_volume: Option<f64>,
    pub embedding_vector: Option<sqlx::types::Json<Vec<f64>>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    // joined column
    pub problem_id: Option<i64>,
}

impl From<FeatureWithProblem> for (AnalysisSubmissionFeatures, i64) {
    fn from(row: FeatureWithProblem) -> Self {
        let feat = AnalysisSubmissionFeatures {
            id: row.id,
            submission_id: row.submission_id,
            organization_id: row.organization_id,
            cyclomatic_complexity: row.cyclomatic_complexity,
            lines_of_code: row.lines_of_code,
            token_count: row.token_count,
            function_count: row.function_count,
            nesting_depth: row.nesting_depth,
            has_recursion: row.has_recursion,
            loop_count: row.loop_count,
            avg_loop_nesting: row.avg_loop_nesting,
            distinct_operators: row.distinct_operators,
            distinct_operands: row.distinct_operands,
            halstead_volume: row.halstead_volume,
            embedding_vector: row.embedding_vector,
            created_at: row.created_at,
        };
        let pid = row.problem_id.unwrap_or(0);
        (feat, pid)
    }
}

/// A submission ranked by weighted similarity to a query submission.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarSubmission {
    /// The submission being compared against the query.
    pub submission_id: i64,
    /// The problem this submission belongs to.
    pub problem_id: i64,
    /// Combined weighted score: cosine_sim * 0.6 + structural_sim * 0.4.
    /// Range [0.0, 1.0] where 1.0 = identical.
    pub similarity_score: f64,
    /// Cosine similarity of embedding vectors.
    pub embedding_similarity: f64,
    /// Normalized structural similarity (1 - normalized_distance).
    pub structural_similarity: f64,
    /// Cyclomatic complexity of the matched submission (for display).
    pub cyclomatic_complexity: Option<f64>,
    /// Lines of code of the matched submission (for display).
    pub lines_of_code: Option<i32>,
}
