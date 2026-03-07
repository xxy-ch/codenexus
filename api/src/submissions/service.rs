use super::models::*;
use super::queue::{self, SubmissionMessage};
use anyhow::Result;
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct SubmissionService {
    pool: PgPool,
    redis_pool: Option<deadpool_redis::Pool>,
}

impl SubmissionService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            redis_pool: None,
        }
    }

    pub fn with_redis(pool: PgPool, redis_pool: deadpool_redis::Pool) -> Self {
        Self {
            pool,
            redis_pool: Some(redis_pool),
        }
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
            INSERT INTO submissions (organization_id, user_id, problem_id, code, language, status)
            VALUES (
                COALESCE((SELECT organization_id FROM users WHERE id = $1), 1),
                $1,
                $2,
                $3,
                $4,
                'queued'
            )
            RETURNING
                id,
                user_id,
                problem_id,
                code,
                language,
                status,
                NULL::INTEGER as score,
                time_ms as runtime_ms,
                memory_kb,
                created_at,
                updated_at
            "#
        )
        .bind(user_id)
        .bind(req.problem_id)
        .bind(&req.code)
        .bind(&req.language)
        .fetch_one(&self.pool)
        .await?;

        // Send to judge queue
        self.queue_for_judging(submission.id, req.problem_id, user_id, &req.code, &req.language).await?;

        Ok(submission)
    }

    pub async fn get_submission(&self, submission_id: i64, user_id: Uuid) -> Result<SubmissionResponse> {
        let submission = sqlx::query_as::<_, Submission>(
            r#"
            SELECT
                id,
                user_id,
                problem_id,
                code,
                language,
                status,
                NULL::INTEGER as score,
                time_ms as runtime_ms,
                memory_kb,
                created_at,
                updated_at
            FROM submissions
            WHERE id = $1 AND user_id = $2
            "#
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
            r#"
            SELECT
                id,
                user_id,
                problem_id,
                code,
                language,
                status,
                NULL::INTEGER as score,
                time_ms as runtime_ms,
                memory_kb,
                created_at,
                updated_at
            FROM submissions
            WHERE user_id = $1
            "#
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
                COUNT(*) FILTER (WHERE verdict = 'ac') as accepted_submissions,
                COALESCE((AVG(time_ms) FILTER (WHERE verdict = 'ac'))::DOUBLE PRECISION, 0.0::DOUBLE PRECISION) as average_runtime,
                COALESCE((AVG(memory_kb) FILTER (WHERE verdict = 'ac'))::DOUBLE PRECISION, 0.0::DOUBLE PRECISION) as average_memory
            FROM submissions
            WHERE user_id = $1
            "#
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        let total_submissions: i64 = row.get("total_submissions");
        let accepted_submissions: i64 = row.get("accepted_submissions");
        let average_runtime: f64 = row.get("average_runtime");
        let average_memory: f64 = row.get("average_memory");

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

    async fn queue_for_judging(
        &self,
        submission_id: i64,
        problem_id: i64,
        user_id: Uuid,
        code: &str,
        language: &str,
    ) -> Result<()> {
        // Update status to "queued"
        sqlx::query(
            "UPDATE submissions SET status = 'queued', updated_at = NOW() WHERE id = $1"
        )
        .bind(submission_id)
        .execute(&self.pool)
        .await?;

        // If Redis is configured, send to queue
        if let Some(redis_pool) = &self.redis_pool {
            // Fetch problem limits
            let problem = sqlx::query_as::<_, (i32, i32)>(
                "SELECT time_limit, memory_limit FROM problems WHERE id = $1"
            )
            .bind(problem_id)
            .fetch_optional(&self.pool)
            .await?;

            if let Some((time_limit, memory_limit)) = problem {
                let message = SubmissionMessage {
                    submission_id,
                    problem_id,
                    user_id,
                    language: language.to_string(),
                    source_code: code.to_string(),
                    time_limit_ms: time_limit as u64,
                    memory_limit_mb: memory_limit as u64,
                };

                match queue::queue_submission(redis_pool, &message).await {
                    Ok(message_id) => {
                        tracing::info!(
                            "Submission {} queued with message ID {}",
                            submission_id,
                            message_id
                        );
                    }
                    Err(e) => {
                        tracing::error!(
                            "Failed to queue submission {}: {}",
                            submission_id,
                            e
                        );
                        // Revert status to pending
                        sqlx::query(
                            "UPDATE submissions SET status = 'pending', updated_at = NOW() WHERE id = $1"
                        )
                        .bind(submission_id)
                        .execute(&self.pool)
                        .await?;
                        return Err(e);
                    }
                }
            } else {
                tracing::warn!("Problem {} not found, skipping queue", problem_id);
            }
        } else {
            tracing::warn!("Redis not configured, submission not queued");
        }

        Ok(())
    }

    /// Update submission with detailed judge results
    pub async fn update_judge_result(
        &self,
        submission_id: i64,
        status: &str,
        score: Option<i32>,
        runtime_ms: Option<i32>,
        memory_kb: Option<i32>,
    ) -> Result<()> {
        sqlx::query(
            "UPDATE submissions
             SET status = $1, verdict = $2, time_ms = $3, memory_kb = $4, updated_at = NOW()
             WHERE id = $5"
        )
        .bind(if status == "accepted" || status == "wrong_answer" || status == "runtime_error" || status == "time_limit_exceeded" || status == "memory_limit_exceeded" || status == "compile_error" { "judged" } else if status == "failed" { "failed" } else { status })
        .bind(map_verdict(status))
        .bind(runtime_ms)
        .bind(memory_kb)
        .bind(submission_id)
        .execute(&self.pool)
        .await?;

        tracing::info!(
            "Updated submission {} to status {} with score {:?}",
            submission_id,
            status,
            score
        );

        Ok(())
    }

    /// Store test case result for a submission
    pub async fn store_test_case_result(
        &self,
        submission_id: i64,
        test_case_id: i64,
        status: &str,
        expected_output: Option<String>,
        actual_output: Option<String>,
        error_message: Option<String>,
        runtime_ms: Option<i32>,
        memory_kb: Option<i32>,
    ) -> Result<i64> {
        let result_id = sqlx::query_scalar::<_, i64>(
            r#"
            INSERT INTO test_case_results (
                submission_id, test_case_id, status,
                expected_output, actual_output, error_message,
                runtime_ms, memory_kb
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            "#
        )
        .bind(submission_id)
        .bind(test_case_id)
        .bind(status)
        .bind(&expected_output)
        .bind(&actual_output)
        .bind(&error_message)
        .bind(runtime_ms)
        .bind(memory_kb)
        .fetch_one(&self.pool)
        .await?;

        Ok(result_id)
    }
}

fn map_verdict(status: &str) -> Option<&'static str> {
    match status {
        "accepted" => Some("ac"),
        "wrong_answer" => Some("wa"),
        "runtime_error" => Some("rte"),
        "time_limit_exceeded" => Some("tle"),
        "memory_limit_exceeded" => Some("mle"),
        "compile_error" => Some("ce"),
        "system_error" | "failed" => Some("ie"),
        _ => None,
    }
}
