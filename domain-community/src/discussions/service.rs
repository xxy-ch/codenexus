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
    pub async fn get_discussions(
        &self,
        filters: DiscussionFilters,
    ) -> Result<DiscussionListResponse> {
        let page = filters.page.unwrap_or(1);
        let limit = filters.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        // Build query
        let mut query = String::from("SELECT d.* FROM discussions d WHERE 1=1");
        let mut count_query = String::from("SELECT COUNT(*) FROM discussions d WHERE 1=1");

        // Apply filters
        if let Some(problem_id) = filters.problem_id {
            query.push_str(&format!(" AND d.problem_id = {}", problem_id));
            count_query.push_str(&format!(" AND problem_id = {}", problem_id));
        }

        if let Some(contest_id) = filters.contest_id {
            query.push_str(&format!(" AND d.contest_id = {}", contest_id));
            count_query.push_str(&format!(" AND contest_id = {}", contest_id));
        }

        if let Some(is_pinned) = filters.is_pinned {
            query.push_str(&format!(" AND d.is_pinned = {}", is_pinned));
        }

        if let Some(is_solved) = filters.is_solved {
            query.push_str(&format!(" AND d.is_solved = {}", is_solved));
        }

        if let Some(search) = &filters.search {
            query.push_str(&format!(
                " AND (d.title ILIKE '%{}%' OR d.content ILIKE '%{}%')",
                search.replace('\'', "''"),
                search.replace('\'', "''")
            ));
            count_query.push_str(&format!(
                " AND (title ILIKE '%{}%' OR content ILIKE '%{}%')",
                search.replace('\'', "''"),
                search.replace('\'', "''")
            ));
        }

        // Sorting
        match filters.sort.as_deref() {
            Some("popular") => {
                query.push_str(" ORDER BY d.like_count DESC, d.created_at DESC");
            }
            Some("unanswered") => {
                query.push_str(" ORDER BY d.reply_count ASC, d.created_at DESC");
            }
            _ => {
                // Default: pinned first, then by created_at
                query.push_str(" ORDER BY d.is_pinned DESC, d.created_at DESC");
            }
        }

        // Add pagination
        query.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

        // Get total count
        let total: i64 = sqlx::query_scalar(&count_query)
            .fetch_one(&self.pool)
            .await?;

        // Get discussions
        let discussions = sqlx::query_as::<_, Discussion>(&query)
            .fetch_all(&self.pool)
            .await?;

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
        req: CreateDiscussionRequest,
    ) -> Result<Discussion> {
        let discussion = sqlx::query_as::<_, Discussion>(
            r#"
            INSERT INTO discussions (title, content, author_id, problem_id, contest_id, tags)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
        )
        .bind(&req.title)
        .bind(&req.content)
        .bind(author_id)
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
            " WHERE id = ${} AND author_id = ${} RETURNING *",
            param_count + 1,
            param_count + 2
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

        query_builder = query_builder.bind(id).bind(author_id);

        let discussion = query_builder.fetch_one(&self.pool).await?;

        Ok(discussion)
    }

    /// Delete discussion
    pub async fn delete_discussion(&self, id: i64, user_id: Uuid, is_admin: bool) -> Result<bool> {
        let result = if is_admin {
            sqlx::query("DELETE FROM discussions WHERE id = $1")
                .bind(id)
                .execute(&self.pool)
                .await?
        } else {
            sqlx::query("DELETE FROM discussions WHERE id = $1 AND author_id = $2")
                .bind(id)
                .bind(user_id)
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
        req: CreateReplyRequest,
    ) -> Result<DiscussionReply> {
        // Check if discussion is locked
        let discussion = self.get_discussion_by_id(discussion_id).await?;
        if discussion.is_locked {
            anyhow::bail!("Discussion is locked");
        }

        // Increment reply count
        sqlx::query("UPDATE discussions SET reply_count = reply_count + 1 WHERE id = $1")
            .bind(discussion_id)
            .execute(&self.pool)
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
        .fetch_one(&self.pool)
        .await?;

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
                "UPDATE {} SET like_count = like_count - 1 WHERE id = $2",
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
                "UPDATE {} SET like_count = like_count + 1 WHERE id = $2",
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
