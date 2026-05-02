use anyhow::Result;
use chrono::Utc;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::models::*;

/// Blog service
pub struct BlogService {
    pool: PgPool,
}

impl BlogService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Generate slug from title
    fn generate_slug(title: &str) -> String {
        title
            .to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else { '-' })
            .collect::<String>()
            .split('-')
            .filter(|s| !s.is_empty())
            .collect::<Vec<&str>>()
            .join("-")
    }

    /// Get articles list with filters
    /// organization_id: tenant isolation — required for SEC-03
    pub async fn get_articles(
        &self,
        filters: ArticleFilters,
        organization_id: i64,
    ) -> Result<ArticleListResponse> {
        let page = filters.page.unwrap_or(1);
        let limit = filters.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        // Build parameterized query (SECURITY: no string interpolation with user input)
        // SEC-03: Always filter by organization_id as the first condition
        let mut conditions = vec!["a.organization_id = $1".to_string()];
        let mut param_count = 1;

        if filters.author_id.is_some() {
            param_count += 1;
            conditions.push(format!("a.author_id = ${}", param_count));
        }
        if filters.category.is_some() {
            param_count += 1;
            conditions.push(format!("a.category = ${}", param_count));
        }
        if filters.is_published.is_some() {
            param_count += 1;
            conditions.push(format!("a.is_published = ${}", param_count));
        }
        if filters.is_featured.is_some() {
            param_count += 1;
            conditions.push(format!("a.is_featured = ${}", param_count));
        }
        let search_pattern = filters.search.as_ref().map(|s| format!("%{}%", s));
        if search_pattern.is_some() {
            param_count += 1;
            conditions.push(format!(
                "(a.title ILIKE ${} OR a.summary ILIKE ${})",
                param_count, param_count
            ));
        }

        let where_clause = format!("WHERE {}", conditions.join(" AND "));

        // Sorting
        let order_clause = match filters.sort.as_deref() {
            Some("popular") => "ORDER BY a.view_count DESC, a.created_at DESC",
            Some("trending") => {
                "ORDER BY (a.view_count * 0.5 + a.like_count) DESC, a.created_at DESC"
            }
            _ => "ORDER BY a.is_featured DESC, a.published_at DESC, a.created_at DESC",
        };

        let query_str = format!(
            "SELECT a.* FROM articles a {} {} LIMIT ${} OFFSET ${}",
            where_clause,
            order_clause,
            param_count + 1,
            param_count + 2
        );
        let count_query_str = format!("SELECT COUNT(*) FROM articles a {}", where_clause);

        let mut query_builder = sqlx::query_as::<_, Article>(&query_str);
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query_str);

        // SEC-03: Bind organization_id first
        query_builder = query_builder.bind(organization_id);
        count_builder = count_builder.bind(organization_id);

        if let Some(ref author_id) = filters.author_id {
            let aid = author_id.to_string();
            query_builder = query_builder.bind(aid.clone());
            count_builder = count_builder.bind(aid);
        }
        if let Some(ref category) = filters.category {
            query_builder = query_builder.bind(category.clone());
            count_builder = count_builder.bind(category.clone());
        }
        if let Some(is_published) = filters.is_published {
            query_builder = query_builder.bind(is_published);
            count_builder = count_builder.bind(is_published);
        }
        if let Some(is_featured) = filters.is_featured {
            query_builder = query_builder.bind(is_featured);
            count_builder = count_builder.bind(is_featured);
        }
        if let Some(ref pattern) = search_pattern {
            query_builder = query_builder.bind(pattern.clone());
            count_builder = count_builder.bind(pattern);
        }

        query_builder = query_builder.bind(limit).bind(offset);
        let total = count_builder.fetch_one(&self.pool).await?;
        let articles = query_builder.fetch_all(&self.pool).await?;

        let pages = (total + limit - 1) / limit;

        Ok(ArticleListResponse {
            articles,
            total,
            page,
            limit,
            pages,
        })
    }

    /// Get article by slug or ID (tenant-scoped)
    pub async fn get_article_detail(
        &self,
        slug_or_id: &str,
        organization_id: i64,
    ) -> Result<ArticleDetail> {
        // Increment view count (scoped to organization)
        sqlx::query(
            "UPDATE articles SET view_count = view_count + 1 WHERE (id = $1 OR slug = $2) AND organization_id = $3"
        )
            .bind(slug_or_id.parse::<i64>().unwrap_or(0))
            .bind(slug_or_id)
            .bind(organization_id)
            .execute(&self.pool)
            .await?;

        // Get article (scoped to organization)
        let article = sqlx::query_as::<_, Article>(
            "SELECT * FROM articles WHERE (id = $1 OR slug = $2) AND organization_id = $3",
        )
        .bind(slug_or_id.parse::<i64>().unwrap_or(0))
        .bind(slug_or_id)
        .bind(organization_id)
        .fetch_one(&self.pool)
        .await?;

        // Get comments (tenant-scoped to prevent cross-org data leakage from dirty data)
        let comments = sqlx::query_as::<_, ArticleComment>(
            "SELECT * FROM article_comments
             WHERE article_id = $1 AND organization_id = $2
             ORDER BY created_at ASC",
        )
        .bind(article.id)
        .bind(organization_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(ArticleDetail { article, comments })
    }

    /// Create new article
    pub async fn create_article(
        &self,
        author_id: Uuid,
        organization_id: i64,
        req: CreateArticleRequest,
    ) -> Result<Article> {
        // #20: Validate content length before DB insert
        const MAX_ARTICLE_CONTENT_LEN: usize = 100_000;
        if req.content.len() > MAX_ARTICLE_CONTENT_LEN {
            anyhow::bail!(
                "Article content exceeds maximum length of {} characters",
                MAX_ARTICLE_CONTENT_LEN
            );
        }

        let slug = Self::generate_slug(&req.title);

        let published_at = if req.is_published.unwrap_or(false) {
            Some(Utc::now())
        } else {
            None
        };

        let article = sqlx::query_as::<_, Article>(
            r#"
            INSERT INTO articles (title, slug, content, summary, cover_image, author_id, organization_id, tags, category, is_published, is_featured, published_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            "#
        )
        .bind(&req.title)
        .bind(&slug)
        .bind(&req.content)
        .bind(&req.summary)
        .bind(&req.cover_image)
        .bind(author_id)
        .bind(organization_id)
        .bind(&req.tags)
        .bind(req.category.unwrap_or_else(|| "general".to_string()))
        .bind(req.is_published.unwrap_or(false))
        .bind(req.is_featured.unwrap_or(false))
        .bind(published_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(article)
    }

    /// Update article
    pub async fn update_article(
        &self,
        id: i64,
        author_id: Uuid,
        organization_id: i64,
        req: UpdateArticleRequest,
    ) -> Result<Article> {
        let mut query = String::from("UPDATE articles SET ");
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
        if req.summary.is_some() {
            updates.push(format!("summary = ${}", param_count + 1));
            param_count += 1;
        }
        if req.cover_image.is_some() {
            updates.push(format!("cover_image = ${}", param_count + 1));
            param_count += 1;
        }
        if let Some(_tags) = &req.tags {
            updates.push(format!("tags = ${}", param_count + 1));
            param_count += 1;
        }
        if let Some(_category) = &req.category {
            updates.push(format!("category = ${}", param_count + 1));
            param_count += 1;
        }
        if let Some(is_published) = req.is_published {
            updates.push(format!("is_published = {}", is_published));
            // Set/unset published_at
            if is_published {
                updates.push("published_at = COALESCE(published_at, NOW())".to_string());
            }
        }
        if let Some(is_featured) = req.is_featured {
            updates.push(format!("is_featured = {}", is_featured));
        }

        if updates.is_empty() {
            return self.get_article_by_id(id, organization_id).await;
        }

        query.push_str(&updates.join(", "));
        query.push_str(&format!(
            " WHERE id = ${} AND author_id = ${} AND organization_id = ${} RETURNING *",
            param_count + 1,
            param_count + 2,
            param_count + 3
        ));

        let mut query_builder = sqlx::query_as::<_, Article>(&query);

        if let Some(title) = req.title {
            query_builder = query_builder.bind(title);
        }
        if let Some(content) = req.content {
            query_builder = query_builder.bind(content);
        }
        if let Some(summary) = req.summary {
            query_builder = query_builder.bind(summary);
        }
        if let Some(cover_image) = req.cover_image {
            query_builder = query_builder.bind(cover_image);
        }
        if let Some(tags) = req.tags {
            query_builder = query_builder.bind(tags);
        }
        if let Some(category) = req.category {
            query_builder = query_builder.bind(category);
        }

        query_builder = query_builder.bind(id).bind(author_id).bind(organization_id);

        let article = query_builder.fetch_one(&self.pool).await?;

        Ok(article)
    }

    /// Delete article
    pub async fn delete_article(
        &self,
        id: i64,
        user_id: Uuid,
        is_admin: bool,
        organization_id: i64,
    ) -> Result<bool> {
        let result = if is_admin {
            sqlx::query("DELETE FROM articles WHERE id = $1 AND organization_id = $2")
                .bind(id)
                .bind(organization_id)
                .execute(&self.pool)
                .await?
        } else {
            sqlx::query(
                "DELETE FROM articles WHERE id = $1 AND author_id = $2 AND organization_id = $3",
            )
            .bind(id)
            .bind(user_id)
            .bind(organization_id)
            .execute(&self.pool)
            .await?
        };

        Ok(result.rows_affected() > 0)
    }

    /// Create comment
    pub async fn create_comment(
        &self,
        article_id: i64,
        author_id: Uuid,
        organization_id: i64,
        req: CreateCommentRequest,
    ) -> Result<ArticleComment> {
        // #20: Validate content length before DB insert
        const MAX_COMMENT_CONTENT_LEN: usize = 10_000;
        if req.content.len() > MAX_COMMENT_CONTENT_LEN {
            anyhow::bail!(
                "Comment content exceeds maximum length of {} characters",
                MAX_COMMENT_CONTENT_LEN
            );
        }

        let mut tx = self.pool.begin().await?;

        // Verify article belongs to the caller's organization
        let article = sqlx::query_as::<_, Article>(
            "SELECT * FROM articles WHERE id = $1 AND organization_id = $2",
        )
        .bind(article_id)
        .bind(organization_id)
        .fetch_one(&mut *tx)
        .await?;

        // Increment comment count
        sqlx::query("UPDATE articles SET comment_count = comment_count + 1 WHERE id = $1")
            .bind(article.id)
            .execute(&mut *tx)
            .await?;

        let comment = sqlx::query_as::<_, ArticleComment>(
            r#"
            INSERT INTO article_comments (article_id, parent_id, content, author_id, organization_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(article_id)
        .bind(req.parent_id)
        .bind(&req.content)
        .bind(author_id)
        .bind(organization_id)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(comment)
    }

    /// Toggle like on article or comment (tenant-scoped, atomic)
    pub async fn toggle_like(
        &self,
        user_id: Uuid,
        target_type: &str,
        target_id: i64,
        organization_id: i64,
    ) -> Result<bool> {
        // Verify target belongs to the caller's organization
        let (table, _id_column) = match target_type {
            "article" => ("articles", "id"),
            "comment" => ("article_comments", "id"),
            _ => return Ok(false),
        };
        let exists = sqlx::query_scalar::<_, bool>(&format!(
            "SELECT EXISTS(SELECT 1 FROM {} WHERE id = $1 AND organization_id = $2)",
            table
        ))
        .bind(target_id)
        .bind(organization_id)
        .fetch_one(&self.pool)
        .await?;

        if !exists {
            anyhow::bail!("Target not found or access denied");
        }

        // Check if already liked (within a transaction to prevent concurrent drift)
        let mut tx = self.pool.begin().await?;

        let existing = sqlx::query(
            "SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
        )
        .bind(user_id)
        .bind(target_type)
        .bind(target_id)
        .fetch_optional(&mut *tx)
        .await?;

        let liked = if existing.is_some() {
            // Remove like
            sqlx::query(
                "DELETE FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
            )
            .bind(user_id)
            .bind(target_type)
            .bind(target_id)
            .execute(&mut *tx)
            .await?;

            // Recount likes atomically
            sqlx::query(&format!(
                "UPDATE {} SET like_count = (SELECT COUNT(*) FROM likes WHERE target_type = $2 AND target_id = $1) WHERE id = $1",
                table
            ))
            .bind(target_id)
            .bind(target_type)
            .execute(&mut *tx)
            .await?;

            false
        } else {
            // Add like
            sqlx::query("INSERT INTO likes (user_id, target_type, target_id) VALUES ($1, $2, $3)")
                .bind(user_id)
                .bind(target_type)
                .bind(target_id)
                .execute(&mut *tx)
                .await?;

            // Recount likes atomically
            sqlx::query(&format!(
                "UPDATE {} SET like_count = (SELECT COUNT(*) FROM likes WHERE target_type = $2 AND target_id = $1) WHERE id = $1",
                table
            ))
            .bind(target_id)
            .bind(target_type)
            .execute(&mut *tx)
            .await?;

            true
        };

        tx.commit().await?;

        Ok(liked)
    }

    /// Get categories (tenant-scoped)
    pub async fn get_categories(&self, organization_id: Option<i64>) -> Result<Vec<String>> {
        let categories = if let Some(org_id) = organization_id {
            sqlx::query_scalar::<_, String>(
                "SELECT DISTINCT category FROM articles WHERE category IS NOT NULL AND organization_id = $1 ORDER BY category",
            )
            .bind(org_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_scalar::<_, String>(
                "SELECT DISTINCT category FROM articles WHERE category IS NOT NULL ORDER BY category",
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(categories)
    }

    /// Get popular tags (tenant-scoped)
    pub async fn get_popular_tags(
        &self,
        limit: i64,
        organization_id: Option<i64>,
    ) -> Result<Vec<(String, i64)>> {
        let rows = if let Some(org_id) = organization_id {
            sqlx::query(
                r#"
                SELECT unnest(tags) as tag, COUNT(*) as count
                FROM articles
                WHERE is_published = true AND organization_id = $2
                GROUP BY tag
                ORDER BY count DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .bind(org_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT unnest(tags) as tag, COUNT(*) as count
                FROM articles
                WHERE is_published = true
                GROUP BY tag
                ORDER BY count DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        let tags = rows
            .into_iter()
            .map(|row| {
                let tag: String = row.get("tag");
                let count: i64 = row.get("count");
                (tag, count)
            })
            .collect();

        Ok(tags)
    }

    /// Get trending articles (tenant-scoped)
    pub async fn get_trending_articles(
        &self,
        limit: i64,
        organization_id: Option<i64>,
    ) -> Result<Vec<Article>> {
        let articles = if let Some(org_id) = organization_id {
            sqlx::query_as::<_, Article>(
                r#"
                SELECT * FROM articles
                WHERE is_published = true AND organization_id = $2
                ORDER BY (view_count * 0.5 + like_count) DESC, published_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .bind(org_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, Article>(
                r#"
                SELECT * FROM articles
                WHERE is_published = true
                ORDER BY (view_count * 0.5 + like_count) DESC, published_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(articles)
    }

    /// Get featured articles (tenant-scoped)
    pub async fn get_featured_articles(
        &self,
        limit: i64,
        organization_id: Option<i64>,
    ) -> Result<Vec<Article>> {
        let articles = if let Some(org_id) = organization_id {
            sqlx::query_as::<_, Article>(
                r#"
                SELECT * FROM articles
                WHERE is_published = true AND is_featured = true AND organization_id = $2
                ORDER BY published_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .bind(org_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, Article>(
                r#"
                SELECT * FROM articles
                WHERE is_published = true AND is_featured = true
                ORDER BY published_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(articles)
    }

    /// Get article by ID (tenant-scoped)
    async fn get_article_by_id(&self, id: i64, organization_id: i64) -> Result<Article> {
        let article = sqlx::query_as::<_, Article>(
            "SELECT * FROM articles WHERE id = $1 AND organization_id = $2",
        )
        .bind(id)
        .bind(organization_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(article)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_pool() -> PgPool {
        PgPool::connect_lazy("postgres://localhost/nonexistent_test_db")
            .expect("lazy connect should not fail")
    }

    fn make_article_request(content: &str) -> CreateArticleRequest {
        CreateArticleRequest {
            title: "Test Article".to_string(),
            content: content.to_string(),
            summary: None,
            cover_image: None,
            tags: vec![],
            category: Some("general".to_string()),
            is_published: Some(false),
            is_featured: Some(false),
        }
    }

    fn make_comment_request(content: &str) -> CreateCommentRequest {
        CreateCommentRequest {
            content: content.to_string(),
            parent_id: None,
        }
    }

    /// #20: Article content at exactly 100,000 chars should be accepted (boundary)
    #[tokio::test]
    async fn test_article_content_at_max_length_accepted() {
        let pool = make_test_pool();
        let service = BlogService::new(pool);

        let req = make_article_request(&"a".repeat(100_000));
        // Will fail at DB query, but should NOT fail at validation
        let result = service
            .create_article(Uuid::new_v4(), 1, req)
            .await;
        // The error should be a DB error, not a validation error
        let err = result.unwrap_err();
        assert!(
            !err.to_string().contains("exceeds maximum length"),
            "Expected DB error, got validation error: {}",
            err
        );
    }

    /// #20: Article content exceeding 100,000 chars should be rejected
    #[tokio::test]
    async fn test_article_content_over_max_length_rejected() {
        let pool = make_test_pool();
        let service = BlogService::new(pool);

        let req = make_article_request(&"a".repeat(100_001));
        let result = service
            .create_article(Uuid::new_v4(), 1, req)
            .await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.to_string().contains("exceeds maximum length"),
            "Expected validation error, got: {}",
            err
        );
    }

    /// #20: Empty article content should be accepted (DB constraint handles minimum)
    #[tokio::test]
    async fn test_article_content_empty_accepted() {
        let pool = make_test_pool();
        let service = BlogService::new(pool);

        let req = make_article_request("");
        let result = service
            .create_article(Uuid::new_v4(), 1, req)
            .await;
        // Will fail at DB query, but should NOT fail at validation
        let err = result.unwrap_err();
        assert!(
            !err.to_string().contains("exceeds maximum length"),
            "Expected DB error, got validation error: {}",
            err
        );
    }

    /// #20: Comment content at exactly 10,000 chars should be accepted (boundary)
    #[tokio::test]
    async fn test_comment_content_at_max_length_accepted() {
        let pool = make_test_pool();
        let service = BlogService::new(pool);

        let req = make_comment_request(&"a".repeat(10_000));
        let result = service
            .create_comment(1, Uuid::new_v4(), 1, req)
            .await;
        // Will fail at DB query, but should NOT fail at validation
        let err = result.unwrap_err();
        assert!(
            !err.to_string().contains("exceeds maximum length"),
            "Expected DB error, got validation error: {}",
            err
        );
    }

    /// #20: Comment content exceeding 10,000 chars should be rejected
    #[tokio::test]
    async fn test_comment_content_over_max_length_rejected() {
        let pool = make_test_pool();
        let service = BlogService::new(pool);

        let req = make_comment_request(&"a".repeat(10_001));
        let result = service
            .create_comment(1, Uuid::new_v4(), 1, req)
            .await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.to_string().contains("exceeds maximum length"),
            "Expected validation error, got: {}",
            err
        );
    }
}
