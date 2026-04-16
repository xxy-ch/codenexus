use crate::models::*;
use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

pub struct ContestService {
    pool: PgPool,
}

impl ContestService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// List contests with filtering and pagination
    pub async fn list_contests(
        &self,
        organization_id: Option<i64>,
        campus_id: Option<i64>,
        active: Option<bool>,
        page: i64,
        limit: i64,
    ) -> Result<(Vec<Contest>, i64)> {
        let offset = (page - 1) * limit;

        // Build dynamic query
        let mut base_query = "SELECT * FROM contests WHERE 1=1".to_string();
        let mut count_query = "SELECT COUNT(*) FROM contests WHERE 1=1".to_string();
        let mut conditions = Vec::new();
        let mut param_count = 0;

        if let Some(_org_id) = organization_id {
            param_count += 1;
            conditions.push(format!(" AND organization_id = ${}", param_count));
        }

        if let Some(_campus) = campus_id {
            param_count += 1;
            conditions.push(format!(" AND campus_id = ${}", param_count));
        }

        if let Some(is_active) = active {
            if is_active {
                conditions.push(" AND start_time <= NOW() AND end_time >= NOW()".to_string());
            } else {
                conditions.push(" AND (end_time < NOW() OR start_time > NOW())".to_string());
            }
        }

        let conditions_str = conditions.join("");
        base_query.push_str(&conditions_str);
        count_query.push_str(&conditions_str);

        base_query.push_str(&format!(
            " ORDER BY start_time DESC LIMIT {} OFFSET {}",
            limit, offset
        ));

        // Execute count
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query);
        if let Some(org_id) = organization_id {
            count_builder = count_builder.bind(org_id);
        }
        if let Some(campus) = campus_id {
            count_builder = count_builder.bind(campus);
        }
        let total = count_builder.fetch_one(&self.pool).await?;

        // Execute main query
        let mut query_builder = sqlx::query_as::<_, Contest>(&base_query);
        if let Some(org_id) = organization_id {
            query_builder = query_builder.bind(org_id);
        }
        if let Some(campus) = campus_id {
            query_builder = query_builder.bind(campus);
        }
        let contests = query_builder.fetch_all(&self.pool).await?;

        Ok((contests, total))
    }

    /// Get contest by ID with details
    pub async fn get_contest(&self, contest_id: i64) -> Result<ContestDetail> {
        let contest = sqlx::query_as::<_, Contest>("SELECT * FROM contests WHERE id = $1")
            .bind(contest_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Contest not found"))?;

        // Get problem count
        let problem_count: i64 = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM contest_problems WHERE contest_id = $1",
        )
        .bind(contest_id)
        .fetch_one(&self.pool)
        .await?;

        // Get participant count (unique users who submitted)
        let participant_count: i64 = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(DISTINCT s.user_id)
             FROM contest_submissions cs
             JOIN submissions s ON s.id = cs.submission_id
             WHERE cs.contest_id = $1",
        )
        .bind(contest_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(ContestDetail {
            id: contest.id,
            organization_id: contest.organization_id,
            campus_id: contest.campus_id,
            name: contest.name,
            description: contest.description,
            rules: contest.rules,
            start_time: contest.start_time,
            end_time: contest.end_time,
            freeze_minutes: contest.freeze_minutes,
            created_at: contest.created_at,
            updated_at: contest.updated_at,
            problem_count,
            participant_count,
        })
    }

    /// Create a new contest
    pub async fn create_contest(&self, req: CreateContestRequest) -> Result<Contest> {
        let contest = sqlx::query_as::<_, Contest>(
            r#"
            INSERT INTO contests (
                organization_id, campus_id, name, description, rules,
                start_time, end_time, freeze_minutes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(req.organization_id)
        .bind(req.campus_id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(req.rules.unwrap_or_else(|| "acm".to_string()))
        .bind(req.start_time)
        .bind(req.end_time)
        .bind(req.freeze_minutes)
        .fetch_one(&self.pool)
        .await?;

        Ok(contest)
    }

    /// Update a contest
    pub async fn update_contest(
        &self,
        contest_id: i64,
        req: UpdateContestRequest,
    ) -> Result<Contest> {
        let contest = sqlx::query_as::<_, Contest>(
            r#"
            UPDATE contests
            SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                rules = COALESCE($3, rules),
                start_time = COALESCE($4, start_time),
                end_time = COALESCE($5, end_time),
                freeze_minutes = COALESCE($6, freeze_minutes),
                updated_at = NOW()
            WHERE id = $7
            RETURNING *
            "#,
        )
        .bind(req.name)
        .bind(req.description)
        .bind(req.rules)
        .bind(req.start_time)
        .bind(req.end_time)
        .bind(req.freeze_minutes)
        .bind(contest_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Contest not found"))?;

        Ok(contest)
    }

    /// Delete a contest
    pub async fn delete_contest(&self, contest_id: i64) -> Result<()> {
        let result = sqlx::query("DELETE FROM contests WHERE id = $1")
            .bind(contest_id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(anyhow::anyhow!("Contest not found"));
        }

        Ok(())
    }

    /// Add problem to contest
    pub async fn add_problem_to_contest(
        &self,
        contest_id: i64,
        req: AddProblemToContestRequest,
    ) -> Result<ContestProblem> {
        let contest_problem = sqlx::query_as::<_, ContestProblem>(
            r#"
            INSERT INTO contest_problems (contest_id, problem_id, points, order_index)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (contest_id, problem_id)
            DO UPDATE SET
                points = EXCLUDED.points,
                order_index = EXCLUDED.order_index
            RETURNING *
            "#,
        )
        .bind(contest_id)
        .bind(req.problem_id)
        .bind(req.points.unwrap_or(100))
        .bind(req.order_index.unwrap_or(0))
        .fetch_one(&self.pool)
        .await?;

        Ok(contest_problem)
    }

    /// Get contest problems
    pub async fn get_contest_problems(&self, contest_id: i64) -> Result<Vec<ContestProblemDetail>> {
        let problems = sqlx::query_as::<_, ContestProblemDetail>(
            r#"
            SELECT
                cp.id,
                cp.problem_id,
                p.title,
                p.difficulty,
                cp.points,
                cp.order_index
            FROM contest_problems cp
            JOIN problems p ON p.id = cp.problem_id
            WHERE cp.contest_id = $1
            ORDER BY cp.order_index ASC, cp.id ASC
            "#,
        )
        .bind(contest_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(problems)
    }

    /// Remove problem from contest
    pub async fn remove_problem_from_contest(
        &self,
        contest_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        let result =
            sqlx::query("DELETE FROM contest_problems WHERE contest_id = $1 AND problem_id = $2")
                .bind(contest_id)
                .bind(problem_id)
                .execute(&self.pool)
                .await?;

        if result.rows_affected() == 0 {
            return Err(anyhow::anyhow!("Problem not found in contest"));
        }

        Ok(())
    }

    /// Get contest standings/rankings with ACM scoring.
    /// Per CONT-01: During freeze window, returns cached snapshot (lazy compute on first request).
    /// After contest ends, auto-unfreezes and returns live rankings.
    pub async fn get_contest_rankings(&self, contest_id: i64) -> Result<Vec<ContestRankingEntry>> {
        let contest = sqlx::query_as::<_, Contest>("SELECT * FROM contests WHERE id = $1")
            .bind(contest_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Contest not found"))?;

        let now = chrono::Utc::now();

        // Per D-03: Freeze is active only during the freeze window, NOT after contest ends
        let is_frozen = contest.freeze_minutes.is_some()
            && (contest.end_time
                - chrono::Duration::minutes(contest.freeze_minutes.unwrap() as i64))
                < now
            && now < contest.end_time;

        if is_frozen {
            // Per D-03: Lazy compute -- check for existing snapshot first
            if let Some(snapshot) = self.get_frozen_snapshot(contest_id).await? {
                return Ok(snapshot);
            }

            // No snapshot yet -- compute rankings up to freeze cutoff and store
            let freeze_cutoff = contest.end_time
                - chrono::Duration::minutes(contest.freeze_minutes.unwrap() as i64);
            let rankings = self.compute_rankings(contest_id, freeze_cutoff).await?;
            self.store_frozen_snapshot(contest_id, &rankings).await?;
            return Ok(rankings);
        }

        // Not frozen -- compute live rankings (includes all submissions)
        self.compute_rankings(contest_id, now).await
    }

    /// Compute contest rankings using ACM scoring, only counting submissions before cutoff.
    /// Per D-04: Excludes upsolving submissions from official rankings.
    async fn compute_rankings(
        &self,
        contest_id: i64,
        submissions_cutoff: chrono::DateTime<chrono::Utc>,
    ) -> Result<Vec<ContestRankingEntry>> {
        // Get all participants (users who submitted in this contest)
        // Per D-04: Filter out upsolving submissions
        let participants = sqlx::query_as::<_, (Uuid, String)>(
            r#"
            SELECT DISTINCT u.id, u.username
            FROM contest_submissions cs
            JOIN submissions s ON s.id = cs.submission_id
            JOIN users u ON u.id = s.user_id
            WHERE cs.contest_id = $1
              AND s.created_at < $2
              AND NOT cs.is_upsolving
            ORDER BY u.username
            "#,
        )
        .bind(contest_id)
        .bind(submissions_cutoff)
        .fetch_all(&self.pool)
        .await?;

        let mut rankings = Vec::new();

        for (user_id, username) in participants {
            // Get problem submissions for this user in this contest
            let problem_submissions = sqlx::query_as::<_, ProblemSubmission>(
                r#"
                WITH user_submissions AS (
                    SELECT
                        cp.problem_id,
                        p.title,
                        s.verdict,
                        s.created_at,
                        cp.points,
                        ROW_NUMBER() OVER (PARTITION BY cp.problem_id ORDER BY s.created_at ASC) as attempt_number
                    FROM contest_submissions cs
                    JOIN submissions s ON s.id = cs.submission_id
                    JOIN contest_problems cp ON cp.contest_id = cs.contest_id AND cp.problem_id = s.problem_id
                    JOIN problems p ON p.id = cp.problem_id
                    WHERE cs.contest_id = $1 AND s.user_id = $2 AND s.created_at < $3
                      AND NOT cs.is_upsolving
                ),
                first_ac AS (
                    SELECT
                        problem_id,
                        title,
                        created_at,
                        points,
                        attempt_number
                    FROM user_submissions
                    WHERE verdict = 'ac'
                ),
                submission_stats AS (
                    SELECT
                        us.problem_id,
                        us.title,
                        us.points,
                        COUNT(*)::int as attempts,
                        fa.created_at as first_solved_at,
                        fa.attempt_number as successful_attempt
                    FROM user_submissions us
                    LEFT JOIN first_ac fa ON fa.problem_id = us.problem_id
                    GROUP BY us.problem_id, us.title, us.points, fa.created_at, fa.attempt_number
                )
                SELECT
                    problem_id,
                    title as problem_title,
                    COALESCE(points, 0) as score,
                    COALESCE(attempts, 0) as attempts,
                    COALESCE(
                        GREATEST(0, CASE
                            WHEN first_solved_at IS NOT NULL THEN
                                EXTRACT(EPOCH FROM (first_solved_at - (
                                    SELECT start_time FROM contests WHERE id = $1
                                ))) / 60 + ((successful_attempt - 1) * 20)
                            ELSE 0
                        END), 0
                    )::int as time_penalty,
                    first_solved_at
                FROM submission_stats
                ORDER BY problem_id
                "#
            )
            .bind(contest_id)
            .bind(user_id)
            .bind(submissions_cutoff)
            .fetch_all(&self.pool)
            .await?;

            // Calculate score and penalty for ACM rules
            let solved_count = problem_submissions.iter().filter(|p| p.score > 0).count() as i32;

            let total_score: i32 = problem_submissions.iter().map(|p| p.score).sum();

            let total_penalty: i32 = problem_submissions.iter().map(|p| p.time_penalty).sum();

            rankings.push(ContestRankingEntry {
                user_id,
                username,
                score: total_score,
                penalty: total_penalty,
                solved_count,
                submissions: problem_submissions,
            });
        }

        // Sort by ACM rules: solved count DESC, penalty ASC, last AC time DESC
        rankings.sort_by(|a, b| {
            b.solved_count
                .cmp(&a.solved_count)
                .then_with(|| a.penalty.cmp(&b.penalty))
                .then_with(|| {
                    let a_last_ac = a.submissions.iter().filter_map(|p| p.first_solved_at).max();
                    let b_last_ac = b.submissions.iter().filter_map(|p| p.first_solved_at).max();
                    b_last_ac.cmp(&a_last_ac)
                })
        });

        Ok(rankings)
    }

    /// Store a frozen leaderboard snapshot.
    /// Per D-03: Uses INSERT ... ON CONFLICT DO UPDATE for idempotency.
    async fn store_frozen_snapshot(
        &self,
        contest_id: i64,
        rankings: &[ContestRankingEntry],
    ) -> Result<()> {
        let snapshot_json = serde_json::to_value(rankings)?;
        sqlx::query(
            r#"
            INSERT INTO contest_leaderboard_snapshots (contest_id, snapshot_data, frozen_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (contest_id) DO UPDATE SET snapshot_data = $2, frozen_at = NOW()
            "#,
        )
        .bind(contest_id)
        .bind(&snapshot_json)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Retrieve the frozen leaderboard snapshot if one exists.
    async fn get_frozen_snapshot(
        &self,
        contest_id: i64,
    ) -> Result<Option<Vec<ContestRankingEntry>>> {
        let row: Option<ContestLeaderboardSnapshot> =
            sqlx::query_as::<_, ContestLeaderboardSnapshot>(
                "SELECT * FROM contest_leaderboard_snapshots WHERE contest_id = $1",
            )
            .bind(contest_id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(snapshot) => {
                let rankings: Vec<ContestRankingEntry> =
                    serde_json::from_value(snapshot.snapshot_data)?;
                Ok(Some(rankings))
            }
            None => Ok(None),
        }
    }

    /// Register user for contest
    pub async fn register_for_contest(
        &self,
        contest_id: i64,
        user_id: Uuid,
    ) -> Result<ContestParticipant> {
        // Check if contest exists
        let _contest = sqlx::query_as::<_, Contest>("SELECT * FROM contests WHERE id = $1")
            .bind(contest_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Contest not found"))?;

        // Check if already registered
        let existing = sqlx::query_as::<_, ContestParticipant>(
            "SELECT * FROM contest_participants WHERE contest_id = $1 AND user_id = $2",
        )
        .bind(contest_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        if existing.is_some() {
            return Err(anyhow::anyhow!("Already registered for this contest"));
        }

        // Register user
        let participant = sqlx::query_as::<_, ContestParticipant>(
            r#"
            INSERT INTO contest_participants (contest_id, user_id)
            VALUES ($1, $2)
            RETURNING *
            "#,
        )
        .bind(contest_id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(participant)
    }

    /// Get contest status
    pub async fn get_contest_status(&self, contest_id: i64) -> Result<ContestStatus> {
        let contest = sqlx::query_as::<_, Contest>("SELECT * FROM contests WHERE id = $1")
            .bind(contest_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Contest not found"))?;

        let now = chrono::Utc::now();
        let status = if now < contest.start_time {
            "upcoming".to_string()
        } else if now >= contest.start_time && now <= contest.end_time {
            "active".to_string()
        } else {
            "ended".to_string()
        };

        let time_until_start = if now < contest.start_time {
            Some((contest.start_time - now).num_seconds())
        } else {
            None
        };

        let time_until_end = if now < contest.end_time {
            Some((contest.end_time - now).num_seconds())
        } else {
            None
        };

        let is_frozen = if contest.freeze_minutes.is_some() {
            let freeze_time = contest.end_time
                - chrono::Duration::minutes(contest.freeze_minutes.unwrap() as i64);
            now >= freeze_time && now <= contest.end_time
        } else {
            false
        };

        Ok(ContestStatus {
            status,
            time_until_start,
            time_until_end,
            is_frozen,
        })
    }

    /// Get contest participants
    pub async fn get_contest_participants(
        &self,
        contest_id: i64,
    ) -> Result<Vec<ContestParticipant>> {
        let participants = sqlx::query_as::<_, ContestParticipant>(
            r#"
            SELECT cp.*
            FROM contest_participants cp
            WHERE cp.contest_id = $1
            ORDER BY cp.registered_at ASC
            "#,
        )
        .bind(contest_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(participants)
    }

    /// Link submission to contest.
    /// Per D-04: Allows post-contest submissions with is_upsolving=true.
    /// Blocks pre-contest submissions.
    pub async fn link_submission_to_contest(
        &self,
        contest_id: i64,
        submission_id: i64,
    ) -> Result<ContestSubmission> {
        // Verify contest exists
        let contest = sqlx::query_as::<_, Contest>("SELECT * FROM contests WHERE id = $1")
            .bind(contest_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Contest not found"))?;

        let now = chrono::Utc::now();
        // Per D-04: Allow post-contest submissions (upsolving), block pre-contest
        if now < contest.start_time {
            return Err(anyhow::anyhow!("Contest has not started yet"));
        }


        // Check if problem is in contest and get submission creation time
        let submission_info: (i64, chrono::DateTime<chrono::Utc>) =
            sqlx::query_as("SELECT problem_id, created_at FROM submissions WHERE id = $1")
                .bind(submission_id)
                .fetch_optional(&self.pool)
                .await?
                .ok_or_else(|| anyhow::anyhow!("Submission not found"))?;

        // Per Codex review: use submission's created_at (not link-time "now")
        // to avoid mis-tagging contest-time submissions linked post-contest as upsolving.
        let is_upsolving = submission_info.1 > contest.end_time;

        let _problem_in_contest: (i64,) = sqlx::query_as(
            "SELECT problem_id FROM contest_problems WHERE contest_id = $1 AND problem_id = $2",
        )
        .bind(contest_id)
        .bind(submission_info.0)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Problem not in contest"))?;

        // Link submission with upsolving flag (idempotent: upsert returns existing row on conflict)
        let contest_submission = sqlx::query_as::<_, ContestSubmission>(
            r#"
            INSERT INTO contest_submissions (contest_id, submission_id, is_upsolving)
            VALUES ($1, $2, $3)
            ON CONFLICT (contest_id, submission_id)
            DO UPDATE SET is_upsolving = EXCLUDED.is_upsolving
            RETURNING *
            "#,
        )
        .bind(contest_id)
        .bind(submission_id)
        .bind(is_upsolving)
        .fetch_one(&self.pool)
        .await?;

        Ok(contest_submission)
    }
}
