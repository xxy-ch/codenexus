use crate::models::*;
use anyhow::Result;
use chrono::{DateTime, Utc};
use deadpool_redis::redis::AsyncCommands;
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct LeaderboardService {
    pool: PgPool,
    redis_pool: Option<deadpool_redis::Pool>,
}

impl LeaderboardService {
    pub fn new(pool: PgPool, redis_pool: Option<deadpool_redis::Pool>) -> Result<Self> {
        Ok(Self { pool, redis_pool })
    }

    /// Get global leaderboard.
    /// SEC-03: `school_id` scopes results to a single organization.
    /// When `None` (admin), all organizations are included.
    pub async fn get_global_leaderboard(
        &self,
        query: LeaderboardQuery,
        school_id: Option<i64>,
    ) -> Result<LeaderboardResponse> {
        let limit = query.limit.unwrap_or(100).min(1000);
        let offset = query.offset.unwrap_or(0);

        // Build org-scoped cache key
        let org_suffix = match school_id {
            Some(id) => format!(":org:{}", id),
            None => String::new(),
        };
        let timeframe_key = query.timeframe.as_deref().unwrap_or("all");
        let min_problems_key = query.min_problems.unwrap_or(0);
        let cache_key = format!(
            "leaderboard:global{}:tf={}:min={}:{}:{}",
            org_suffix, timeframe_key, min_problems_key, limit, offset
        );

        // Try to get from Redis cache first
        if let Some(pool) = &self.redis_pool {
            if let Ok(mut conn) = pool.get().await {
                let cached: Result<String, _> = conn.get(&cache_key).await;
                if let Ok(cached) = cached {
                    if let Ok((total, entries)) =
                        serde_json::from_str::<(i64, Vec<LeaderboardEntry>)>(&cached)
                    {
                        return Ok(LeaderboardResponse {
                            total,
                            entries,
                            limit,
                            offset,
                            timeframe: query.timeframe.unwrap_or_else(|| "all".to_string()),
                        });
                    }
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

        // SEC-03: tenant isolation filter (placeholders match main query parameter order)
        let tenant_filter = match school_id {
            Some(_) => "AND u.organization_id = $4",
            None => "",
        };

        // SEC-03: count query uses independent parameter numbering ($1, $2)
        let count_tenant_filter = match school_id {
            Some(_) => "AND u.organization_id = $2",
            None => "",
        };

        let min_problems_filter = query.min_problems.unwrap_or(0);

        let query_str = format!(
            r#"
            WITH user_stats AS (
                SELECT
                    u.id as user_id,
                    u.username,
                    u.organization_id,
                    u.campus_id,
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac') as problems_solved,
                    COUNT(s.id) as submissions,
                    COALESCE(ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ), 0)::FLOAT8 as acceptance_rate,
                    COALESCE(SUM(
                        CASE
                            WHEN s.verdict = 'ac' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ), 0)::FLOAT8 as score
                FROM users u
                LEFT JOIN submissions s ON s.user_id = u.id {time_filter}
                LEFT JOIN problems p ON p.id = s.problem_id
                WHERE 1=1 {tenant_filter}
                GROUP BY u.id, u.username, u.organization_id, u.campus_id
                HAVING COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac') >= $1
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
        );

        let entries = if school_id.is_some() {
            sqlx::query_as::<_, LeaderboardEntry>(&query_str)
                .bind(min_problems_filter)
                .bind(limit)
                .bind(offset)
                .bind(school_id)
                .fetch_all(&self.pool)
                .await?
        } else {
            sqlx::query_as::<_, LeaderboardEntry>(&query_str)
                .bind(min_problems_filter)
                .bind(limit)
                .bind(offset)
                .fetch_all(&self.pool)
                .await?
        };

        // Get total count (uses independent $1, $2 placeholders)
        let count_query = format!(
            r#"
            SELECT COUNT(*)
            FROM (
                SELECT u.id
                FROM users u
                LEFT JOIN submissions s ON s.user_id = u.id {time_filter}
                LEFT JOIN problems p ON p.id = s.problem_id
                WHERE 1=1 {count_tenant_filter}
                GROUP BY u.id
                HAVING COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac') >= $1
            ) qualified_users
        "#
        );

        let total: i64 = if school_id.is_some() {
            sqlx::query_scalar(&count_query)
                .bind(min_problems_filter)
                .bind(school_id)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count global leaderboard entries (tenant mode): {}", e);
                    anyhow::anyhow!("Database error: {}", e)
                })?
        } else {
            sqlx::query_scalar(&count_query)
                .bind(min_problems_filter)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count global leaderboard entries (global mode): {}", e);
                    anyhow::anyhow!("Database error: {}", e)
                })?
        };

        // Cache result
        if let Some(pool) = &self.redis_pool {
            if let Ok(mut conn) = pool.get().await {
                if let Ok(serialized) = serde_json::to_string(&(total, &entries)) {
                    let _: Result<(), _> = conn.set_ex(&cache_key, serialized, 300).await;
                }
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
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac') as problems_solved,
                    COUNT(s.id) as submissions,
                    COALESCE(ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ), 0)::FLOAT8 as acceptance_rate,
                    COALESCE(SUM(
                        CASE
                            WHEN s.verdict = 'ac' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ), 0)::FLOAT8 as score
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
            "#,
        )
        .bind(school_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(school_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(LeaderboardResponse {
            total,
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
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac') as problems_solved,
                    COUNT(s.id) as submissions,
                    COALESCE(ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ), 0)::FLOAT8 as acceptance_rate,
                    COALESCE(SUM(
                        CASE
                            WHEN s.verdict = 'ac' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ), 0)::FLOAT8 as score
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
            "#,
        )
        .bind(campus_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE campus_id = $1")
            .bind(campus_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(LeaderboardResponse {
            total,
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
                    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac') as problems_solved,
                    COUNT(s.id) as submissions,
                    COALESCE(ROUND(
                        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'ac')::NUMERIC /
                        NULLIF(COUNT(DISTINCT s.problem_id), 0) * 100,
                        2
                    ), 0)::FLOAT8 as acceptance_rate,
                    COALESCE(SUM(
                        CASE
                            WHEN s.verdict = 'ac' THEN
                                CASE p.difficulty
                                    WHEN 'easy' THEN 1
                                    WHEN 'medium' THEN 3
                                    WHEN 'hard' THEN 5
                                    WHEN 'expert' THEN 10
                                    ELSE 1
                                END
                            ELSE 0
                        END
                    ), 0)::FLOAT8 as score
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
            "#,
        )
        .bind(class_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM class_enrollments WHERE class_id = $1 AND status = 'active'")
                .bind(class_id)
                .fetch_one(&self.pool)
                .await?;

        Ok(LeaderboardResponse {
            total,
            entries,
            limit,
            offset,
            timeframe: "all".to_string(),
        })
    }

    /// Get user statistics
    pub async fn get_user_stats(&self, user_id: Uuid) -> Result<UserStats> {
        // Get basic user info
        let user: (String, DateTime<Utc>) =
            sqlx::query_as("SELECT username, created_at FROM users WHERE id = $1")
                .bind(user_id)
                .fetch_one(&self.pool)
                .await?;

        // Get problem stats
        let stats: (i64, i64, Option<DateTime<Utc>>) = sqlx::query_as(
            r#"
            SELECT
                COUNT(DISTINCT problem_id) FILTER (WHERE verdict = 'ac') as solved,
                COUNT(*) as total,
                MAX(created_at) FILTER (WHERE verdict = 'ac') as last_ac
            FROM submissions
            WHERE user_id = $1
            "#,
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
            WHERE s.user_id = $1 AND s.verdict = 'ac'
            ORDER BY s.created_at DESC
            LIMIT 10
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        // Calculate streaks
        let (streak_days, max_streak_days) = self.calculate_streaks(user_id).await?;

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
            streak_days,
            max_streak_days,
            last_ac_at: stats.2,
            joined_at: user.1,
            recent_ac,
        })
    }

    /// Calculate current and maximum streak for a user
    async fn calculate_streaks(&self, user_id: Uuid) -> Result<(i64, i64)> {
        // Try to get from Redis cache first (TTL: 1 hour)
        let cache_key = format!("user:{}:streak", user_id);
        if let Some(pool) = &self.redis_pool {
            if let Ok(mut conn) = pool.get().await {
                let cached: Result<String, _> = conn.get(&cache_key).await;
                if let Ok(cached) = cached {
                    if let Ok((current, max)) = serde_json::from_str::<(i64, i64)>(&cached) {
                        return Ok((current, max));
                    }
                }
            }
        }

        // Get all accepted submission dates
        let rows = sqlx::query(
            r#"
            SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as ac_date
            FROM submissions
            WHERE user_id = $1 AND verdict = 'ac'
            ORDER BY ac_date DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        if rows.is_empty() {
            return Ok((0, 0));
        }

        // Parse dates
        let mut dates: Vec<chrono::NaiveDate> = Vec::new();
        for row in rows {
            let date: chrono::NaiveDate = row.get("ac_date");
            dates.push(date);
        }

        let today = chrono::Utc::now().date_naive();
        let yesterday = today - chrono::Duration::days(1);

        // Calculate current streak
        let mut current_streak = 0i64;
        if !dates.is_empty() && (dates[0] == today || dates[0] == yesterday) {
            current_streak = 1;
            let mut expected_date = dates[0];

            for next_date in dates.iter().skip(1).copied() {
                if expected_date - chrono::Duration::days(1) == next_date {
                    current_streak += 1;
                    expected_date = next_date;
                } else {
                    break;
                }
            }
        }

        // Calculate maximum streak
        let mut max_streak = 1i64;
        let mut temp_streak = 1i64;

        for i in 1..dates.len() {
            if dates[i - 1] - dates[i] == chrono::Duration::days(1) {
                temp_streak += 1;
            } else {
                max_streak = max_streak.max(temp_streak);
                temp_streak = 1;
            }
        }
        max_streak = max_streak.max(temp_streak);

        // Cache the result
        if let Some(pool) = &self.redis_pool {
            if let Ok(mut conn) = pool.get().await {
                if let Ok(serialized) = serde_json::to_string(&(current_streak, max_streak)) {
                    let _: Result<(), _> = conn.set_ex(&cache_key, serialized, 3600).await;
                }
            }
        }

        Ok((current_streak, max_streak))
    }

    /// Get user rank in a specific scope
    async fn get_user_rank(
        &self,
        user_id: Uuid,
        scope: Option<&str>,
        scope_id: Option<i64>,
    ) -> Result<i64> {
        let rank: i64 = match scope {
            Some("school") => {
                sqlx::query_scalar(
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
                        WHERE s.verdict = 'ac' AND s.user_id IN (
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
                            WHERE s.user_id = $1 AND s.verdict = 'ac'
                        ) sub
                    )
                ) ranks
                "#,
                )
                .bind(user_id)
                .fetch_one(&self.pool)
                .await?
            }
            Some("campus") => {
                let campus_id = match scope_id {
                    Some(id) => Some(id),
                    None => {
                        sqlx::query_scalar::<_, Option<i64>>(
                            "SELECT campus_id FROM users WHERE id = $1",
                        )
                        .bind(user_id)
                        .fetch_one(&self.pool)
                        .await?
                    }
                };

                if let Some(campus_id) = campus_id {
                    sqlx::query_scalar(
                        r#"
                        WITH scored_users AS (
                            SELECT
                                s.user_id,
                                SUM(
                                    CASE p.difficulty
                                        WHEN 'easy' THEN 1
                                        WHEN 'medium' THEN 3
                                        WHEN 'hard' THEN 5
                                        WHEN 'expert' THEN 10
                                        ELSE 1
                                    END
                                ) AS total_score
                            FROM submissions s
                            JOIN problems p ON p.id = s.problem_id
                            JOIN users u ON u.id = s.user_id
                            WHERE s.verdict = 'ac' AND u.campus_id = $2
                            GROUP BY s.user_id
                        ),
                        user_score AS (
                            SELECT COALESCE(
                                SUM(
                                    CASE p.difficulty
                                        WHEN 'easy' THEN 1
                                        WHEN 'medium' THEN 3
                                        WHEN 'hard' THEN 5
                                        WHEN 'expert' THEN 10
                                        ELSE 1
                                    END
                                ),
                                0
                            ) AS total_score
                            FROM submissions s
                            JOIN problems p ON p.id = s.problem_id
                            WHERE s.user_id = $1 AND s.verdict = 'ac'
                        )
                        SELECT COUNT(*) + 1
                        FROM scored_users, user_score
                        WHERE scored_users.total_score > user_score.total_score
                        "#,
                    )
                    .bind(user_id)
                    .bind(campus_id)
                    .fetch_one(&self.pool)
                    .await?
                } else {
                    0
                }
            }
            Some("class") => {
                let class_id = match scope_id {
                    Some(id) => Some(id),
                    None => {
                        sqlx::query_scalar::<_, i64>(
                            r#"
                        SELECT class_id
                        FROM class_enrollments
                        WHERE student_id = $1 AND status = 'active'
                        ORDER BY enrolled_at DESC
                        LIMIT 1
                        "#,
                        )
                        .bind(user_id)
                        .fetch_optional(&self.pool)
                        .await?
                    }
                };

                if let Some(class_id) = class_id {
                    sqlx::query_scalar(
                        r#"
                        WITH scoped_users AS (
                            SELECT DISTINCT student_id AS user_id
                            FROM class_enrollments
                            WHERE class_id = $2 AND status = 'active'
                        ),
                        scored_users AS (
                            SELECT
                                s.user_id,
                                SUM(
                                    CASE p.difficulty
                                        WHEN 'easy' THEN 1
                                        WHEN 'medium' THEN 3
                                        WHEN 'hard' THEN 5
                                        WHEN 'expert' THEN 10
                                        ELSE 1
                                    END
                                ) AS total_score
                            FROM submissions s
                            JOIN problems p ON p.id = s.problem_id
                            JOIN scoped_users su ON su.user_id = s.user_id
                            WHERE s.verdict = 'ac'
                            GROUP BY s.user_id
                        ),
                        user_score AS (
                            SELECT COALESCE(
                                SUM(
                                    CASE p.difficulty
                                        WHEN 'easy' THEN 1
                                        WHEN 'medium' THEN 3
                                        WHEN 'hard' THEN 5
                                        WHEN 'expert' THEN 10
                                        ELSE 1
                                    END
                                ),
                                0
                            ) AS total_score
                            FROM submissions s
                            JOIN problems p ON p.id = s.problem_id
                            WHERE s.user_id = $1 AND s.verdict = 'ac'
                        )
                        SELECT COUNT(*) + 1
                        FROM scored_users, user_score
                        WHERE scored_users.total_score > user_score.total_score
                        "#,
                    )
                    .bind(user_id)
                    .bind(class_id)
                    .fetch_one(&self.pool)
                    .await?
                } else {
                    0
                }
            }
            None => {
                sqlx::query_scalar(
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
                        WHERE s.verdict = 'ac'
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
                            WHERE s.user_id = $1 AND s.verdict = 'ac'
                        ) sub
                    )
                ) ranks
                "#,
                )
                .bind(user_id)
                .fetch_one(&self.pool)
                .await?
            }
            Some(_) => 0,
        };

        Ok(rank)
    }

    /// Get problem leaderboard (fastest solvers).
    /// SEC-03: `school_id` scopes results to a single organization.
    /// When `None` (admin), all organizations are included.
    pub async fn get_problem_leaderboard(
        &self,
        problem_id: i64,
        limit: i64,
        school_id: Option<i64>,
    ) -> Result<Vec<ProblemLeaderboardEntry>> {
        let entries = if let Some(org_id) = school_id {
            sqlx::query_as::<_, ProblemLeaderboardEntry>(
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
                WHERE s.problem_id = $1 AND s.verdict = 'ac'
                    AND u.organization_id = $3
                ORDER BY s.time_ms ASC, s.created_at ASC
                LIMIT $2
                "#,
            )
            .bind(problem_id)
            .bind(limit)
            .bind(org_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, ProblemLeaderboardEntry>(
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
                WHERE s.problem_id = $1 AND s.verdict = 'ac'
                ORDER BY s.time_ms ASC, s.created_at ASC
                LIMIT $2
                "#,
            )
            .bind(problem_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(entries)
    }

}
