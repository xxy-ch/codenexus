use anyhow::Result;
use chrono::{NaiveDate, Utc};
use sqlx::PgPool;

use crate::extractor::StructuralFeatures;
use crate::models::{
    AnalysisClassSnapshot, AnalysisJob, AnalysisSolutionCluster, AnalysisSubmissionFeatures,
    AnalysisTeachingCard, NewAnalysisJob,
};

#[derive(Clone)]
pub struct AnalysisService {
    pool: PgPool,
}

impl AnalysisService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn create_job(&self, job: &NewAnalysisJob) -> Result<i64> {
        let record = sqlx::query_scalar::<_, i64>(
            r#"
            INSERT INTO analysis_jobs (
                submission_id, problem_id, user_id, organization_id,
                campus_id, grade_id, contest_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING id
            "#,
        )
        .bind(job.submission_id)
        .bind(job.problem_id)
        .bind(job.user_id)
        .bind(job.organization_id)
        .bind(job.campus_id)
        .bind(job.grade_id)
        .bind(job.contest_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn mark_processing(&self, job_id: i64) -> Result<()> {
        sqlx::query(
            "UPDATE analysis_jobs SET status = 'processing', updated_at = NOW() WHERE id = $1",
        )
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn mark_completed(&self, job_id: i64) -> Result<()> {
        sqlx::query(
            "UPDATE analysis_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1",
        )
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn mark_failed(&self, job_id: i64, error_message: &str) -> Result<()> {
        sqlx::query(
            "UPDATE analysis_jobs SET status = 'failed', updated_at = NOW(), error_message = $2 WHERE id = $1",
        )
        .bind(job_id)
        .bind(error_message)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn store_features(
        &self,
        submission_id: i64,
        organization_id: i64,
        features: &StructuralFeatures,
        embedding: Option<Vec<f64>>,
    ) -> Result<()> {
        let embedding = embedding.map(sqlx::types::Json);

        sqlx::query(
            r#"
            INSERT INTO analysis_submission_features (
                submission_id,
                organization_id,
                cyclomatic_complexity,
                lines_of_code,
                token_count,
                function_count,
                nesting_depth,
                has_recursion,
                loop_count,
                avg_loop_nesting,
                distinct_operators,
                distinct_operands,
                halstead_volume,
                embedding_vector,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (submission_id)
            DO UPDATE SET
                organization_id = EXCLUDED.organization_id,
                cyclomatic_complexity = EXCLUDED.cyclomatic_complexity,
                lines_of_code = EXCLUDED.lines_of_code,
                token_count = EXCLUDED.token_count,
                function_count = EXCLUDED.function_count,
                nesting_depth = EXCLUDED.nesting_depth,
                has_recursion = EXCLUDED.has_recursion,
                loop_count = EXCLUDED.loop_count,
                avg_loop_nesting = EXCLUDED.avg_loop_nesting,
                distinct_operators = EXCLUDED.distinct_operators,
                distinct_operands = EXCLUDED.distinct_operands,
                halstead_volume = EXCLUDED.halstead_volume,
                embedding_vector = COALESCE(EXCLUDED.embedding_vector, analysis_submission_features.embedding_vector)
            "#,
        )
        .bind(submission_id)
        .bind(organization_id)
        .bind(features.cyclomatic_complexity)
        .bind(features.lines_of_code)
        .bind(features.token_count)
        .bind(features.function_count)
        .bind(features.max_nesting_depth)
        .bind(features.has_recursion)
        .bind(features.loop_count)
        .bind(features.avg_loop_nesting)
        .bind(features.distinct_operators)
        .bind(features.distinct_operands)
        .bind(features.halstead_volume)
        .bind(embedding)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn store_embedding(
        &self,
        submission_id: i64,
        organization_id: i64,
        embedding: Vec<f64>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE analysis_submission_features
            SET embedding_vector = $3
            WHERE submission_id = $1 AND organization_id = $2
            "#,
        )
        .bind(submission_id)
        .bind(organization_id)
        .bind(sqlx::types::Json(embedding))
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_submission_features(
        &self,
        submission_id: i64,
        organization_id: i64,
    ) -> Result<Option<AnalysisSubmissionFeatures>> {
        let record = sqlx::query_as::<_, AnalysisSubmissionFeatures>(
            r#"
            SELECT *
            FROM analysis_submission_features
            WHERE submission_id = $1 AND organization_id = $2
            LIMIT 1
            "#,
        )
        .bind(submission_id)
        .bind(organization_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn get_teaching_cards(
        &self,
        problem_id: i64,
        organization_id: i64,
    ) -> Result<Vec<AnalysisTeachingCard>> {
        let cards = sqlx::query_as::<_, AnalysisTeachingCard>(
            r#"
            SELECT *
            FROM analysis_teaching_cards
            WHERE problem_id = $1 AND organization_id = $2
            ORDER BY updated_at DESC
            "#,
        )
        .bind(problem_id)
        .bind(organization_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(cards)
    }

    pub async fn get_solution_clusters(
        &self,
        problem_id: i64,
        organization_id: i64,
    ) -> Result<Vec<AnalysisSolutionCluster>> {
        let clusters = sqlx::query_as::<_, AnalysisSolutionCluster>(
            r#"
            SELECT *
            FROM analysis_solution_clusters
            WHERE problem_id = $1 AND organization_id = $2
            ORDER BY member_count DESC, updated_at DESC
            "#,
        )
        .bind(problem_id)
        .bind(organization_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(clusters)
    }

    pub async fn get_class_snapshot(
        &self,
        class_id: i64,
        organization_id: i64,
    ) -> Result<Option<AnalysisClassSnapshot>> {
        let snapshot = sqlx::query_as::<_, AnalysisClassSnapshot>(
            r#"
            SELECT *
            FROM analysis_class_snapshots
            WHERE class_id = $1 AND organization_id = $2
            ORDER BY snapshot_date DESC, created_at DESC
            LIMIT 1
            "#,
        )
        .bind(class_id)
        .bind(organization_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(snapshot)
    }

    pub async fn list_pending_jobs(&self, limit: i64) -> Result<Vec<AnalysisJob>> {
        let jobs = sqlx::query_as::<_, AnalysisJob>(
            "SELECT * FROM analysis_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1",
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    pub async fn latest_processing_date(&self) -> NaiveDate {
        Utc::now().date_naive()
    }
}
