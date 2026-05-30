use crate::models::*;
use crate::queue::{self, SubmissionMessage};
use anyhow::Result;
use sqlx::{PgPool, Row};
use std::fmt;
use uuid::Uuid;

/// Outcome of a transactional judge result update.
#[derive(Debug, PartialEq)]
pub enum JudgeUpdateOutcome {
    /// Submission was updated successfully.
    Updated,
    /// Submission was already in the target state (idempotent — no changes made).
    AlreadyProcessed,
}

/// Errors from a transactional judge result update.
#[derive(Debug)]
pub enum JudgeUpdateError {
    /// No submission row found for the given id.
    NotFound,
    /// Submission is in a terminal state and cannot be overwritten.
    TerminalState { current_status: String },
    /// The status transition is not allowed by the state machine.
    InvalidTransition {
        current_status: String,
        target_status: String,
    },
    /// A test case callback carried an unsupported status string.
    InvalidTestCaseStatus { status: String },
    /// A database error occurred (transaction will have been rolled back).
    Database(sqlx::Error),
}

impl From<sqlx::Error> for JudgeUpdateError {
    fn from(err: sqlx::Error) -> Self {
        JudgeUpdateError::Database(err)
    }
}

impl fmt::Display for JudgeUpdateError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            JudgeUpdateError::NotFound => write!(f, "Submission not found"),
            JudgeUpdateError::TerminalState { current_status } => write!(
                f,
                "Submission is in terminal state '{}' and cannot be overwritten",
                current_status
            ),
            JudgeUpdateError::InvalidTransition {
                current_status,
                target_status,
            } => write!(
                f,
                "Invalid state transition from '{}' to '{}'",
                current_status, target_status
            ),
            JudgeUpdateError::InvalidTestCaseStatus { status } => {
                write!(f, "Unsupported test case status: {}", status)
            }
            JudgeUpdateError::Database(err) => write!(f, "Database error: {}", err),
        }
    }
}

impl std::error::Error for JudgeUpdateError {}

/// Lightweight input for a single test case result within a transactional update.
pub struct TestCaseResultInput {
    pub test_case_id: i64,
    pub status: String,
    pub expected_output: Option<String>,
    pub actual_output: Option<String>,
    pub error_message: Option<String>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
}

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
        school_id: i64,
        req: CreateSubmissionRequest,
    ) -> Result<Submission> {
        let normalized_language = normalize_submission_language(&req.language)
            .ok_or_else(|| anyhow::anyhow!("Invalid language"))?;

        if !self.is_language_enabled(normalized_language).await? {
            return Err(anyhow::anyhow!(
                "Selected language is disabled by judge settings"
            ));
        }

        // Validate problem exists AND belongs to the user's organization (SEC-03 tenant check)
        let problem_exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM problems WHERE id = $1 AND organization_id = $2)",
        )
        .bind(req.problem_id)
        .bind(school_id)
        .fetch_one(&self.pool)
        .await?;

        if !problem_exists {
            return Err(anyhow::anyhow!("Problem not found"));
        }

        // Validate contest_id if provided: contest must belong to same org and user must be an active participant
        if let Some(contest_id) = req.contest_id {
            let contest_valid = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(
                    SELECT 1 FROM contest_participants cp
                    JOIN contests c ON c.id = cp.contest_id
                    WHERE cp.contest_id = $1
                      AND cp.user_id = $2
                      AND c.organization_id = $3
                      AND c.start_time <= NOW()
                      AND c.end_time >= NOW()
                )",
            )
            .bind(contest_id)
            .bind(user_id)
            .bind(school_id)
            .fetch_one(&self.pool)
            .await?;

            if !contest_valid {
                return Err(anyhow::anyhow!(
                    "Contest not found, not active, or you are not a participant"
                ));
            }
        }

        // Create submission
        let submission = sqlx::query_as::<_, Submission>(
            r#"
            INSERT INTO submissions (organization_id, user_id, problem_id, code, language, status)
            VALUES (
                $5,
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
                score,
                time_ms as runtime_ms,
                memory_kb,
                created_at,
                updated_at
            "#,
        )
        .bind(user_id)
        .bind(req.problem_id)
        .bind(&req.code)
        .bind(normalized_language)
        .bind(school_id)
        .fetch_one(&self.pool)
        .await?;

        // Send to judge queue; on failure, compensate by deleting the orphaned row
        if let Err(e) = self
            .queue_for_judging(
                submission.id,
                req.problem_id,
                user_id,
                school_id,
                &req.code,
                normalized_language,
                req.contest_id,
            )
            .await
        {
            // Compensation: remove the submission row so the DB is not left with an
            // orphaned record that will never be judged.
            tracing::warn!(
                submission_id = submission.id,
                error = %e,
                "queue_for_judging failed after DB INSERT — compensating by deleting submission row"
            );
            match sqlx::query("DELETE FROM submissions WHERE id = $1")
                .bind(submission.id)
                .execute(&self.pool)
                .await
            {
                Ok(result) => {
                    tracing::info!(
                        submission_id = submission.id,
                        rows_deleted = result.rows_affected(),
                        "Compensation DELETE succeeded"
                    );
                }
                Err(delete_err) => {
                    tracing::error!(
                        submission_id = submission.id,
                        error = %delete_err,
                        "Compensation DELETE also failed — orphaned submission may need manual cleanup"
                    );
                }
            }
            return Err(e);
        }

        Ok(submission)
    }

    async fn is_language_enabled(&self, language: &str) -> Result<bool> {
        let row = sqlx::query(
            r#"
            INSERT INTO judge_language_settings (id, c_enabled, cpp_enabled)
            VALUES (TRUE, FALSE, FALSE)
            ON CONFLICT (id) DO NOTHING
            RETURNING c_enabled, cpp_enabled
            "#,
        )
        .fetch_optional(&self.pool)
        .await?;

        let (c_enabled, cpp_enabled) = if let Some(row) = row {
            (
                row.get::<bool, _>("c_enabled"),
                row.get::<bool, _>("cpp_enabled"),
            )
        } else {
            let row = sqlx::query(
                "SELECT c_enabled, cpp_enabled FROM judge_language_settings WHERE id = TRUE",
            )
            .fetch_one(&self.pool)
            .await?;
            (
                row.get::<bool, _>("c_enabled"),
                row.get::<bool, _>("cpp_enabled"),
            )
        };

        Ok(match language {
            "python3" => true,
            "c" => c_enabled,
            "cpp" => cpp_enabled,
            _ => false,
        })
    }

    pub async fn get_submission(
        &self,
        submission_id: i64,
        user_id: Uuid,
    ) -> Result<SubmissionResponse> {
        let submission = sqlx::query(
            r#"
            SELECT
                s.id,
                s.user_id,
                s.problem_id,
                p.title as problem_title,
                u.username,
                s.code,
                s.language,
                COALESCE(
                    CASE s.verdict
                        WHEN 'ac' THEN 'accepted'
                        WHEN 'wa' THEN 'wrong_answer'
                        WHEN 'rte' THEN 'runtime_error'
                        WHEN 'tle' THEN 'time_limit_exceeded'
                        WHEN 'mle' THEN 'memory_limit_exceeded'
                        WHEN 'ce' THEN 'compile_error'
                        WHEN 'ie' THEN 'system_error'
                        ELSE NULL
                    END,
                    s.status
                ) as status,
                s.score,
                s.time_ms as runtime_ms,
                s.memory_kb,
                s.created_at,
                s.updated_at
            FROM submissions s
            JOIN problems p ON p.id = s.problem_id
            JOIN users u ON u.id = s.user_id
            WHERE s.id = $1 AND s.user_id = $2
            "#,
        )
        .bind(submission_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Submission not found"))?;

        // Get test case results
        let test_cases = sqlx::query(
            r#"
            SELECT
                tcr.id,
                CASE tcr.verdict
                    WHEN 'ac' THEN 'passed'
                    WHEN 'wa' THEN 'failed'
                    WHEN 'rte' THEN 'failed'
                    WHEN 'tle' THEN 'failed'
                    WHEN 'mle' THEN 'failed'
                    WHEN 'ole' THEN 'failed'
                    WHEN 'ce' THEN 'failed'
                    WHEN 'ie' THEN 'failed'
                    ELSE 'pending'
                END as status,
                CASE WHEN NOT tc.is_secret THEN tc.input ELSE NULL END as input,
                CASE
                    WHEN NOT tc.is_secret THEN COALESCE(tcr.expected_output, tc.output)
                    ELSE NULL
                END as expected_output,
                CASE WHEN NOT tc.is_secret THEN tcr.actual_output ELSE NULL END as actual_output,
                tcr.error_message,
                tc.is_secret as is_hidden,
                tcr.time_ms as runtime_ms,
                tcr.memory_kb
            FROM test_case_results tcr
            JOIN test_cases tc ON tc.id = tcr.test_case_id
            WHERE tcr.submission_id = $1
            ORDER BY tc.order_index ASC, tcr.id ASC
            "#,
        )
        .bind(submission_id)
        .fetch_all(&self.pool)
        .await?;

        let test_case_results = test_cases
            .into_iter()
            .map(|tc| TestCaseResult {
                id: tc.get("id"),
                status: tc.get("status"),
                input: tc.get("input"),
                expected_output: tc.get("expected_output"),
                actual_output: tc.get("actual_output"),
                error_message: tc.get("error_message"),
                is_hidden: tc.get("is_hidden"),
                runtime_ms: tc.get("runtime_ms"),
                memory_kb: tc.get("memory_kb"),
            })
            .collect();

        Ok(SubmissionResponse {
            id: submission.get("id"),
            user_id: submission.get("user_id"),
            problem_id: submission.get("problem_id"),
            problem_title: submission.get("problem_title"),
            username: submission.get("username"),
            code: submission.get("code"),
            language: submission.get("language"),
            status: submission.get("status"),
            score: submission.get("score"),
            runtime_ms: submission.get("runtime_ms"),
            memory_kb: submission.get("memory_kb"),
            test_cases: test_case_results,
            created_at: submission.get("created_at"),
            updated_at: submission.get("updated_at"),
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
        let verdict_filter = status.as_deref().and_then(map_verdict);
        let status_filter = if verdict_filter.is_some() {
            None
        } else {
            status.as_deref()
        };

        let mut query = String::from(
            r#"
            SELECT
                id,
                user_id,
                problem_id,
                code,
                language,
                COALESCE(
                    CASE verdict
                        WHEN 'ac' THEN 'accepted'
                        WHEN 'wa' THEN 'wrong_answer'
                        WHEN 'rte' THEN 'runtime_error'
                        WHEN 'tle' THEN 'time_limit_exceeded'
                        WHEN 'mle' THEN 'memory_limit_exceeded'
                        WHEN 'ce' THEN 'compile_error'
                        WHEN 'ie' THEN 'system_error'
                        ELSE NULL
                    END,
                    status
                ) as status,
                score,
                time_ms as runtime_ms,
                memory_kb,
                created_at,
                updated_at
            FROM submissions
            WHERE user_id = $1
            "#,
        );
        let mut count_query = String::from("SELECT COUNT(*) FROM submissions WHERE user_id = $1");

        let mut param_count = 1;
        let mut conditions = vec![];

        if let Some(_problem_id) = problem_id {
            param_count += 1;
            conditions.push(format!(" AND problem_id = ${}", param_count));
        }

        if let Some(_status) = status_filter {
            param_count += 1;
            conditions.push(format!(" AND status = ${}", param_count));
        }

        if let Some(_verdict) = verdict_filter {
            param_count += 1;
            conditions.push(format!(" AND verdict = ${}", param_count));
        }

        if let Some(_language) = &language {
            param_count += 1;
            conditions.push(format!(" AND language = ${}", param_count));
        }

        let condition_str = conditions.join("");
        query.push_str(&condition_str);
        count_query.push_str(&condition_str);

        param_count += 1;
        let limit_param = param_count;
        param_count += 1;
        let offset_param = param_count;
        query.push_str(&format!(
            " ORDER BY created_at DESC LIMIT ${} OFFSET ${}",
            limit_param, offset_param
        ));

        // Execute count query (must bind the same filter parameters as the main query)
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query);
        count_builder = count_builder.bind(user_id);
        if let Some(problem_id) = problem_id {
            count_builder = count_builder.bind(problem_id);
        }
        if let Some(status) = status_filter {
            count_builder = count_builder.bind(status);
        }
        if let Some(verdict) = verdict_filter {
            count_builder = count_builder.bind(verdict);
        }
        if let Some(language) = &language {
            count_builder = count_builder.bind(language);
        }
        let total: i64 = count_builder.fetch_one(&self.pool).await?;

        // Execute main query with parameters
        let mut query_builder = sqlx::query_as::<_, Submission>(&query);
        query_builder = query_builder.bind(user_id);

        if let Some(problem_id) = problem_id {
            query_builder = query_builder.bind(problem_id);
        }
        if let Some(status) = status_filter {
            query_builder = query_builder.bind(status);
        }
        if let Some(verdict) = verdict_filter {
            query_builder = query_builder.bind(verdict);
        }
        if let Some(language) = &language {
            query_builder = query_builder.bind(language);
        }

        query_builder = query_builder.bind(limit).bind(offset);

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

    #[allow(clippy::too_many_arguments)]
    async fn queue_for_judging(
        &self,
        submission_id: i64,
        problem_id: i64,
        user_id: Uuid,
        school_id: i64,
        code: &str,
        language: &str,
        contest_id: Option<i64>,
    ) -> Result<()> {
        // Update status to "queued"
        sqlx::query("UPDATE submissions SET status = 'queued', updated_at = NOW() WHERE id = $1")
            .bind(submission_id)
            .execute(&self.pool)
            .await?;

        // If Redis is configured, send to queue
        if let Some(redis_pool) = &self.redis_pool {
            // Fetch problem limits
            let problem = sqlx::query_as::<_, (i32, i32)>(
                "SELECT time_limit_ms, memory_limit_kb FROM problems WHERE id = $1",
            )
            .bind(problem_id)
            .fetch_optional(&self.pool)
            .await?;

            if let Some((time_limit_ms, memory_limit_kb)) = problem {
                let message = SubmissionMessage {
                    submission_id,
                    problem_id,
                    user_id,
                    language: language.to_string(),
                    source_code: code.to_string(),
                    time_limit_ms: time_limit_ms as u64,
                    memory_limit_mb: ((memory_limit_kb as u64) / 1024).max(1),
                    contest_id,
                };

                // Determine target stream based on contest_id, participant registration, and tenant ownership (T-09-03, T-09-06-01, T-09-06-02)
                let stream_name = match contest_id {
                    Some(cid) => {
                        let contest_active_result = sqlx::query_scalar::<_, bool>(
                            "SELECT EXISTS(
                                SELECT 1 FROM contest_participants cp
                                JOIN contests c ON c.id = cp.contest_id
                                WHERE cp.contest_id = $1
                                  AND cp.user_id = $2
                                  AND c.organization_id = $3
                                  AND c.start_time <= NOW()
                                  AND c.end_time >= NOW()
                            )",
                        )
                        .bind(cid)
                        .bind(user_id)
                        .bind(school_id)
                        .fetch_one(&self.pool)
                        .await;
                        let contest_active = match contest_active_result {
                            Ok(active) => active,
                            Err(err) => {
                                tracing::warn!(
                                    "Contest status check failed for contest_id={}: {}. Rejecting submission",
                                    cid, err
                                );
                                sqlx::query(
                                    "UPDATE submissions SET status = 'pending', updated_at = NOW() WHERE id = $1",
                                )
                                .bind(submission_id)
                                .execute(&self.pool)
                                .await?;
                                return Err(anyhow::anyhow!(
                                    "Contest {} validation failed: {}",
                                    cid,
                                    err
                                ));
                            }
                        };

                        match resolve_queue_stream_name(Some(cid), contest_active) {
                            Ok(stream) => stream,
                            Err(err) => {
                                sqlx::query(
                                    "UPDATE submissions SET status = 'pending', updated_at = NOW() WHERE id = $1",
                                )
                                .bind(submission_id)
                                .execute(&self.pool)
                                .await?;
                                return Err(err);
                            }
                        }
                    }
                    None => resolve_queue_stream_name(None, true)?,
                };

                match queue::queue_submission(redis_pool, &message, stream_name, school_id).await {
                    Ok(message_id) => {
                        tracing::info!(
                            "Submission {} queued with message ID {}",
                            submission_id,
                            message_id
                        );
                    }
                    Err(e) => {
                        tracing::error!("Failed to queue submission {}: {}", submission_id, e);
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
                sqlx::query(
                    "UPDATE submissions SET status = 'pending', updated_at = NOW() WHERE id = $1",
                )
                .bind(submission_id)
                .execute(&self.pool)
                .await?;
                return Err(anyhow::anyhow!(
                    "Problem {} was not found while queueing submission {}",
                    problem_id,
                    submission_id
                ));
            }
        } else {
            // In test / no-Redis mode we keep the submission as queued and return success.
            // The caller can still inspect or update the row synchronously.
            tracing::debug!(
                "Redis is not configured; leaving submission {} in queued state",
                submission_id
            );
            return Ok(());
        }

        Ok(())
    }

    /// Get current submission status (for state machine validation)
    pub async fn get_submission_status(&self, submission_id: i64) -> Result<Option<String>> {
        let row =
            sqlx::query_scalar::<_, Option<String>>("SELECT status FROM submissions WHERE id = $1")
                .bind(submission_id)
                .fetch_optional(&self.pool)
                .await?
                .flatten();

        Ok(row)
    }

    /// Check if a status is terminal (cannot be overwritten)
    pub fn is_terminal_status(status: &str) -> bool {
        matches!(
            status,
            "accepted"
                | "wrong_answer"
                | "runtime_error"
                | "compile_error"
                | "compilation_error"
                | "time_limit_exceeded"
                | "memory_limit_exceeded"
                | "system_error"
                | "judged"
                | "failed"
        )
    }

    /// Normalize judge-worker result status into the status persisted on submissions.
    pub fn normalize_judge_status(status: &str) -> &str {
        match status {
            "accepted"
            | "wrong_answer"
            | "runtime_error"
            | "time_limit_exceeded"
            | "memory_limit_exceeded"
            | "compile_error"
            | "compilation_error" => "judged",
            "failed" => "failed",
            _ => status,
        }
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
             SET status = $1, verdict = $2, score = $3, time_ms = $4, memory_kb = $5, updated_at = NOW()
             WHERE id = $6",
        )
        .bind(Self::normalize_judge_status(status))
        .bind(map_verdict(status))
        .bind(score)
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
    #[allow(clippy::too_many_arguments)]
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
        let verdict = map_verdict(status)
            .ok_or_else(|| anyhow::anyhow!("Unsupported test case status: {}", status))?;
        let result_id = sqlx::query_scalar::<_, i64>(
            r#"
            INSERT INTO test_case_results (
                submission_id, test_case_id, verdict, expected_output, actual_output, error_message, time_ms, memory_kb
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (submission_id, test_case_id)
            DO UPDATE SET
                verdict = EXCLUDED.verdict,
                expected_output = EXCLUDED.expected_output,
                actual_output = EXCLUDED.actual_output,
                error_message = EXCLUDED.error_message,
                time_ms = EXCLUDED.time_ms,
                memory_kb = EXCLUDED.memory_kb
            RETURNING id
            "#,
        )
        .bind(submission_id)
        .bind(test_case_id)
        .bind(verdict)
        .bind(expected_output)
        .bind(actual_output)
        .bind(error_message)
        .bind(runtime_ms)
        .bind(memory_kb)
        .fetch_one(&self.pool)
        .await?;

        Ok(result_id)
    }

    /// Transactional judge result update: acquires a row-level lock on the submission,
    /// validates the state transition, updates the submission row, and inserts all
    /// test case results — all within a single database transaction so that concurrent
    /// callbacks for the same submission are serialized.
    ///
    /// On `Err`, the transaction is rolled back automatically (sqlx drops the `Transaction`).
    pub async fn update_judge_result_transactional(
        &self,
        submission_id: i64,
        status: &str,
        score: Option<i32>,
        runtime_ms: Option<i32>,
        memory_kb: Option<i32>,
        test_case_results: &[TestCaseResultInput],
    ) -> Result<JudgeUpdateOutcome, JudgeUpdateError> {
        let mut tx = self.pool.begin().await?;

        // 1. Lock the submission row and read current status.
        let current_status: Option<String> =
            sqlx::query_scalar("SELECT status FROM submissions WHERE id = $1 FOR UPDATE")
                .bind(submission_id)
                .fetch_optional(&mut *tx)
                .await?
                .flatten();

        let current_status = current_status.ok_or(JudgeUpdateError::NotFound)?;

        let target_status = Self::normalize_judge_status(status);

        // 2. Idempotency: duplicate callback with same normalized status → no-op.
        if current_status.eq_ignore_ascii_case(target_status) {
            // Drop tx (rollback) — no changes needed.
            return Ok(JudgeUpdateOutcome::AlreadyProcessed);
        }

        // 3. Terminal states cannot be overwritten.
        if Self::is_terminal_status(&current_status) {
            return Err(JudgeUpdateError::TerminalState { current_status });
        }

        // 4. Only allow valid transitions: pending/queued/judging → terminal.
        let is_valid_transition =
            matches!(current_status.as_str(), "pending" | "queued" | "judging");
        if !is_valid_transition {
            return Err(JudgeUpdateError::InvalidTransition {
                current_status,
                target_status: target_status.to_string(),
            });
        }

        // 5. Update submission row.
        sqlx::query(
            "UPDATE submissions
             SET status = $1, verdict = $2, score = $3, time_ms = $4, memory_kb = $5, updated_at = NOW()
             WHERE id = $6",
        )
        .bind(Self::normalize_judge_status(status))
        .bind(map_verdict(status))
        .bind(score)
        .bind(runtime_ms)
        .bind(memory_kb)
        .bind(submission_id)
        .execute(&mut *tx)
        .await?;

        // 6. Insert test case results within the same transaction.
        for tc in test_case_results {
            let verdict =
                map_verdict(&tc.status).ok_or_else(|| JudgeUpdateError::InvalidTestCaseStatus {
                    status: tc.status.clone(),
                })?;

            sqlx::query(
                r#"
                INSERT INTO test_case_results (
                    submission_id, test_case_id, verdict, expected_output, actual_output, error_message, time_ms, memory_kb
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (submission_id, test_case_id)
                DO UPDATE SET
                    verdict = EXCLUDED.verdict,
                    expected_output = EXCLUDED.expected_output,
                    actual_output = EXCLUDED.actual_output,
                    error_message = EXCLUDED.error_message,
                    time_ms = EXCLUDED.time_ms,
                    memory_kb = EXCLUDED.memory_kb
                "#,
            )
            .bind(submission_id)
            .bind(tc.test_case_id)
            .bind(verdict)
            .bind(&tc.expected_output)
            .bind(&tc.actual_output)
            .bind(&tc.error_message)
            .bind(tc.runtime_ms)
            .bind(tc.memory_kb)
            .execute(&mut *tx)
            .await?;
        }

        // 7. Commit.
        tx.commit().await?;

        tracing::info!(
            submission_id,
            status,
            test_case_count = test_case_results.len(),
            "Transactionally updated judge result"
        );

        Ok(JudgeUpdateOutcome::Updated)
    }
}

fn resolve_queue_stream_name(
    contest_id: Option<i64>,
    contest_active: bool,
) -> Result<&'static str> {
    match contest_id {
        Some(_cid) if contest_active => Ok("submissions:contest"),
        Some(cid) => Err(anyhow::anyhow!(
            "Contest {} is not active or the user is not a participant",
            cid
        )),
        None => Ok("submissions"),
    }
}

fn map_verdict(status: &str) -> Option<&'static str> {
    match status {
        "accepted" => Some("ac"),
        "wrong_answer" => Some("wa"),
        "runtime_error" => Some("rte"),
        "time_limit_exceeded" => Some("tle"),
        "memory_limit_exceeded" => Some("mle"),
        "compile_error" | "compilation_error" => Some("ce"),
        "system_error" | "failed" => Some("ie"),
        _ => None,
    }
}

fn normalize_submission_language(language: &str) -> Option<&'static str> {
    match language {
        "python" | "python3" => Some("python3"),
        "c" => Some("c"),
        "cpp" | "c++" => Some("cpp"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_queue_stream_name_allows_plain_submissions() {
        assert_eq!(
            resolve_queue_stream_name(None, true).unwrap(),
            "submissions"
        );
    }

    #[test]
    fn resolve_queue_stream_name_allows_active_contests() {
        assert_eq!(
            resolve_queue_stream_name(Some(42), true).unwrap(),
            "submissions:contest"
        );
    }

    #[test]
    fn resolve_queue_stream_name_rejects_inactive_or_inaccessible_contests() {
        assert!(resolve_queue_stream_name(Some(42), false).is_err());
    }
}
