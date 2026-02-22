// Search service implementation
use super::models::*;
use crate::db::Pool;
use sqlx::Row;
use std::string::ToString;

pub struct SearchService {
    pool: Pool,
}

impl SearchService {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Perform full-text search across discussions and articles
    pub async fn search(
        &self,
        query: SearchQuery,
    ) -> Result<SearchResponse, sqlx::Error> {
        let offset = (query.page - 1) * query.limit;

        match query.type_.as_str() {
            "discussion" => self.search_discussions(query, offset).await,
            "article" => self.search_articles(query, offset).await,
            _ => self.search_all(query, offset).await,
        }
    }

    /// Search only discussions
    async fn search_discussions(
        &self,
        query: SearchQuery,
        offset: u32,
    ) -> Result<SearchResponse, sqlx::Error> {
        let search_query = format!("%{}%", query.q);

        let total_query = r#"
            SELECT COUNT(*) as count
            FROM discussions
            WHERE title ILIKE $1 OR content ILIKE $1
        "#;

        let total: i64 = sqlx::query_scalar(total_query)
            .bind(&search_query)
            .fetch_one(&self.pool)
            .await?;

        let order_by = match query.sort.as_str() {
            "latest" => "created_at DESC",
            "popular" => "like_count DESC",
            _ => "created_at DESC", // Default to latest for now
        };

        let discussions_query = format!(
            r#"
            SELECT
                d.id, d.title, d.content, d.author_id, u.username as author_username,
                d.tags, d.problem_id, d.is_solved, d.is_pinned,
                d.reply_count, d.like_count, d.view_count,
                d.created_at
            FROM discussions d
            JOIN users u ON d.author_id = u.id
            WHERE d.title ILIKE $1 OR d.content ILIKE $1
            ORDER BY {}
            LIMIT $2 OFFSET $3
        "#,
            order_by
        );

        let rows = sqlx::query(&discussions_query)
            .bind(&search_query)
            .bind(query.limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await?;

        let results: Vec<SearchResultItem> = rows
            .into_iter()
            .map(|row| {
                let title: String = row.get("title");
                let content: String = row.get("content");
                let highlighted = self.highlight_text(&title, &content, &query.q);

                SearchResultItem::Discussion(DiscussionSearchResult {
                    id: row.get("id"),
                    title: row.get("title"),
                    content: row.get("content"),
                    author_id: row.get("author_id"),
                    author_username: row.get("author_username"),
                    tags: row.get("tags"),
                    problem_id: row.get("problem_id"),
                    is_solved: row.get("is_solved"),
                    is_pinned: row.get("is_pinned"),
                    reply_count: row.get("reply_count"),
                    like_count: row.get("like_count"),
                    view_count: row.get("view_count"),
                    created_at: row.get("created_at"),
                    relevance_score: 1.0,
                    highlighted_title: highlighted.0,
                    highlighted_content: highlighted.1,
                })
            })
            .collect();

        Ok(SearchResponse {
            query: query.q,
            results,
            total_count: total as u64,
            discussion_count: total as u64,
            article_count: 0,
            page: query.page,
            limit: query.limit,
            has_more: (offset + query.limit) < total as u32,
        })
    }

    /// Search only articles
    async fn search_articles(
        &self,
        query: SearchQuery,
        offset: u32,
    ) -> Result<SearchResponse, sqlx::Error> {
        let search_query = format!("%{}%", query.q);

        let total_query = r#"
            SELECT COUNT(*) as count
            FROM articles
            WHERE is_published = true
            AND (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1)
        "#;

        let total: i64 = sqlx::query_scalar(total_query)
            .bind(&search_query)
            .fetch_one(&self.pool)
            .await?;

        let order_by = match query.sort.as_str() {
            "latest" => "published_at DESC NULLS LAST, created_at DESC",
            "popular" => "like_count DESC",
            _ => "published_at DESC NULLS LAST, created_at DESC",
        };

        let articles_query = format!(
            r#"
            SELECT
                a.id, a.title, a.slug, a.content, a.excerpt,
                a.author_id, u.username as author_username,
                a.tags, a.category, a.is_featured, a.is_published,
                a.like_count, a.comment_count, a.view_count,
                a.published_at, a.created_at
            FROM articles a
            JOIN users u ON a.author_id = u.id
            WHERE a.is_published = true
            AND (a.title ILIKE $1 OR a.content ILIKE $1 OR a.excerpt ILIKE $1)
            ORDER BY {}
            LIMIT $2 OFFSET $3
        "#,
            order_by
        );

        let rows = sqlx::query(&articles_query)
            .bind(&search_query)
            .bind(query.limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await?;

        let results: Vec<SearchResultItem> = rows
            .into_iter()
            .map(|row| {
                let title: String = row.get("title");
                let content: String = row.get("content");
                let highlighted = self.highlight_text(&title, &content, &query.q);

                SearchResultItem::Article(ArticleSearchResult {
                    id: row.get("id"),
                    title: row.get("title"),
                    slug: row.get("slug"),
                    content: row.get("content"),
                    excerpt: row.get("excerpt"),
                    author_id: row.get("author_id"),
                    author_username: row.get("author_username"),
                    tags: row.get("tags"),
                    category: row.get("category"),
                    is_featured: row.get("is_featured"),
                    is_published: row.get("is_published"),
                    like_count: row.get("like_count"),
                    comment_count: row.get("comment_count"),
                    view_count: row.get("view_count"),
                    published_at: row.get("published_at"),
                    created_at: row.get("created_at"),
                    relevance_score: 1.0,
                    highlighted_title: highlighted.0,
                    highlighted_content: highlighted.1,
                })
            })
            .collect();

        Ok(SearchResponse {
            query: query.q,
            results,
            total_count: total as u64,
            discussion_count: 0,
            article_count: total as u64,
            page: query.page,
            limit: query.limit,
            has_more: (offset + query.limit) < total as u32,
        })
    }

    /// Search across all content types
    async fn search_all(
        &self,
        query: SearchQuery,
        offset: u32,
    ) -> Result<SearchResponse, sqlx::Error> {
        let discussion_limit = (query.limit / 2) + (query.limit % 2);
        let article_limit = query.limit / 2;

        // Search discussions
        let mut discussion_query = query.clone();
        discussion_query.type_ = "discussion".to_string();
        discussion_query.limit = discussion_limit;
        discussion_query.page = 1;

        let discussion_offset = if offset > 0 { offset / 2 } else { 0 };
        let discussions = self
            .search_discussions(discussion_query, discussion_offset)
            .await?;

        // Search articles
        let mut article_query = query.clone();
        article_query.type_ = "article".to_string();
        article_query.limit = article_limit;
        article_query.page = 1;

        let article_offset = if offset > 0 { offset / 2 } else { 0 };
        let articles = self.search_articles(article_query, article_offset).await?;

        // Merge results
        let mut results = discussions.results;
        results.extend(articles.results);

        let total_count = discussions.total_count + articles.total_count;

        Ok(SearchResponse {
            query: query.q,
            results,
            total_count,
            discussion_count: discussions.discussion_count,
            article_count: articles.article_count,
            page: query.page,
            limit: query.limit,
            has_more: (offset + query.limit) < total_count as u32,
        })
    }

    /// Get search suggestions (tags, categories, recent searches)
    pub async fn get_suggestions(
        &self,
        query: &str,
        user_id: Option<&str>,
    ) -> Result<SearchSuggestionsResponse, sqlx::Error> {
        let mut suggestions = Vec::new();

        let search_pattern = format!("%{}%", query);

        // Get matching tags
        let tag_query = r#"
            SELECT unnest(tags) as tag, COUNT(*) as count
            FROM (
                SELECT tags FROM discussions
                UNION ALL
                SELECT tags FROM articles WHERE is_published = true
            ) all_content
            WHERE unnest(tags) ILIKE $1
            GROUP BY tag
            ORDER BY count DESC
            LIMIT 5
        "#;

        let tag_rows = sqlx::query(tag_query)
            .bind(&search_pattern)
            .fetch_all(&self.pool)
            .await?;

        for row in tag_rows {
            let tag: String = row.get("tag");
            let count: i64 = row.get("count");
            suggestions.push(SearchSuggestion {
                text: tag.clone(),
                type_: "tag".to_string(),
                count: count as u64,
            });
        }

        // Get matching categories
        let category_query = r#"
            SELECT category, COUNT(*) as count
            FROM articles
            WHERE is_published = true
            AND category IS NOT NULL
            AND category ILIKE $1
            GROUP BY category
            ORDER BY count DESC
            LIMIT 3
        "#;

        let category_rows = sqlx::query(category_query)
            .bind(&search_pattern)
            .fetch_all(&self.pool)
            .await?;

        for row in category_rows {
            let category: String = row.get("category");
            let count: i64 = row.get("count");
            suggestions.push(SearchSuggestion {
                text: category,
                type_: "category".to_string(),
                count: count as u64,
            });
        }

        // TODO: Add recent searches from user history/cache

        Ok(SearchSuggestionsResponse {
            query: query.to_string(),
            suggestions,
        })
    }

    /// Highlight search terms in text
    fn highlight_text(
        &self,
        title: &str,
        content: &str,
        query: &str,
    ) -> (Option<String>, Option<String>) {
        let query_lower = query.to_lowercase();

        // Highlight title
        let highlighted_title = if title.to_lowercase().contains(&query_lower) {
            Some(self.highlight_terms(title, query))
        } else {
            None
        };

        // Highlight content (first 200 chars)
        let highlighted_content = if content.len() > 200 {
            let truncated = &content[..200];
            if truncated.to_lowercase().contains(&query_lower) {
                Some(self.highlight_terms(truncated, query))
            } else {
                Some(format!("{}...", truncated))
            }
        } else if content.to_lowercase().contains(&query_lower) {
            Some(self.highlight_terms(content, query))
        } else {
            Some(if content.len() > 200 {
                format!("{}...", &content[..200])
            } else {
                content.to_string()
            })
        };

        (highlighted_title, highlighted_content)
    }

    /// Apply highlighting to matched terms
    fn highlight_terms(&self, text: &str, query: &str) -> String {
        let mut result = text.to_string();
        for term in query.split_whitespace() {
            if term.is_empty() {
                continue;
            }
            let pattern = format!("(?i){}", regex::escape(term));
            if let Ok(re) = regex::Regex::new(&pattern) {
                result = re.replace_all(&result, "<mark>$0</mark>").to_string();
            }
        }
        result
    }
}
