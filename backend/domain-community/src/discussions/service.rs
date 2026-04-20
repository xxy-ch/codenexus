use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

use super::models::*;

/// Discussion service
pub struct DiscussionService {
    pool: PgPool,
}

impl DiscussionService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get discussions list with filters
    /// organization_id: tenant isolation — required for SEC-03
    pub async fn get_discussions(
        &self,
        filters: DiscussionFilters,
        organization_id: i64,
    ) -> Result<DiscussionListResponse> {
        let page = filters.page.unwrap_or(1);
        let limit = filters.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        // Build parameterized query (SECURITY: no string interpolation with user input)
        // SEC-03: Always filter by organization_id as the first condition
        let mut conditions = vec!["d.organization_id = $1".to_string()];
        let mut param_count = 1;

        if filters.problem_id.is_some() {
            param_count += 1;
            conditions.push(format!("d.problem_id = ${}", param_count));
        }
        if filters.contest_id.is_some() {
            param_count += 1;
            conditions.push(format!("d.contest_id = ${}", param_count));
        }
        if filters.is_pinned.is_some() {
            param_count += 1;
            conditions.push(format!("d.is_pinned = ${}", param_count));
        }
        if filters.is_solved.is_some() {
            param_count += 1;
            conditions.push(format!("d.is_solved = ${}", param_count));
        }
        let search_pattern = filters.search.as_ref().map(|s| format!("%{}%", s));
        if search_pattern.is_some() {
            param_count += 1;
            conditions.push(format!(
                "(d.title ILIKE ${} OR d.content ILIKE ${})",
                param_count, param_count
            ));
        }

        let where_clause = format!("WHERE {}", conditions.join(" AND "));

        // Sorting
        let order_clause = match filters.sort.as_deref() {
            Some("popular") => "ORDER BY d.like_count DESC, d.created_at DESC",
            Some("unanswered") => "ORDER BY d.reply_count ASC, d.created_at DESC",
            _ => "ORDER BY d.is_pinned DESC, d.created_at DESC",
        };

        let query_str = format!(
            "SELECT d.* FROM discussions d {} {} LIMIT ${} OFFSET ${}",
            where_clause,
            order_clause,
            param_count + 1,
            param_count + 2
        );
        let count_query_str = format!("SELECT COUNT(*) FROM discussions d {}", where_clause);

        let mut query_builder = sqlx::query_as::<_, Discussion>(&query_str);
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query_str);

        // SEC-03: Bind organization_id first
        query_builder = query_builder.bind(organization_id);
        count_builder = count_builder.bind(organization_id);

        if let Some(problem_id) = filters.problem_id {
            query_builder = query_builder.bind(problem_id);
            count_builder = count_builder.bind(problem_id);
        }
        if let Some(contest_id) = filters.contest_id {
            query_builder = query_builder.bind(contest_id);
            count_builder = count_builder.bind(contest_id);
        }
        if let Some(is_pinned) = filters.is_pinned {
            query_builder = query_builder.bind(is_pinned);
            count_builder = count_builder.bind(is_pinned);
        }
        if let Some(is_solved) = filters.is_solved {
            query_builder = query_builder.bind(is_solved);
            count_builder = count_builder.bind(is_solved);
        }
        if let Some(ref pattern) = search_pattern {
            query_builder = query_builder.bind(pattern.clone());
            count_builder = count_builder.bind(pattern);
        }

        query_builder = query_builder.bind(limit).bind(offset);
        let total = count_builder.fetch_one(&self.pool).await?;
        let discussions = query_builder.fetch_all(&self.pool).await?;

        let pages = (total + limit - 1) / limit;

        Ok(DiscussionListResponse {
            discussions,
            total,
            page,
            limit,
            pages,
        })
    }

    /// Get discussion by ID with replies
    pub async fn get_discussion_detail(&self, id: i64) -> Result<DiscussionDetail> {
        // Increment view count
        sqlx::query("UPDATE discussions SET view_count = view_count + 1 WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        // Get discussion
        let discussion = sqlx::query_as::<_, Discussion>("SELECT * FROM discussions WHERE id = $1")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        // Get replies
        let replies = sqlx::query_as::<_, DiscussionReply>(
            "SELECT * FROM discussion_replies
             WHERE discussion_id = $1
             ORDER BY created_at ASC",
        )
        .bind(id)
        .fetch_all(&self.pool)
        .await?;

        Ok(DiscussionDetail {
            discussion,
            replies,
        })
    }

    /// Create new discussion
    pub async fn create_discussion(
        &self,
        author_id: Uuid,
        organization_id: i64,
        req: CreateDiscussionRequest,
    ) -> Result<Discussion> {
        let discussion = sqlx::query_as::<_, Discussion>(
            r#"
            INSERT INTO discussions (title, content, author_id, organization_id, problem_id, contest_id, tags)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(&req.title)
        .bind(&req.content)
        .bind(author_id)
        .bind(organization_id)
        .bind(req.problem_id)
        .bind(req.contest_id)
        .bind(&req.tags)
        .fetch_one(&self.pool)
        .await?;

        Ok(discussion)
    }

    /// Update discussion
    pub async fn update_discussion(
        &self,
        id: i64,
        author_id: Uuid,
        organization_id: i64,
        req: UpdateDiscussionRequest,
    ) -> Result<Discussion> {
        let mut query = String::from("UPDATE discussions SET ");
        let mut updates = Vec::new();
        let mut param_count = 0;

        if req.title.is_some() {
            updates.push(format!("title = ${}", param_count + 1));
            param_count += 1;
        }
        if req.content.is_some() {
            updates.push(format!("content = ${}", param_count + 1));
            param_count += 1;
        }
        if let Some(_tags) = &req.tags {
            updates.push(format!("tags = ${}", param_count + 1));
            param_count += 1;
        }
        if let Some(is_solved) = req.is_solved {
            updates.push(format!("is_solved = {}", is_solved));
        }
        if let Some(is_locked) = req.is_locked {
            updates.push(format!("is_locked = {}", is_locked));
        }

        if updates.is_empty() {
            return self.get_discussion_by_id(id).await;
        }

        query.push_str(&updates.join(", "));
        query.push_str(&format!(
            " WHERE id = ${} AND author_id = ${} AND organization_id = ${} RETURNING *",
            param_count + 1,
            param_count + 2,
            param_count + 3
        ));

        let mut query_builder = sqlx::query_as::<_, Discussion>(&query);

        if let Some(title) = req.title {
            query_builder = query_builder.bind(title);
        }
        if let Some(content) = req.content {
            query_builder = query_builder.bind(content);
        }
        if let Some(tags) = req.tags {
            query_builder = query_builder.bind(tags);
        }

        query_builder = query_builder.bind(id).bind(author_id).bind(organization_id);

        let discussion = query_builder.fetch_one(&self.pool).await?;

        Ok(discussion)
    }

    /// Delete discussion
    pub async fn delete_discussion(&self, id: i64, user_id: Uuid, is_admin: bool, organization_id: i64) -> Result<bool> {
        let result = if is_admin {
            sqlx::query("DELETE FROM discussions WHERE id = $1 AND organization_id = $2")
                .bind(id)
                .bind(organization_id)
                .execute(&self.pool)
                .await?
        } else {
            sqlx::query("DELETE FROM discussions WHERE id = $1 AND author_id = $2 AND organization_id = $3")
                .bind(id)
                .bind(user_id)
                .bind(organization_id)
                .execute(&self.pool)
                .await?
        };

        Ok(result.rows_affected() > 0)
    }

    /// Create reply
    pub async fn create_reply(
        &self,
        discussion_id: i64,
        author_id: Uuid,
        organization_id: i64,
        req: CreateReplyRequest,
    ) -> Result<DiscussionReply> {
        let mut tx = self.pool.begin().await?;

        // Verify discussion belongs to the caller's organization and check if locked
        let discussion = sqlx::query_as::<_, Discussion>(
            "SELECT * FROM discussions WHERE id = $1 AND organization_id = $2",
        )
        .bind(discussion_id)
        .bind(organization_id)
        .fetch_one(&mut *tx)
        .await?;

        if discussion.is_locked {
            anyhow::bail!("Discussion is locked");
        }

        // Increment reply count
        sqlx::query("UPDATE discussions SET reply_count = reply_count + 1 WHERE id = $1")
            .bind(discussion.id)
            .execute(&mut *tx)
            .await?;

        let reply = sqlx::query_as::<_, DiscussionReply>(
            r#"
            INSERT INTO discussion_replies (discussion_id, parent_id, content, author_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(discussion_id)
        .bind(req.parent_id)
        .bind(&req.content)
        .bind(author_id)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(reply)
    }

    /// Like content (discussion or reply)
    pub async fn toggle_like(
        &self,
        user_id: Uuid,
        target_type: &str,
        target_id: i64,
    ) -> Result<bool> {
        // Check if already liked
        let existing = sqlx::query(
            "SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
        )
        .bind(user_id)
        .bind(target_type)
        .bind(target_id)
        .fetch_optional(&self.pool)
        .await?;

        if existing.is_some() {
            // Remove like
            sqlx::query(
                "DELETE FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
            )
            .bind(user_id)
            .bind(target_type)
            .bind(target_id)
            .execute(&self.pool)
            .await?;

            // Decrement like count
            let table = match target_type {
                "discussion" => "discussions",
                "reply" => "discussion_replies",
                _ => return Ok(false),
            };
            sqlx::query(&format!(
                "UPDATE {} SET like_count = like_count - 1 WHERE id = $1",
                table
            ))
            .bind(target_id)
            .execute(&self.pool)
            .await?;

            Ok(false)
        } else {
            // Add like
            sqlx::query("INSERT INTO likes (user_id, target_type, target_id) VALUES ($1, $2, $3)")
                .bind(user_id)
                .bind(target_type)
                .bind(target_id)
                .execute(&self.pool)
                .await?;

            // Increment like count
            let table = match target_type {
                "discussion" => "discussions",
                "reply" => "discussion_replies",
                _ => return Ok(true),
            };
            sqlx::query(&format!(
                "UPDATE {} SET like_count = like_count + 1 WHERE id = $1",
                table
            ))
            .bind(target_id)
            .execute(&self.pool)
            .await?;

            Ok(true)
        }
    }

    /// Get discussion by ID
    async fn get_discussion_by_id(&self, id: i64) -> Result<Discussion> {
        let discussion = sqlx::query_as::<_, Discussion>("SELECT * FROM discussions WHERE id = $1")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        Ok(discussion)
    }
}
