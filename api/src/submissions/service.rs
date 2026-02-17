use super::models::*;
use crate::AppState;
use anyhow::Result;
use sqlx::{PgPool, Row};
use uuid::Uuid;
use serde_json::json;

pub struct SubmissionService {
    pool: PgPool,
}

impl SubmissionService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_submission(
        &self,
        user_id: Uuid,
        req: CreateSubmissionRequest,
    ) -> Result<Submission> {
        // Validate problem exists
        let problem_exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM problems WHERE id = $1)"
        )
        .bind(req.problem_id)
        .fetch_one(&self.pool)
        .await?;

        if !problem_exists {
            return Err(anyhow::anyhow!("Problem not found"));
        }

        // Validate language
        let language_valid = LANGUAGE_CONFIG.iter().any(|(id, _, _)| id == &req.language);
        if !language_valid {
            return Err(anyhow::anyhow!("Invalid language"));
        }

        // Create submission
        let submission = sqlx::query_as::<_, Submission>(
            r#"
            INSERT INTO submissions (user_id, problem_id, code, language, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *
            "#
        )
        .bind(user_id)
        .bind(req.problem_id)
        .bind(&req.code)
        .bind(&req.language)
        .fetch_one(&self.pool)
        .await?;

        // TODO: Send to judge queue
        // This would typically publish to a message queue or call the judge service
        self.queue_for_judging(submission.id).await?;

        Ok(submission)
    }

    pub async fn get_submission(&self, submission_id: i64, user_id: Uuid) -> Result<SubmissionResponse> {
        let submission = sqlx::query_as::<_, Submission>(
            "SELECT * FROM submissions WHERE id = $1 AND user_id = $2"
        )
        .bind(submission_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Submission not found"))?;

        // Get test case results
        let test_cases = sqlx::query_as::<_, SubmissionResult>(
            "SELECT * FROM test_case_results WHERE submission_id = $1"
        )
        .bind(submission_id)
        .fetch_all(&self.pool)
        .await?;

        let test_case_results = test_cases.into_iter().map(|tc| TestCaseResult {
            id: tc.id,
            status: tc.status,
            expected_output: tc.expected_output,
            actual_output: tc.actual_output,
            error_message: tc.error_message,
            runtime_ms: tc.runtime_ms,
            memory_kb: tc.memory_kb,
        }).collect();

        Ok(SubmissionResponse {
            id: submission.id,
            user_id: submission.user_id,
            problem_id: submission.problem_id,
            code: submission.code,
            language: submission.language,
            status: submission.status,
            score: submission.score,
            runtime_ms: submission.runtime_ms,
            memory_kb: submission.memory_kb,
            test_cases: test_case_results,
            created_at: submission.created_at,
            updated_at: submission.updated_at,
        })
    }

    pub async fn list_submissions(
        &self,
        user_id: Uuid,
        problem_id: Option<i64>,
        status: Option<String>,
        language: Option<String>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Submission>, i64)> {
        let mut query = String::from(
            "SELECT * FROM submissions WHERE user_id = $1"
        );
        let mut count_query = String::from(
            "SELECT COUNT(*) FROM submissions WHERE user_id = $1"
        );

        let mut param_count = 1;
        let mut conditions = vec![];

        if let Some(problem_id) = problem_id {
            param_count += 1;
            conditions.push(format!(" AND problem_id = ${}", param_count));
        }

        if let Some(status) = &status {
            param_count += 1;
            conditions.push(format!(" AND status = ${}", param_count));
        }

        if let Some(language) = &language {
            param_count += 1;
            conditions.push(format!(" AND language = ${}", param_count));
        }

        let condition_str = conditions.join("");
        query.push_str(&condition_str);
        count_query.push_str(&condition_str);

        query.push_str(&format!(" ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset));

        // Execute count query
        let total: i64 = sqlx::query_scalar(&count_query)
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;

        // Execute main query with parameters
        let mut query_builder = sqlx::query_as::<_, Submission>(&query);
        query_builder = query_builder.bind(user_id);

        if let Some(problem_id) = problem_id {
            query_builder = query_builder.bind(problem_id);
        }
        if let Some(status) = &status {
            query_builder = query_builder.bind(status);
        }
        if let Some(language) = &language {
            query_builder = query_builder.bind(language);
        }

        let submissions = query_builder.fetch_all(&self.pool).await?;

        Ok((submissions, total))
    }

    pub async fn get_user_submission_stats(&self, user_id: Uuid) -> Result<SubmissionStats> {
        let row = sqlx::query(
            r#"
            SELECT
                COUNT(*) as total_submissions,
                COUNT(*) FILTER (WHERE status = 'accepted') as accepted_submissions,
                COALESCE(AVG(runtime_ms) FILTER (WHERE status = 'accepted'), 0) as average_runtime,
                COALESCE(AVG(memory_kb) FILTER (WHERE status = 'accepted'), 0) as average_memory
            FROM submissions
            WHERE user_id = $1
            "#
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        let total_submissions: i64 = row.get("total_submissions");
        let accepted_submissions: i64 = row.get("accepted_submissions");
        let average_runtime: Option<f64> = row.get("average_runtime");
        let average_memory: Option<f64> = row.get("average_memory");

        let acceptance_rate = if total_submissions > 0 {
            (accepted_submissions as f64 / total_submissions as f64) * 100.0
        } else {
            0.0
        };

        Ok(SubmissionStats {
            total_submissions,
            accepted_submissions,
            acceptance_rate,
            average_runtime,
            average_memory,
        })
    }

    async fn queue_for_judging(&self, submission_id: i64) -> Result<()> {
        // In a real implementation, this would publish to a message queue
        // For now, we'll just update the status to "running"
        sqlx::query(
            "UPDATE submissions SET status = 'running', updated_at = NOW() WHERE id = $1"
        )
        .bind(submission_id)
        .execute(&self.pool)
        .await?;

        // Simulate judging process
        // In production, this would be handled by the judge-worker service
        Ok(())
    }

    pub async fn update_submission_status(&self, submission_id: i64, status: &str, score: Option<i32>) -> Result<()> {
        sqlx::query(
            "UPDATE submissions SET status = $1, score = $2, updated_at = NOW() WHERE id = $3"
        )
        .bind(status)
        .bind(score)
        .bind(submission_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}