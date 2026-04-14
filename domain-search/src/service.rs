use super::models::*;
use anyhow::Result;
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Clone)]
pub struct SearchService {
    pool: PgPool,
    _redis_url: Option<String>,
}

impl SearchService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            _redis_url: None,
        }
    }

    pub fn with_redis(pool: PgPool, redis_url: &str) -> Result<Self> {
        Ok(Self {
            pool,
            _redis_url: Some(redis_url.to_string()),
        })
    }

    pub async fn save_recent_search(&self, _user_id: Uuid, _q: &str) -> Result<()> {
        Ok(())
    }

    /// Search with tenant-aware filtering.
    /// `school_id`: if Some, restrict results to that organization.
    /// `is_teacher_plus`: if true, include private problems from the org.
    pub async fn search_tenant_aware(
        &self,
        query: SearchQuery,
        school_id: Option<i64>,
        is_teacher_plus: bool,
    ) -> Result<SearchResponse> {
        let query_text = query.q.clone().unwrap_or_default().trim().to_string();
        let normalized_type = query.r#type.to_lowercase();
        let include_problems = normalized_type == "all" || normalized_type == "problem";
        let include_discussions = normalized_type == "all" || normalized_type == "discussion";
        let page = query.page.max(1);
        let limit = query.limit.clamp(1, 50);
        let offset = ((page - 1) * limit) as usize;

        let problem_results = if include_problems {
            self.search_problems(&query_text, school_id, is_teacher_plus)
                .await?
        } else {
            Vec::new()
        };
        let discussion_results = if include_discussions {
            self.search_discussions(&query_text, school_id).await?
        } else {
            Vec::new()
        };

        let problem_count = problem_results.len() as u64;
        let discussion_count = discussion_results.len() as u64;

        let mut results = Vec::with_capacity(problem_results.len() + discussion_results.len());
        results.extend(problem_results);
        results.extend(discussion_results);

        match query.sort.as_str() {
            "latest" => results.sort_by(|left, right| right.created_at.cmp(&left.created_at)),
            "popular" => results.sort_by(|left, right| {
                right
                    .view_count
                    .cmp(&left.view_count)
                    .then_with(|| right.like_count.cmp(&left.like_count))
                    .then_with(|| right.created_at.cmp(&left.created_at))
            }),
            _ => results.sort_by(|left, right| {
                right
                    .relevance_score
                    .partial_cmp(&left.relevance_score)
                    .unwrap_or(std::cmp::Ordering::Equal)
                    .then_with(|| right.created_at.cmp(&left.created_at))
            }),
        }

        let total_count = results.len() as u64;
        let paged_results = results
            .into_iter()
            .skip(offset)
            .take(limit as usize)
            .collect::<Vec<_>>();

        Ok(SearchResponse {
            query: query_text,
            results: paged_results,
            total_count,
            problem_count,
            discussion_count,
            article_count: 0,
            page,
            limit,
            has_more: total_count > (offset + limit as usize) as u64,
        })
    }

    pub async fn get_suggestions(
        &self,
        query: &str,
        _user_id: Option<&str>,
    ) -> Result<SearchSuggestionsResponse> {
        let keyword = query.trim().to_lowercase();
        if keyword.is_empty() {
            return Ok(SearchSuggestionsResponse {
                query: query.to_string(),
                suggestions: Vec::new(),
            });
        }

        let problem_titles = sqlx::query_scalar::<_, String>(
            r#"
            SELECT title
            FROM problems
            WHERE LOWER(title) LIKE $1 AND visibility = 'public'
            ORDER BY created_at DESC
            LIMIT 5
            "#,
        )
        .bind(format!("%{}%", keyword))
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        let discussion_snippets = sqlx::query_scalar::<_, String>(
            r#"
            SELECT LEFT(content, 32)
            FROM discussions
            WHERE LOWER(content) LIKE $1
            ORDER BY created_at DESC
            LIMIT 5
            "#,
        )
        .bind(format!("%{}%", keyword))
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        let mut suggestions = Vec::new();
        suggestions.extend(problem_titles.into_iter().map(|text| SearchSuggestion {
            text,
            suggestion_type: "recent".to_string(),
            count: 0,
        }));
        suggestions.extend(
            discussion_snippets
                .into_iter()
                .map(|text| SearchSuggestion {
                    text,
                    suggestion_type: "recent".to_string(),
                    count: 0,
                }),
        );
        suggestions.sort_by(|a, b| a.text.cmp(&b.text));
        suggestions.dedup_by(|a, b| a.text == b.text);

        Ok(SearchSuggestionsResponse {
            query: query.to_string(),
            suggestions: suggestions.into_iter().take(8).collect(),
        })
    }

    async fn search_problems(
        &self,
        query_text: &str,
        school_id: Option<i64>,
        is_teacher_plus: bool,
    ) -> Result<Vec<SearchResultItem>> {
        // Build visibility clause:
        // - Public problems are always visible
        // - Private problems are only visible to teachers/admins in the same org
        let (visibility_clause, extra_bind) = if let Some(org_id) = school_id {
            if is_teacher_plus {
                ("(p.visibility = 'public' OR (p.visibility = 'private' AND p.organization_id = $3))".to_string(), Some(org_id))
            } else {
                ("p.visibility = 'public'".to_string(), None)
            }
        } else {
            // Unauthenticated: public only
            ("p.visibility = 'public'".to_string(), None)
        };

        let query_str = format!(
            r#"
            SELECT
                p.id,
                p.title,
                p.description,
                p.difficulty,
                p.created_at::text AS created_at,
                u.id AS author_id,
                u.username AS author_username
            FROM problems p
            JOIN users u ON u.id = p.author_id
            WHERE {} AND ($1 = '' OR p.title ILIKE $2 OR p.description ILIKE $2)
            ORDER BY p.created_at DESC
            LIMIT 100
            "#,
            visibility_clause
        );

        let mut q = sqlx::query(&query_str)
            .bind(query_text)
            .bind(format!("%{}%", query_text));

        if let Some(org_id) = extra_bind {
            q = q.bind(org_id);
        }

        let rows = q.fetch_all(&self.pool).await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let title: String = row.get("title");
                let content: String = row.get("description");
                SearchResultItem {
                    id: row.get("id"),
                    title: title.clone(),
                    item_type: "Problem".to_string(),
                    content: content.clone(),
                    excerpt: Some(truncate_text(&content, 180)),
                    slug: None,
                    author_id: Some(row.get::<Uuid, _>("author_id").to_string()),
                    author_username: row.get("author_username"),
                    tags: Vec::new(),
                    category: None,
                    difficulty: row.get("difficulty"),
                    problem_id: Some(row.get("id")),
                    is_solved: None,
                    is_pinned: None,
                    is_featured: None,
                    is_published: Some(true),
                    reply_count: None,
                    like_count: 0,
                    comment_count: None,
                    view_count: 0,
                    created_at: row.get("created_at"),
                    published_at: None,
                    relevance_score: score_text_match(&title, &content, query_text),
                    highlighted_title: Some(highlight(&title, query_text)),
                    highlighted_content: Some(highlight(&truncate_text(&content, 180), query_text)),
                }
            })
            .collect())
    }

    async fn search_discussions(
        &self,
        query_text: &str,
        school_id: Option<i64>,
    ) -> Result<Vec<SearchResultItem>> {
        // Tenant filter: if authenticated, only show discussions from same org
        let (tenant_clause, extra_bind) = if let Some(org_id) = school_id {
            ("AND p.organization_id = $3".to_string(), Some(org_id))
        } else {
            (String::new(), None)
        };

        let query_str = format!(
            r#"
            SELECT
                d.id,
                d.problem_id,
                d.content,
                d.is_pinned,
                d.created_at::text AS created_at,
                u.id AS author_id,
                u.username AS author_username,
                p.title AS problem_title
            FROM discussions d
            JOIN users u ON u.id = d.user_id
            JOIN problems p ON p.id = d.problem_id
            WHERE ($1 = '' OR d.content ILIKE $2 OR p.title ILIKE $2)
            {}
            ORDER BY d.is_pinned DESC, d.created_at DESC
            LIMIT 100
            "#,
            tenant_clause
        );

        let mut q = sqlx::query(&query_str)
            .bind(query_text)
            .bind(format!("%{}%", query_text));

        if let Some(org_id) = extra_bind {
            q = q.bind(org_id);
        }

        let rows = q.fetch_all(&self.pool).await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let content: String = row.get("content");
                let problem_title: String = row.get("problem_title");
                let title = format!("讨论: {}", problem_title);
                SearchResultItem {
                    id: row.get("id"),
                    title: title.clone(),
                    item_type: "Discussion".to_string(),
                    content: content.clone(),
                    excerpt: Some(truncate_text(&content, 180)),
                    slug: None,
                    author_id: Some(row.get::<Uuid, _>("author_id").to_string()),
                    author_username: row.get("author_username"),
                    tags: Vec::new(),
                    category: None,
                    difficulty: None,
                    problem_id: row.get("problem_id"),
                    is_solved: None,
                    is_pinned: Some(row.get("is_pinned")),
                    is_featured: None,
                    is_published: Some(true),
                    reply_count: None,
                    like_count: 0,
                    comment_count: None,
                    view_count: 0,
                    created_at: row.get("created_at"),
                    published_at: None,
                    relevance_score: score_text_match(&title, &content, query_text),
                    highlighted_title: Some(highlight(&title, query_text)),
                    highlighted_content: Some(highlight(&truncate_text(&content, 180), query_text)),
                }
            })
            .collect())
    }
}

fn truncate_text(text: &str, max_len: usize) -> String {
    let trimmed = text.trim();
    if trimmed.chars().count() <= max_len {
        return trimmed.to_string();
    }

    trimmed.chars().take(max_len).collect::<String>() + "..."
}

fn highlight(text: &str, query: &str) -> String {
    let escaped = html_escape(text);
    if query.trim().is_empty() {
        return escaped;
    }

    let lower = escaped.to_lowercase();
    let target = query.to_lowercase();
    if let Some(position) = lower.find(&target) {
        let end = position + target.len();
        format!(
            "{}<mark>{}</mark>{}",
            &escaped[..position],
            &escaped[position..end],
            &escaped[end..]
        )
    } else {
        escaped
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

fn score_text_match(title: &str, content: &str, query: &str) -> f64 {
    if query.trim().is_empty() {
        return 0.0;
    }

    let keyword = query.to_lowercase();
    let title_lower = title.to_lowercase();
    let content_lower = content.to_lowercase();
    let mut score = 0.0;

    if title_lower.contains(&keyword) {
        score += 5.0;
    }
    if content_lower.contains(&keyword) {
        score += 2.0;
    }
    if title_lower.starts_with(&keyword) {
        score += 1.5;
    }

    score
}
