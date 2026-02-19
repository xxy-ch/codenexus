use super::models::*;
use crate::AppState;
use anyhow::Result;
use redis::AsyncCommands;
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};

pub struct LeaderboardService {
    pool: PgPool,
    redis_client: redis::Client,
}

impl LeaderboardService {
    pub fn new(pool: PgPool, redis_url: &str) -> Result<Self> {
        let redis_client = redis::Client::open(redis_url)?;
        Ok(Self { pool, redis_client })
    }

    /// Get global leaderboard
    pub async fn get_global_leaderboard(
        &self,
        query: LeaderboardQuery,
    ) -> Result<LeaderboardResponse> {
        let limit = query.limit.unwrap_or(100).min(1000);
        let offset = query.offset.unwrap_or(0);

        // Try to get from Redis cache first
        let cache_key = format!("leaderboard:global:{}:{}", limit, offset);
        if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await {
            let cached: Result<String, _> = conn.get(&cache_key).await;
            if let Ok(cached) = cached {
                if let Ok(entries) = serde_json::from_str::<Vec<LeaderboardEntry>>(&cached) {
                    return Ok(LeaderboardResponse {
                        total: entries.len() as i64,
                        entries,
                        limit,
                        offset,
                        timeframe: query.timeframe.unwrap_or_else(|| "all".to_string()),
                    });
                }
            }
        }

        // Build query with timeframe filter
        let time_filter = match query.timeframe.as_deref() {
            Some("week") => "AND s.created_at >= NOW() - INTERVAL '7 days'",
            Some("month") => "AND s.created_at >= NOW() - INTERVAL '30 days'",
            Some("year") => "AND s.created_at >= NOW() - INTERVAL '365 days'",
            _ => "",
        };

        let min_problems_filter = query.min_problems.unwrap_or(0);

        let query_str = format!(r#"
            WITH user_stats AS (
                SELECT
                    u.id as user_id,
                    u.username,
                    u.organization_id,
                    u.campus_id,
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC') as problems_solved,
                    COUNT(*) as submissions,
                    ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ) as acceptance_rate,
                    SUM(
                        CASE
                            WHEN s.verdict = 'AC' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ) as score
                FROM users u
                LEFT JOIN submissions s ON s.user_id = u.id {}
                LEFT JOIN problems p ON p.id = s.problem_id
                GROUP BY u.id, u.username, u.organization_id, u.campus_id
                HAVING COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC') >= $1
            )
            SELECT
                ROW_NUMBER() OVER (ORDER BY score DESC, problems_solved DESC, username ASC) as rank,
                user_id,
                username,
                score,
                problems_solved,
                submissions,
                acceptance_rate,
                organization_id,
                campus_id
            FROM user_stats
            ORDER BY score DESC, problems_solved DESC, username ASC
            LIMIT $2 OFFSET $3
        "#, time_filter);

        let entries = sqlx::query_as::<_, LeaderboardEntry>(&query_str)
        .bind(min_problems_filter)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        // Get total count
        let count_query = format!(r#"
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            LEFT JOIN submissions s ON s.user_id = u.id {}
            LEFT JOIN problems p ON p.id = s.problem_id
            GROUP BY u.id
            HAVING COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC') >= $1
        "#, time_filter);

        let total: i64 = sqlx::query_scalar(&count_query)
            .bind(min_problems_filter)
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0);

        // Cache result
        if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await {
            if let Ok(serialized) = serde_json::to_string(&entries) {
                let _: Result<(), _> = conn.set_ex(&cache_key, serialized, 300).await;
                // Ignore cache errors
            }
        }

        Ok(LeaderboardResponse {
            total,
            entries,
            limit,
            offset,
            timeframe: query.timeframe.unwrap_or_else(|| "all".to_string()),
        })
    }

    /// Get school leaderboard
    pub async fn get_school_leaderboard(
        &self,
        school_id: i64,
        query: LeaderboardQuery,
    ) -> Result<LeaderboardResponse> {
        let limit = query.limit.unwrap_or(100).min(1000);
        let offset = query.offset.unwrap_or(0);

        let entries = sqlx::query_as::<_, LeaderboardEntry>(
            r#"
            WITH user_stats AS (
                SELECT
                    u.id as user_id,
                    u.username,
                    u.organization_id,
                    u.campus_id,
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC') as problems_solved,
                    COUNT(*) as submissions,
                    ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ) as acceptance_rate,
                    SUM(
                        CASE
                            WHEN s.verdict = 'AC' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ) as score
                FROM users u
                LEFT JOIN submissions s ON s.user_id = u.id
                LEFT JOIN problems p ON p.id = s.problem_id
                WHERE u.organization_id = $1
                GROUP BY u.id, u.username, u.organization_id, u.campus_id
            )
            SELECT
                ROW_NUMBER() OVER (ORDER BY score DESC, problems_solved DESC, username ASC) as rank,
                user_id,
                username,
                score,
                problems_solved,
                submissions,
                acceptance_rate,
                organization_id,
                campus_id
            FROM user_stats
            ORDER BY score DESC, problems_solved DESC, username ASC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(school_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(LeaderboardResponse {
            total: entries.len() as i64,
            entries,
            limit,
            offset,
            timeframe: "all".to_string(),
        })
    }

    /// Get campus leaderboard
    pub async fn get_campus_leaderboard(
        &self,
        campus_id: i64,
        query: LeaderboardQuery,
    ) -> Result<LeaderboardResponse> {
        let limit = query.limit.unwrap_or(100).min(1000);
        let offset = query.offset.unwrap_or(0);

        let entries = sqlx::query_as::<_, LeaderboardEntry>(
            r#"
            WITH user_stats AS (
                SELECT
                    u.id as user_id,
                    u.username,
                    u.organization_id,
                    u.campus_id,
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC') as problems_solved,
                    COUNT(*) as submissions,
                    ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ) as acceptance_rate,
                    SUM(
                        CASE
                            WHEN s.verdict = 'AC' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ) as score
                FROM users u
                LEFT JOIN submissions s ON s.user_id = u.id
                LEFT JOIN problems p ON p.id = s.problem_id
                WHERE u.campus_id = $1
                GROUP BY u.id, u.username, u.organization_id, u.campus_id
            )
            SELECT
                ROW_NUMBER() OVER (ORDER BY score DESC, problems_solved DESC, username ASC) as rank,
                user_id,
                username,
                score,
                problems_solved,
                submissions,
                acceptance_rate,
                organization_id,
                campus_id
            FROM user_stats
            ORDER BY score DESC, problems_solved DESC, username ASC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(campus_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(LeaderboardResponse {
            total: entries.len() as i64,
            entries,
            limit,
            offset,
            timeframe: "all".to_string(),
        })
    }

    /// Get class leaderboard
    pub async fn get_class_leaderboard(
        &self,
        class_id: i64,
        query: LeaderboardQuery,
    ) -> Result<LeaderboardResponse> {
        let limit = query.limit.unwrap_or(100).min(1000);
        let offset = query.offset.unwrap_or(0);

        let entries = sqlx::query_as::<_, LeaderboardEntry>(
            r#"
            WITH user_stats AS (
                SELECT
                    u.id as user_id,
                    u.username,
                    u.organization_id,
                    u.campus_id,
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC') as problems_solved,
                    COUNT(*) as submissions,
                    ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ) as acceptance_rate,
                    SUM(
                        CASE
                            WHEN s.verdict = 'AC' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ) as score
                FROM users u
                JOIN class_enrollments ce ON ce.student_id = u.id
                LEFT JOIN submissions s ON s.user_id = u.id
                LEFT JOIN problems p ON p.id = s.problem_id
                WHERE ce.class_id = $1 AND ce.status = 'active'
                GROUP BY u.id, u.username, u.organization_id, u.campus_id
            )
            SELECT
                ROW_NUMBER() OVER (ORDER BY score DESC, problems_solved DESC, username ASC) as rank,
                user_id,
                username,
                score,
                problems_solved,
                submissions,
                acceptance_rate,
                organization_id,
                campus_id
            FROM user_stats
            ORDER BY score DESC, problems_solved DESC, username ASC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(class_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(LeaderboardResponse {
            total: entries.len() as i64,
            entries,
            limit,
            offset,
            timeframe: "all".to_string(),
        })
    }

    /// Get user statistics
    pub async fn get_user_stats(&self, user_id: Uuid) -> Result<UserStats> {
        // Get basic user info
        let user: (String, DateTime<Utc>) = sqlx::query_as(
            "SELECT username, created_at FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        // Get problem stats
        let stats: (i64, i64, Option<DateTime<Utc>>) = sqlx::query_as(
            r#"
            SELECT
                COUNT(DISTINCT problem_id) FILTER (WHERE verdict = 'AC') as solved,
                COUNT(*) as total,
                MAX(created_at) FILTER (WHERE verdict = 'AC') as last_ac
            FROM submissions
            WHERE user_id = $1
            "#
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        let acceptance_rate = if stats.1 > 0 {
            (stats.0 as f64 / stats.1 as f64) * 100.0
        } else {
            0.0
        };

        // Get ranks
        let global_rank = self.get_user_rank(user_id, None, None).await?;
        let school_rank = self.get_user_rank(user_id, Some("school"), None).await?;
        let campus_rank = self.get_user_rank(user_id, Some("campus"), None).await?;
        let class_rank = self.get_user_rank(user_id, Some("class"), None).await?;

        // Get recent AC
        let recent_ac = sqlx::query_as::<_, RecentAC>(
            r#"
            SELECT
                p.id as problem_id,
                p.title as problem_title,
                p.difficulty,
                s.created_at as solved_at
            FROM submissions s
            JOIN problems p ON p.id = s.problem_id
            WHERE s.user_id = $1 AND s.verdict = 'AC'
            ORDER BY s.created_at DESC
            LIMIT 10
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(UserStats {
            user_id,
            username: user.0,
            total_problems_solved: stats.0,
            total_submissions: stats.1,
            acceptance_rate,
            global_rank: Some(global_rank),
            school_rank: Some(school_rank),
            campus_rank: Some(campus_rank),
            class_rank: Some(class_rank),
            streak_days: 0, // TODO: Implement streak calculation
            max_streak_days: 0,
            last_ac_at: stats.2,
            joined_at: user.1,
            recent_ac,
        })
    }

    /// Get user rank in a specific scope
    async fn get_user_rank(
        &self,
        user_id: Uuid,
        scope: Option<&str>,
        scope_id: Option<i64>,
    ) -> Result<i64> {
        let rank: i64 = match scope {
            Some("school") => sqlx::query_scalar(
                r#"
                SELECT COUNT(*) + 1
                FROM (
                    SELECT user_id, SUM(score) as total_score
                    FROM (
                        SELECT
                            s.user_id,
                            CASE p.difficulty
                                WHEN 'easy' THEN 1
                                WHEN 'medium' THEN 3
                                WHEN 'hard' THEN 5
                                WHEN 'expert' THEN 10
                                ELSE 1
                            END as score
                        FROM submissions s
                        JOIN problems p ON p.id = s.problem_id
                        WHERE s.verdict = 'AC' AND s.user_id IN (
                            SELECT id FROM users WHERE organization_id = (
                                SELECT organization_id FROM users WHERE id = $1
                            )
                        )
                    ) sub
                    GROUP BY user_id
                    HAVING SUM(score) > (
                        SELECT SUM(score)
                        FROM (
                            SELECT
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END as score
                            FROM submissions s
                            JOIN problems p ON p.id = s.problem_id
                            WHERE s.user_id = $1 AND s.verdict = 'AC'
                        ) sub
                    )
                ) ranks
                "#
            )
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?,
            None => sqlx::query_scalar(
                r#"
                SELECT COUNT(*) + 1
                FROM (
                    SELECT user_id, SUM(score) as total_score
                    FROM (
                        SELECT
                            s.user_id,
                            CASE p.difficulty
                                WHEN 'easy' THEN 1
                                WHEN 'medium' THEN 3
                                WHEN 'hard' THEN 5
                                WHEN 'expert' THEN 10
                                ELSE 1
                            END as score
                        FROM submissions s
                        JOIN problems p ON p.id = s.problem_id
                        WHERE s.verdict = 'AC'
                    ) sub
                    GROUP BY user_id
                    HAVING SUM(score) > (
                        SELECT SUM(score)
                        FROM (
                            SELECT
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END as score
                            FROM submissions s
                            JOIN problems p ON p.id = s.problem_id
                            WHERE s.user_id = $1 AND s.verdict = 'AC'
                        ) sub
                    )
                ) ranks
                "#
            )
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?,
            Some(_) => 0, // Not implemented yet
        };

        Ok(rank)
    }

    /// Get problem leaderboard (fastest solvers)
    pub async fn get_problem_leaderboard(
        &self,
        problem_id: Uuid,
        limit: i64,
    ) -> Result<Vec<ProblemLeaderboardEntry>> {
        let entries = sqlx::query_as::<_, ProblemLeaderboardEntry>(
            r#"
            SELECT
                ROW_NUMBER() OVER (ORDER BY s.time_ms ASC, s.created_at ASC) as rank,
                s.user_id,
                u.username,
                s.time_ms,
                s.memory_kb,
                s.language,
                s.created_at as solved_at
            FROM submissions s
            JOIN users u ON u.id = s.user_id
            WHERE s.problem_id = $1 AND s.verdict = 'AC'
            ORDER BY s.time_ms ASC, s.created_at ASC
            LIMIT $2
            "#
        )
        .bind(problem_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(entries)
    }

    /// Invalidate leaderboard cache (call on new submission)
    pub async fn invalidate_leaderboard_cache(&self) -> Result<()> {
        if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await {
            // Find and delete all leaderboard cache keys
            let keys: Vec<String> = redis::cmd("KEYS")
                .arg("leaderboard:*")
                .query_async(&mut conn)
                .await
                .unwrap_or_default();

            if !keys.is_empty() {
                let _: Result<(), _> = redis::cmd("DEL")
                    .arg(keys)
                    .query_async(&mut conn)
                    .await;
            }
        }
        Ok(())
    }
}
