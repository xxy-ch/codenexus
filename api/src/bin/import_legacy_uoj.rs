use anyhow::{Context, Result};
use api::db::{create_pool, schema::MIGRATOR};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde_json::Value;
use sqlx::{MySqlPool, PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone)]
struct ImportConfig {
    organization_id: i64,
    campus_id: Option<i64>,
    author_username: Option<String>,
}

#[derive(Debug, Clone)]
struct LegacyUserRow {
    username: String,
    email: Option<String>,
    password_md5: String,
    svn_password: Option<String>,
    usergroup: String,
    rating: i32,
    qq: Option<i64>,
    sex: String,
    ac_num: i32,
    register_time: Option<DateTime<Utc>>,
    remote_addr: Option<String>,
    http_x_forwarded_for: Option<String>,
    remember_token: Option<String>,
    motto: Option<String>,
}

#[derive(Debug, Clone)]
struct LegacyProblemRow {
    problem_id: i64,
    title: String,
    is_hidden: bool,
    submission_requirement: Option<String>,
    hackable: bool,
    extra_config: Option<String>,
    zan: i32,
    ac_num: i32,
    submit_num: i32,
    statement_html: Option<String>,
    statement_md: Option<String>,
    tags: Vec<String>,
}

#[derive(Debug, Clone)]
struct LegacyContestRow {
    contest_id: i64,
    name: String,
    start_time: DateTime<Utc>,
    last_min: i32,
    player_num: i32,
    status: String,
    extra_config: String,
    zan: i32,
}

#[derive(Debug, Clone)]
struct LegacyContestNoticeRow {
    contest_id: i64,
    title: String,
    content: String,
    time: DateTime<Utc>,
}

#[derive(Debug, Clone)]
struct LegacySubmissionRow {
    submission_id: i64,
    legacy_problem_id: i64,
    legacy_contest_id: Option<i64>,
    submit_time: DateTime<Utc>,
    submitter: String,
    code: String,
    language: String,
    total_size: i32,
    judge_time: Option<DateTime<Utc>>,
    result_raw: Vec<u8>,
    status: String,
    result_error: Option<String>,
    score: Option<i32>,
    used_time: i32,
    used_memory: i32,
    is_hidden: bool,
    status_details: String,
}

#[derive(Debug, Clone)]
struct LegacyArticleRow {
    article_id: i64,
    title: String,
    content_html: String,
    content_md: String,
    post_time: DateTime<Utc>,
    poster: String,
    zan: i32,
    is_hidden: bool,
    article_type: String,
    is_draft: bool,
    important_level: Option<i32>,
    tags: Vec<String>,
}

#[derive(Debug, Clone)]
struct LegacyArticleCommentRow {
    comment_id: i64,
    article_id: i64,
    content: String,
    post_time: DateTime<Utc>,
    poster: String,
    zan: i32,
    reply_id: i64,
}

#[derive(Debug, Clone)]
struct LegacySystemMessageRow {
    message_id: i64,
    title: String,
    content: String,
    receiver: String,
    send_time: DateTime<Utc>,
    read_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
struct LegacyPrivateMessageRow {
    message_id: i64,
    sender: String,
    receiver: String,
    message: String,
    send_time: DateTime<Utc>,
    read_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
struct LegacyHackRow {
    hack_id: i64,
    problem_id: i64,
    contest_id: Option<i64>,
    submission_id: i64,
    hacker: String,
    owner: String,
    input: String,
    input_type: String,
    submit_time: DateTime<Utc>,
    judge_time: Option<DateTime<Utc>>,
    success: Option<bool>,
    details_raw: Vec<u8>,
    is_hidden: bool,
}

#[derive(Debug, Clone)]
struct LegacyBestAcSubmissionRow {
    problem_id: i64,
    submitter: String,
    submission_id: i64,
    used_time: i32,
    used_memory: i32,
    total_size: i32,
    shortest_id: i64,
    shortest_used_time: i32,
    shortest_used_memory: i32,
    shortest_total_size: i32,
}

#[derive(Debug, Clone)]
struct LegacyCustomTestSubmissionRow {
    custom_test_submission_id: i64,
    problem_id: i64,
    submit_time: DateTime<Utc>,
    submitter: String,
    content: String,
    judge_time: Option<DateTime<Utc>>,
    result_raw: Vec<u8>,
    status: String,
    status_details: String,
}

#[derive(Debug, Clone)]
struct LegacyJudgerInfoRow {
    judger_name: String,
    password: String,
    ip: String,
}

#[derive(Debug, Clone)]
struct LegacySearchRequestRow {
    search_request_id: i64,
    created_at: DateTime<Utc>,
    remote_addr: String,
    request_type: String,
    cache_id: i32,
    query: String,
    content: String,
    result: String,
}

#[derive(Debug, Clone)]
struct LegacyPasteRow {
    paste_index: String,
    creator: Option<String>,
    created_at: Option<DateTime<Utc>>,
    content: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ParsedLegacyTestCaseResult {
    verdict: String,
    time_ms: Option<i32>,
    memory_kb: Option<i32>,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    let command = std::env::args().nth(1).unwrap_or_else(|| "users".to_string());

    let database_url =
        std::env::var("DATABASE_URL").context("DATABASE_URL must be set for PostgreSQL")?;
    let legacy_database_url = std::env::var("LEGACY_UOJ_DATABASE_URL")
        .context("LEGACY_UOJ_DATABASE_URL must be set for legacy MySQL")?;
    let config = ImportConfig {
        organization_id: std::env::var("IMPORT_ORGANIZATION_ID")
            .context("IMPORT_ORGANIZATION_ID must be set")?
            .parse()
            .context("IMPORT_ORGANIZATION_ID must be an integer")?,
        campus_id: std::env::var("IMPORT_CAMPUS_ID")
            .ok()
            .map(|value| value.parse().context("IMPORT_CAMPUS_ID must be an integer"))
            .transpose()?,
        author_username: std::env::var("IMPORT_AUTHOR_USERNAME").ok(),
    };

    let pg_pool = create_pool(&database_url, Some(5), Some(30)).await?;
    MIGRATOR.run(&pg_pool).await?;

    let mysql_pool = MySqlPool::connect(&legacy_database_url).await?;
    match command.as_str() {
        "users" => import_users(&mysql_pool, &pg_pool, &config).await?,
        "problems" => import_problems(&mysql_pool, &pg_pool, &config).await?,
        "contests" => import_contests(&mysql_pool, &pg_pool, &config).await?,
        "submissions" => import_submissions(&mysql_pool, &pg_pool, &config).await?,
        "articles" => import_articles(&mysql_pool, &pg_pool).await?,
        "messages" => import_messages(&mysql_pool, &pg_pool).await?,
        "archives" => import_archives(&mysql_pool, &pg_pool).await?,
        _ => anyhow::bail!("unsupported command `{}`; supported commands: users, problems, contests, submissions, articles, messages, archives", command),
    }

    Ok(())
}

async fn import_users(mysql_pool: &MySqlPool, pg_pool: &PgPool, config: &ImportConfig) -> Result<()> {
    let rows = sqlx::query(
        r#"
        SELECT
            username,
            NULLIF(email, '') AS email,
            password,
            NULLIF(svn_password, '') AS svn_password,
            usergroup,
            rating,
            NULLIF(qq, 0) AS qq,
            sex,
            ac_num,
            register_time,
            NULLIF(remote_addr, '') AS remote_addr,
            NULLIF(http_x_forwarded_for, '') AS http_x_forwarded_for,
            NULLIF(remember_token, '') AS remember_token,
            NULLIF(motto, '') AS motto
        FROM user_info
        ORDER BY username ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let mut imported = 0_i64;
    let mut updated = 0_i64;

    for row in rows {
        let legacy_user = map_legacy_user(&row)?;
        let result = upsert_user(pg_pool, config, &legacy_user).await?;
        if result.was_inserted {
            imported += 1;
        } else {
            updated += 1;
        }
    }

    println!(
        "Imported legacy users: inserted={}, updated={}, organization_id={}, campus_id={:?}",
        imported, updated, config.organization_id, config.campus_id
    );

    Ok(())
}

fn map_legacy_user(row: &sqlx::mysql::MySqlRow) -> Result<LegacyUserRow> {
    let register_time = row
        .try_get::<Option<NaiveDateTime>, _>("register_time")?
        .map(|value| DateTime::<Utc>::from_naive_utc_and_offset(value, Utc));

    Ok(LegacyUserRow {
        username: row.try_get("username")?,
        email: row.try_get("email")?,
        password_md5: row.try_get("password")?,
        svn_password: row.try_get("svn_password")?,
        usergroup: row.try_get("usergroup")?,
        rating: row.try_get("rating")?,
        qq: row.try_get("qq")?,
        sex: row.try_get("sex")?,
        ac_num: row.try_get("ac_num")?,
        register_time,
        remote_addr: row.try_get("remote_addr")?,
        http_x_forwarded_for: row.try_get("http_x_forwarded_for")?,
        remember_token: row.try_get("remember_token")?,
        motto: row.try_get("motto")?,
    })
}

async fn import_problems(mysql_pool: &MySqlPool, pg_pool: &PgPool, config: &ImportConfig) -> Result<()> {
    let author_id = resolve_problem_author_id(pg_pool, config).await?;

    let tag_rows = sqlx::query(
        r#"
        SELECT problem_id, tag
        FROM problems_tags
        ORDER BY problem_id ASC, id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let mut tags_by_problem = std::collections::BTreeMap::<i64, Vec<String>>::new();
    for row in tag_rows {
        let problem_id: i64 = row.try_get("problem_id")?;
        let tag: String = row.try_get("tag")?;
        tags_by_problem.entry(problem_id).or_default().push(tag);
    }

    let rows = sqlx::query(
        r#"
        SELECT
            p.id,
            p.title,
            p.is_hidden,
            NULLIF(p.submission_requirement, '') AS submission_requirement,
            p.hackable,
            NULLIF(p.extra_config, '') AS extra_config,
            p.zan,
            p.ac_num,
            p.submit_num,
            NULLIF(pc.statement, '') AS statement_html,
            NULLIF(pc.statement_md, '') AS statement_md
        FROM problems p
        LEFT JOIN problems_contents pc ON pc.id = p.id
        ORDER BY p.id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let mut inserted = 0_i64;
    let mut updated = 0_i64;

    for row in rows {
        let problem_id: i64 = row.try_get("id")?;
        let legacy_problem = LegacyProblemRow {
            problem_id,
            title: row.try_get("title")?,
            is_hidden: row.try_get("is_hidden")?,
            submission_requirement: row.try_get("submission_requirement")?,
            hackable: row.try_get("hackable")?,
            extra_config: row.try_get("extra_config")?,
            zan: row.try_get("zan")?,
            ac_num: row.try_get("ac_num")?,
            submit_num: row.try_get("submit_num")?,
            statement_html: row.try_get("statement_html")?,
            statement_md: row.try_get("statement_md")?,
            tags: tags_by_problem.remove(&problem_id).unwrap_or_default(),
        };

        let was_inserted = upsert_problem(pg_pool, config, author_id, &legacy_problem).await?;
        if was_inserted {
            inserted += 1;
        } else {
            updated += 1;
        }
    }

    println!(
        "Imported legacy problems: inserted={}, updated={}, organization_id={}, campus_id={:?}",
        inserted, updated, config.organization_id, config.campus_id
    );

    Ok(())
}

async fn import_contests(mysql_pool: &MySqlPool, pg_pool: &PgPool, config: &ImportConfig) -> Result<()> {
    let rows = sqlx::query(
        r#"
        SELECT id, name, start_time, last_min, player_num, status, extra_config, zan
        FROM contests
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let contest_problem_rows = sqlx::query(
        r#"
        SELECT contest_id, problem_id
        FROM contests_problems
        ORDER BY contest_id ASC, problem_id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let registrant_rows = sqlx::query(
        r#"
        SELECT contest_id, username, user_rating, has_participated, rank
        FROM contests_registrants
        ORDER BY contest_id ASC, username ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let contest_submission_rows = sqlx::query(
        r#"
        SELECT contest_id, submitter, problem_id, submission_id, score, penalty
        FROM contests_submissions
        ORDER BY contest_id ASC, submitter ASC, problem_id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let permission_rows = sqlx::query(
        r#"
        SELECT contest_id, username
        FROM contests_permissions
        ORDER BY contest_id ASC, username ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let ask_rows = sqlx::query(
        r#"
        SELECT id, contest_id, username, question, answer, post_time, reply_time, is_hidden
        FROM contests_asks
        ORDER BY contest_id ASC, id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let notice_rows = sqlx::query(
        r#"
        SELECT contest_id, title, content, time
        FROM contests_notice
        ORDER BY contest_id ASC, time ASC, title ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let notice_rows = notice_rows
        .into_iter()
        .map(|row| -> Result<LegacyContestNoticeRow> {
            Ok(LegacyContestNoticeRow {
                contest_id: row.try_get("contest_id")?,
                title: row.try_get("title")?,
                content: row.try_get("content")?,
                time: mysql_datetime_to_utc(row.try_get("time")?),
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let mut problems_by_contest = std::collections::BTreeMap::<i64, Vec<i64>>::new();
    for row in contest_problem_rows {
        let contest_id: i64 = row.try_get("contest_id")?;
        let problem_id: i64 = row.try_get("problem_id")?;
        problems_by_contest.entry(contest_id).or_default().push(problem_id);
    }

    let mut inserted = 0_i64;
    let mut updated = 0_i64;
    for row in rows {
        let legacy_contest = LegacyContestRow {
            contest_id: row.try_get("id")?,
            name: row.try_get("name")?,
            start_time: mysql_datetime_to_utc(row.try_get("start_time")?),
            last_min: row.try_get("last_min")?,
            player_num: row.try_get("player_num")?,
            status: row.try_get("status")?,
            extra_config: row.try_get("extra_config")?,
            zan: row.try_get("zan")?,
        };

        let was_inserted = upsert_contest(
            pg_pool,
            config,
            &legacy_contest,
            problems_by_contest.remove(&legacy_contest.contest_id).unwrap_or_default(),
        )
        .await?;

        if was_inserted {
            inserted += 1;
        } else {
            updated += 1;
        }
    }

    sync_contest_registrations(pg_pool, registrant_rows).await?;
    sync_contest_submission_details(pg_pool, contest_submission_rows).await?;
    sync_contest_permissions(pg_pool, permission_rows).await?;
    sync_contest_asks(pg_pool, ask_rows).await?;
    sync_contest_notices(pg_pool, &notice_rows).await?;

    println!(
        "Imported legacy contests: inserted={}, updated={}, organization_id={}, campus_id={:?}",
        inserted, updated, config.organization_id, config.campus_id
    );

    Ok(())
}

async fn import_submissions(mysql_pool: &MySqlPool, pg_pool: &PgPool, config: &ImportConfig) -> Result<()> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            problem_id,
            contest_id,
            submit_time,
            submitter,
            content,
            language,
            tot_size,
            judge_time,
            result,
            status,
            result_error,
            score,
            used_time,
            used_memory,
            is_hidden,
            status_details
        FROM submissions
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let mut inserted = 0_i64;
    let mut updated = 0_i64;
    for row in rows {
        let legacy_submission = LegacySubmissionRow {
            submission_id: row.try_get("id")?,
            legacy_problem_id: row.try_get("problem_id")?,
            legacy_contest_id: row.try_get("contest_id")?,
            submit_time: mysql_datetime_to_utc(row.try_get("submit_time")?),
            submitter: row.try_get("submitter")?,
            code: row.try_get("content")?,
            language: row.try_get("language")?,
            total_size: row.try_get("tot_size")?,
            judge_time: row
                .try_get::<Option<NaiveDateTime>, _>("judge_time")?
                .map(mysql_datetime_to_utc),
            result_raw: row.try_get("result")?,
            status: row.try_get("status")?,
            result_error: row.try_get("result_error")?,
            score: row.try_get("score")?,
            used_time: row.try_get("used_time")?,
            used_memory: row.try_get("used_memory")?,
            is_hidden: row.try_get("is_hidden")?,
            status_details: row.try_get("status_details")?,
        };

        let was_inserted = upsert_submission(pg_pool, config, &legacy_submission).await?;
        if was_inserted {
            inserted += 1;
        } else {
            updated += 1;
        }
    }

    println!(
        "Imported legacy submissions: inserted={}, updated={}, organization_id={}",
        inserted, updated, config.organization_id
    );

    Ok(())
}

async fn import_articles(mysql_pool: &MySqlPool, pg_pool: &PgPool) -> Result<()> {
    let tag_rows = sqlx::query(
        r#"
        SELECT blog_id, tag
        FROM blogs_tags
        ORDER BY blog_id ASC, id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let mut tags_by_article = std::collections::BTreeMap::<i64, Vec<String>>::new();
    for row in tag_rows {
        let article_id: i64 = row.try_get("blog_id")?;
        let tag: String = row.try_get("tag")?;
        tags_by_article.entry(article_id).or_default().push(tag);
    }

    let important_rows = sqlx::query(
        r#"
        SELECT blog_id, level
        FROM important_blogs
        ORDER BY blog_id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let mut importance_by_article = std::collections::BTreeMap::<i64, i32>::new();
    for row in important_rows {
        importance_by_article.insert(row.try_get("blog_id")?, row.try_get("level")?);
    }

    let rows = sqlx::query(
        r#"
        SELECT id, title, content, post_time, poster, content_md, zan, is_hidden, type, is_draft
        FROM blogs
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let mut inserted = 0_i64;
    let mut updated = 0_i64;
    for row in rows {
        let article_id: i64 = row.try_get("id")?;
        let legacy_article = LegacyArticleRow {
            article_id,
            title: row.try_get("title")?,
            content_html: row.try_get("content")?,
            content_md: row.try_get("content_md")?,
            post_time: mysql_datetime_to_utc(row.try_get("post_time")?),
            poster: row.try_get("poster")?,
            zan: row.try_get("zan")?,
            is_hidden: row.try_get("is_hidden")?,
            article_type: row.try_get("type")?,
            is_draft: row.try_get("is_draft")?,
            important_level: importance_by_article.remove(&article_id),
            tags: tags_by_article.remove(&article_id).unwrap_or_default(),
        };

        let was_inserted = upsert_article(pg_pool, &legacy_article).await?;
        if was_inserted {
            inserted += 1;
        } else {
            updated += 1;
        }
    }

    let comment_rows = sqlx::query(
        r#"
        SELECT id, blog_id, content, post_time, poster, zan, reply_id
        FROM blogs_comments
        ORDER BY blog_id ASC, id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    let comment_rows = comment_rows
        .into_iter()
        .map(|row| -> Result<LegacyArticleCommentRow> {
            Ok(LegacyArticleCommentRow {
                comment_id: row.try_get("id")?,
                article_id: row.try_get("blog_id")?,
                content: row.try_get("content")?,
                post_time: mysql_datetime_to_utc(row.try_get("post_time")?),
                poster: row.try_get("poster")?,
                zan: row.try_get("zan")?,
                reply_id: row.try_get("reply_id")?,
            })
        })
        .collect::<Result<Vec<_>>>()?;
    sync_article_comments(pg_pool, &comment_rows).await?;

    let like_rows = sqlx::query(
        r#"
        SELECT type, username, target_id, val
        FROM click_zans
        ORDER BY type ASC, target_id ASC, username ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;
    sync_click_zans(pg_pool, like_rows).await?;

    println!("Imported legacy articles: inserted={}, updated={}", inserted, updated);
    Ok(())
}

async fn import_messages(mysql_pool: &MySqlPool, pg_pool: &PgPool) -> Result<()> {
    let system_rows = sqlx::query(
        r#"
        SELECT id, title, content, receiver, send_time, read_time
        FROM user_system_msg
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in system_rows {
        let legacy_message = LegacySystemMessageRow {
            message_id: row.try_get("id")?,
            title: row.try_get("title")?,
            content: row.try_get("content")?,
            receiver: row.try_get("receiver")?,
            send_time: mysql_datetime_to_utc(row.try_get("send_time")?),
            read_time: row
                .try_get::<Option<NaiveDateTime>, _>("read_time")?
                .map(mysql_datetime_to_utc),
        };
        upsert_system_message(pg_pool, &legacy_message).await?;
    }

    let private_rows = sqlx::query(
        r#"
        SELECT id, sender, receiver, message, send_time, read_time
        FROM user_msg
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in private_rows {
        let legacy_message = LegacyPrivateMessageRow {
            message_id: row.try_get("id")?,
            sender: row.try_get("sender")?,
            receiver: row.try_get("receiver")?,
            message: row.try_get("message")?,
            send_time: mysql_datetime_to_utc(row.try_get("send_time")?),
            read_time: row
                .try_get::<Option<NaiveDateTime>, _>("read_time")?
                .map(mysql_datetime_to_utc),
        };
        upsert_private_message(pg_pool, &legacy_message).await?;
    }

    println!("Imported legacy system/private messages");
    Ok(())
}

async fn import_archives(mysql_pool: &MySqlPool, pg_pool: &PgPool) -> Result<()> {
    let hack_rows = sqlx::query(
        r#"
        SELECT id, problem_id, contest_id, submission_id, hacker, owner, input, input_type,
               submit_time, judge_time, success, details, is_hidden
        FROM hacks
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in hack_rows {
        let hack = LegacyHackRow {
            hack_id: row.try_get("id")?,
            problem_id: row.try_get("problem_id")?,
            contest_id: row.try_get("contest_id")?,
            submission_id: row.try_get("submission_id")?,
            hacker: row.try_get("hacker")?,
            owner: row.try_get("owner")?,
            input: row.try_get("input")?,
            input_type: row.try_get("input_type")?,
            submit_time: mysql_datetime_to_utc(row.try_get("submit_time")?),
            judge_time: row
                .try_get::<Option<NaiveDateTime>, _>("judge_time")?
                .map(mysql_datetime_to_utc),
            success: row.try_get("success")?,
            details_raw: row.try_get("details")?,
            is_hidden: row.try_get("is_hidden")?,
        };
        upsert_legacy_hack(pg_pool, &hack).await?;
    }

    let best_rows = sqlx::query(
        r#"
        SELECT problem_id, submitter, submission_id, used_time, used_memory, tot_size,
               shortest_id, shortest_used_time, shortest_used_memory, shortest_tot_size
        FROM best_ac_submissions
        ORDER BY problem_id ASC, submitter ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in best_rows {
        let best = LegacyBestAcSubmissionRow {
            problem_id: row.try_get("problem_id")?,
            submitter: row.try_get("submitter")?,
            submission_id: row.try_get("submission_id")?,
            used_time: row.try_get("used_time")?,
            used_memory: row.try_get("used_memory")?,
            total_size: row.try_get("tot_size")?,
            shortest_id: row.try_get("shortest_id")?,
            shortest_used_time: row.try_get("shortest_used_time")?,
            shortest_used_memory: row.try_get("shortest_used_memory")?,
            shortest_total_size: row.try_get("shortest_tot_size")?,
        };
        upsert_legacy_best_ac_submission(pg_pool, &best).await?;
    }

    let custom_rows = sqlx::query(
        r#"
        SELECT id, problem_id, submit_time, submitter, content, judge_time, result, status, status_details
        FROM custom_test_submissions
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in custom_rows {
        let custom = LegacyCustomTestSubmissionRow {
            custom_test_submission_id: row.try_get("id")?,
            problem_id: row.try_get("problem_id")?,
            submit_time: mysql_datetime_to_utc(row.try_get("submit_time")?),
            submitter: row.try_get("submitter")?,
            content: row.try_get("content")?,
            judge_time: row
                .try_get::<Option<NaiveDateTime>, _>("judge_time")?
                .map(mysql_datetime_to_utc),
            result_raw: row.try_get("result")?,
            status: row.try_get("status")?,
            status_details: row.try_get("status_details")?,
        };
        upsert_legacy_custom_test_submission(pg_pool, &custom).await?;
    }

    let judger_rows = sqlx::query(
        r#"
        SELECT judger_name, password, ip
        FROM judger_info
        ORDER BY judger_name ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in judger_rows {
        let judger = LegacyJudgerInfoRow {
            judger_name: row.try_get("judger_name")?,
            password: row.try_get("password")?,
            ip: row.try_get("ip")?,
        };
        upsert_legacy_judger_info(pg_pool, &judger).await?;
    }

    let search_request_rows = sqlx::query(
        r#"
        SELECT id, created_at, remote_addr, type, cache_id, q, content, result
        FROM search_requests
        ORDER BY id ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in search_request_rows {
        let request = LegacySearchRequestRow {
            search_request_id: row.try_get("id")?,
            created_at: mysql_datetime_to_utc(row.try_get("created_at")?),
            remote_addr: row.try_get("remote_addr")?,
            request_type: row.try_get("type")?,
            cache_id: row.try_get("cache_id")?,
            query: row.try_get("q")?,
            content: row.try_get("content")?,
            result: row.try_get("result")?,
        };
        upsert_legacy_search_request(pg_pool, &request).await?;
    }

    let paste_rows = sqlx::query(
        r#"
        SELECT `index`, creator, created_at, content
        FROM pastes
        ORDER BY created_at ASC, `index` ASC
        "#,
    )
    .fetch_all(mysql_pool)
    .await?;

    for row in paste_rows {
        let raw_index = row.try_get::<Option<String>, _>("index")?.unwrap_or_default();
        let Some(paste_index) = normalize_paste_index(&raw_index) else {
            continue;
        };

        let paste = LegacyPasteRow {
            paste_index,
            creator: row.try_get("creator")?,
            created_at: row
                .try_get::<Option<NaiveDateTime>, _>("created_at")?
                .map(mysql_datetime_to_utc),
            content: row.try_get("content")?,
        };
        upsert_legacy_paste(pg_pool, &paste).await?;
    }

    println!("Imported legacy archive-only entities");
    Ok(())
}

struct UpsertUserResult {
    was_inserted: bool,
}

async fn upsert_user(pg_pool: &PgPool, config: &ImportConfig, legacy_user: &LegacyUserRow) -> Result<UpsertUserResult> {
    let mut tx = pg_pool.begin().await?;

    let insert_result = sqlx::query(
        r#"
        INSERT INTO users (
            username,
            email,
            password_hash,
            display_name,
            organization_id,
            campus_id,
            status,
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active', COALESCE($7, NOW()), NOW())
        ON CONFLICT (username) DO UPDATE
        SET
            email = COALESCE(EXCLUDED.email, users.email),
            display_name = COALESCE(users.display_name, EXCLUDED.display_name),
            organization_id = EXCLUDED.organization_id,
            campus_id = COALESCE(EXCLUDED.campus_id, users.campus_id)
        RETURNING id, (xmax = 0) AS inserted
        "#,
    )
    .bind(&legacy_user.username)
    .bind(&legacy_user.email)
    .bind("!legacy-md5!")
    .bind(&legacy_user.username)
    .bind(config.organization_id)
    .bind(config.campus_id)
    .bind(legacy_user.register_time)
    .fetch_one(&mut *tx)
    .await?;

    let user_id: Uuid = insert_result.try_get("id")?;
    let inserted: bool = insert_result.try_get("inserted")?;

    sqlx::query(
        r#"
        INSERT INTO user_roles (user_id, organization_id, campus_id, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(config.organization_id)
    .bind(config.campus_id)
    .bind(map_legacy_usergroup_to_role(&legacy_user.usergroup))
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO user_competitive_stats (user_id, ac_count, contest_rating)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE
        SET
            ac_count = EXCLUDED.ac_count,
            contest_rating = EXCLUDED.contest_rating
        "#,
    )
    .bind(user_id)
    .bind(i64::from(legacy_user.ac_num))
    .bind(legacy_user.rating)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_users (
            legacy_username,
            user_id,
            legacy_usergroup,
            legacy_password_md5,
            legacy_svn_password,
            legacy_rating,
            legacy_qq,
            legacy_sex,
            legacy_ac_num,
            legacy_register_time,
            legacy_remote_addr,
            legacy_http_x_forwarded_for,
            legacy_remember_token,
            legacy_motto
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (legacy_username) DO UPDATE
        SET
            user_id = EXCLUDED.user_id,
            legacy_usergroup = EXCLUDED.legacy_usergroup,
            legacy_password_md5 = EXCLUDED.legacy_password_md5,
            legacy_svn_password = EXCLUDED.legacy_svn_password,
            legacy_rating = EXCLUDED.legacy_rating,
            legacy_qq = EXCLUDED.legacy_qq,
            legacy_sex = EXCLUDED.legacy_sex,
            legacy_ac_num = EXCLUDED.legacy_ac_num,
            legacy_register_time = EXCLUDED.legacy_register_time,
            legacy_remote_addr = EXCLUDED.legacy_remote_addr,
            legacy_http_x_forwarded_for = EXCLUDED.legacy_http_x_forwarded_for,
            legacy_remember_token = EXCLUDED.legacy_remember_token,
            legacy_motto = EXCLUDED.legacy_motto
        "#,
    )
    .bind(&legacy_user.username)
    .bind(user_id)
    .bind(normalize_legacy_char(&legacy_user.usergroup, "U"))
    .bind(&legacy_user.password_md5)
    .bind(&legacy_user.svn_password)
    .bind(legacy_user.rating)
    .bind(legacy_user.qq)
    .bind(normalize_legacy_char(&legacy_user.sex, "U"))
    .bind(legacy_user.ac_num)
    .bind(legacy_user.register_time)
    .bind(&legacy_user.remote_addr)
    .bind(&legacy_user.http_x_forwarded_for)
    .bind(&legacy_user.remember_token)
    .bind(&legacy_user.motto)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(UpsertUserResult {
        was_inserted: inserted,
    })
}

fn map_legacy_usergroup_to_role(usergroup: &str) -> &'static str {
    match usergroup {
        "T" => "teacher",
        "U" | "S" => "student",
        _ => "root",
    }
}

fn normalize_legacy_char(value: &str, fallback: &str) -> String {
    value.chars().next().map(|ch| ch.to_string()).unwrap_or_else(|| fallback.to_string())
}

fn mysql_datetime_to_utc(value: NaiveDateTime) -> DateTime<Utc> {
    DateTime::<Utc>::from_naive_utc_and_offset(value, Utc)
}

fn derive_contest_rule(extra_config: &str) -> &'static str {
    let config = extra_config.to_ascii_lowercase();
    if config.contains("oi") || config.contains("ioi") {
        "ioi"
    } else if config.contains("education") {
        "education"
    } else {
        "acm"
    }
}

fn derive_problem_author_note(submission_requirement: Option<&str>) -> Option<String> {
    submission_requirement
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn legacy_article_slug(article_id: i64) -> String {
    format!("legacy-blog-{}", article_id)
}

fn map_legacy_article_category(article_type: &str) -> &'static str {
    match article_type {
        "S" => "solution",
        "N" => "notice",
        "T" => "tutorial",
        _ => "general",
    }
}

fn map_legacy_like_target_type(raw_type: &str) -> Option<&'static str> {
    match raw_type.to_ascii_uppercase().as_str() {
        "B" => Some("article"),
        "BC" => Some("comment"),
        "P" => Some("problem"),
        "C" => Some("contest"),
        "D" => Some("discussion"),
        "DC" => Some("reply"),
        _ => None,
    }
}

fn map_legacy_verdict_token(token: &str) -> Option<&'static str> {
    match token.trim().to_ascii_lowercase().replace(' ', "_").as_str() {
        "accepted" | "accept" | "ac" => Some("ac"),
        "wrong_answer" | "wronganswer" | "wa" => Some("wa"),
        "runtime_error" | "runtimeerror" | "re" | "rte" => Some("rte"),
        "time_limit_exceeded" | "timelimitexceeded" | "tle" => Some("tle"),
        "memory_limit_exceeded" | "memorylimitexceeded" | "mle" => Some("mle"),
        "output_limit_exceeded" | "outputlimitexceeded" | "ole" => Some("ole"),
        "compile_error" | "compileerror" | "ce" => Some("ce"),
        "system_error" | "systemerror" | "judgement_failed" | "judge_failed" | "ie" => Some("ie"),
        _ => None,
    }
}

fn parse_i32_from_value(value: &Value) -> Option<i32> {
    value.as_i64().and_then(|raw| i32::try_from(raw).ok())
}

fn parse_legacy_case_from_value(value: &Value) -> Option<ParsedLegacyTestCaseResult> {
    let object = value.as_object()?;
    let verdict = object
        .get("verdict")
        .or_else(|| object.get("status"))
        .or_else(|| object.get("result"))
        .or_else(|| object.get("info"))
        .and_then(Value::as_str)
        .and_then(map_legacy_verdict_token)?
        .to_string();
    let time_ms = object
        .get("time_ms")
        .or_else(|| object.get("time"))
        .and_then(parse_i32_from_value);
    let memory_kb = object
        .get("memory_kb")
        .or_else(|| object.get("memory"))
        .and_then(parse_i32_from_value);

    Some(ParsedLegacyTestCaseResult {
        verdict,
        time_ms,
        memory_kb,
    })
}

fn parse_legacy_test_case_results(bytes: &[u8]) -> Vec<ParsedLegacyTestCaseResult> {
    let Ok(text) = std::str::from_utf8(bytes) else {
        return Vec::new();
    };

    if let Ok(value) = serde_json::from_str::<Value>(text) {
        let array = match &value {
            Value::Array(items) => Some(items.clone()),
            Value::Object(map) => ["details", "tests", "testcases", "subtasks"]
                .iter()
                .find_map(|key| map.get(*key).and_then(Value::as_array).cloned()),
            _ => None,
        };

        if let Some(items) = array {
            let parsed = items
                .iter()
                .filter_map(parse_legacy_case_from_value)
                .collect::<Vec<_>>();
            if !parsed.is_empty() {
                return parsed;
            }
        }
    }

    let verdict_pattern = regex::Regex::new(
        "(?i)(accepted|wrong[_ ]answer|runtime[_ ]error|time[_ ]limit[_ ]exceeded|memory[_ ]limit[_ ]exceeded|output[_ ]limit[_ ]exceeded|compile[_ ]error|system[_ ]error|judgement[_ ]failed|\\bac\\b|\\bwa\\b|\\bre\\b|\\brte\\b|\\btle\\b|\\bmle\\b|\\bole\\b|\\bce\\b|\\bie\\b)"
    )
    .expect("legacy verdict regex should compile");

    verdict_pattern
        .find_iter(text)
        .filter_map(|matched| map_legacy_verdict_token(matched.as_str()))
        .map(|verdict| ParsedLegacyTestCaseResult {
            verdict: verdict.to_string(),
            time_ms: None,
            memory_kb: None,
        })
        .collect()
}

fn normalize_search_request_type(raw: &str) -> &'static str {
    match raw.trim().to_ascii_lowercase().as_str() {
        "autocomplete" => "autocomplete",
        _ => "search",
    }
}

fn normalize_paste_index(raw: &str) -> Option<String> {
    let normalized = raw.trim();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized.to_string())
    }
}

fn normalize_submission_language(language: &str) -> &'static str {
    match language.to_ascii_lowercase().as_str() {
        "python" | "python3" => "python3",
        "c" => "c",
        "cpp" | "c++" => "cpp",
        "java" => "java",
        "go" => "go",
        "rust" => "rust",
        "javascript" | "js" => "javascript",
        "typescript" | "ts" => "typescript",
        "ruby" => "ruby",
        "php" => "php",
        _ => "python3",
    }
}

fn map_submission_status(status: &str) -> (&'static str, Option<&'static str>) {
    match status.to_ascii_lowercase().as_str() {
        "accepted" | "accept" | "ac" => ("judged", Some("ac")),
        "wrong_answer" | "wa" => ("judged", Some("wa")),
        "runtime_error" | "re" | "rte" => ("judged", Some("rte")),
        "time_limit_exceeded" | "tle" => ("judged", Some("tle")),
        "memory_limit_exceeded" | "mle" => ("judged", Some("mle")),
        "output_limit_exceeded" | "ole" => ("judged", Some("ole")),
        "compile_error" | "ce" => ("judged", Some("ce")),
        "system_error" | "judgement_failed" | "ie" => ("failed", Some("ie")),
        "judged" => ("judged", None),
        "running" => ("running", None),
        "compiling" => ("compiling", None),
        _ => ("queued", None),
    }
}

async fn resolve_problem_author_id(pg_pool: &PgPool, config: &ImportConfig) -> Result<Uuid> {
    if let Some(username) = &config.author_username {
        let user_id = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM users WHERE username = $1 AND organization_id = $2"
        )
        .bind(username)
        .bind(config.organization_id)
        .fetch_optional(pg_pool)
        .await?;

        if let Some(user_id) = user_id {
            return Ok(user_id);
        }
    }

    sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT u.id
        FROM users u
        WHERE u.organization_id = $1
        ORDER BY u.created_at ASC
        LIMIT 1
        "#,
    )
    .bind(config.organization_id)
    .fetch_optional(pg_pool)
    .await?
    .context("no users found for IMPORT_ORGANIZATION_ID; import users first or set IMPORT_AUTHOR_USERNAME")
}

async fn upsert_problem(
    pg_pool: &PgPool,
    config: &ImportConfig,
    author_id: Uuid,
    legacy_problem: &LegacyProblemRow,
) -> Result<bool> {
    let mut tx = pg_pool.begin().await?;
    let description = legacy_problem
        .statement_html
        .clone()
        .or_else(|| legacy_problem.statement_md.clone())
        .unwrap_or_else(|| legacy_problem.title.clone());
    let visibility = if legacy_problem.is_hidden { "private" } else { "public" };

    let insert_result = sqlx::query(
        r#"
        INSERT INTO problems (
            id,
            organization_id,
            campus_id,
            author_id,
            title,
            description,
            difficulty,
            visibility,
            tags,
            source_url,
            author_note
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'medium', $7, $8, NULL, $9)
        ON CONFLICT (id) DO UPDATE
        SET
            organization_id = EXCLUDED.organization_id,
            campus_id = EXCLUDED.campus_id,
            author_id = EXCLUDED.author_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            visibility = EXCLUDED.visibility,
            tags = EXCLUDED.tags,
            author_note = EXCLUDED.author_note,
            updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
        "#,
    )
    .bind(legacy_problem.problem_id)
    .bind(config.organization_id)
    .bind(config.campus_id)
    .bind(author_id)
    .bind(&legacy_problem.title)
    .bind(&description)
    .bind(visibility)
    .bind(&legacy_problem.tags)
    .bind(derive_problem_author_note(
        legacy_problem.submission_requirement.as_deref(),
    ))
    .fetch_one(&mut *tx)
    .await?;

    let inserted: bool = insert_result.try_get("inserted")?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_problems (
            legacy_problem_id,
            problem_id,
            legacy_is_hidden,
            legacy_submission_requirement,
            legacy_hackable,
            legacy_extra_config,
            legacy_zan,
            legacy_ac_num,
            legacy_submit_num,
            legacy_statement_html,
            legacy_statement_md
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (legacy_problem_id) DO UPDATE
        SET
            problem_id = EXCLUDED.problem_id,
            legacy_is_hidden = EXCLUDED.legacy_is_hidden,
            legacy_submission_requirement = EXCLUDED.legacy_submission_requirement,
            legacy_hackable = EXCLUDED.legacy_hackable,
            legacy_extra_config = EXCLUDED.legacy_extra_config,
            legacy_zan = EXCLUDED.legacy_zan,
            legacy_ac_num = EXCLUDED.legacy_ac_num,
            legacy_submit_num = EXCLUDED.legacy_submit_num,
            legacy_statement_html = EXCLUDED.legacy_statement_html,
            legacy_statement_md = EXCLUDED.legacy_statement_md
        "#,
    )
    .bind(legacy_problem.problem_id)
    .bind(legacy_problem.problem_id)
    .bind(legacy_problem.is_hidden)
    .bind(&legacy_problem.submission_requirement)
    .bind(legacy_problem.hackable)
    .bind(&legacy_problem.extra_config)
    .bind(legacy_problem.zan)
    .bind(legacy_problem.ac_num)
    .bind(legacy_problem.submit_num)
    .bind(&legacy_problem.statement_html)
    .bind(&legacy_problem.statement_md)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM legacy_uoj_problem_tags WHERE legacy_problem_id = $1")
        .bind(legacy_problem.problem_id)
        .execute(&mut *tx)
        .await?;

    for tag in &legacy_problem.tags {
        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_problem_tags (legacy_problem_id, problem_id, tag)
            VALUES ($1, $2, $3)
            ON CONFLICT (legacy_problem_id, tag) DO UPDATE
            SET problem_id = EXCLUDED.problem_id
            "#,
        )
        .bind(legacy_problem.problem_id)
        .bind(legacy_problem.problem_id)
        .bind(tag)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(inserted)
}

async fn upsert_contest(
    pg_pool: &PgPool,
    config: &ImportConfig,
    legacy_contest: &LegacyContestRow,
    contest_problem_ids: Vec<i64>,
) -> Result<bool> {
    let mut tx = pg_pool.begin().await?;
    let end_time = legacy_contest.start_time + chrono::Duration::minutes(i64::from(legacy_contest.last_min));
    let rules = derive_contest_rule(&legacy_contest.extra_config);

    let insert_result = sqlx::query(
        r#"
        INSERT INTO contests (
            id,
            organization_id,
            campus_id,
            name,
            description,
            rules,
            start_time,
            end_time
        )
        VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
        SET
            organization_id = EXCLUDED.organization_id,
            campus_id = EXCLUDED.campus_id,
            name = EXCLUDED.name,
            rules = EXCLUDED.rules,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
        "#,
    )
    .bind(legacy_contest.contest_id)
    .bind(config.organization_id)
    .bind(config.campus_id)
    .bind(&legacy_contest.name)
    .bind(rules)
    .bind(legacy_contest.start_time)
    .bind(end_time)
    .fetch_one(&mut *tx)
    .await?;
    let inserted: bool = insert_result.try_get("inserted")?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_contests (
            legacy_contest_id,
            contest_id,
            legacy_last_min,
            legacy_player_num,
            legacy_status,
            legacy_extra_config,
            legacy_zan
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (legacy_contest_id) DO UPDATE
        SET
            contest_id = EXCLUDED.contest_id,
            legacy_last_min = EXCLUDED.legacy_last_min,
            legacy_player_num = EXCLUDED.legacy_player_num,
            legacy_status = EXCLUDED.legacy_status,
            legacy_extra_config = EXCLUDED.legacy_extra_config,
            legacy_zan = EXCLUDED.legacy_zan
        "#,
    )
    .bind(legacy_contest.contest_id)
    .bind(legacy_contest.contest_id)
    .bind(legacy_contest.last_min)
    .bind(legacy_contest.player_num)
    .bind(&legacy_contest.status)
    .bind(&legacy_contest.extra_config)
    .bind(legacy_contest.zan)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM contest_problems WHERE contest_id = $1")
        .bind(legacy_contest.contest_id)
        .execute(&mut *tx)
        .await?;

    for (order_index, problem_id) in contest_problem_ids.into_iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO contest_problems (contest_id, problem_id, points, order_index)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (contest_id, problem_id) DO UPDATE
            SET points = EXCLUDED.points, order_index = EXCLUDED.order_index
            "#,
        )
        .bind(legacy_contest.contest_id)
        .bind(problem_id)
        .bind(if rules == "ioi" { 100 } else { 1 })
        .bind(order_index as i32)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(inserted)
}

async fn sync_contest_registrations(pg_pool: &PgPool, rows: Vec<sqlx::mysql::MySqlRow>) -> Result<()> {
    for row in rows {
        let contest_id: i64 = row.try_get("contest_id")?;
        let username: String = row.try_get("username")?;
        let user_rating: i32 = row.try_get("user_rating")?;
        let has_participated: bool = row.try_get("has_participated")?;
        let rank: i32 = row.try_get("rank")?;
        let user_id = resolve_user_id_by_username(pg_pool, &username).await?;

        sqlx::query(
            r#"
            INSERT INTO contest_participants (contest_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (contest_id, user_id) DO NOTHING
            "#,
        )
        .bind(contest_id)
        .bind(user_id)
        .execute(pg_pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_contest_registrations (
                legacy_contest_id, contest_id, legacy_username, user_id,
                legacy_user_rating, legacy_has_participated, legacy_rank
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (legacy_contest_id, legacy_username) DO UPDATE
            SET
                contest_id = EXCLUDED.contest_id,
                user_id = EXCLUDED.user_id,
                legacy_user_rating = EXCLUDED.legacy_user_rating,
                legacy_has_participated = EXCLUDED.legacy_has_participated,
                legacy_rank = EXCLUDED.legacy_rank
            "#,
        )
        .bind(contest_id)
        .bind(contest_id)
        .bind(&username)
        .bind(user_id)
        .bind(user_rating)
        .bind(has_participated)
        .bind(rank)
        .execute(pg_pool)
        .await?;
    }
    Ok(())
}

async fn sync_contest_submission_details(pg_pool: &PgPool, rows: Vec<sqlx::mysql::MySqlRow>) -> Result<()> {
    for row in rows {
        let contest_id: i64 = row.try_get("contest_id")?;
        let username: String = row.try_get("submitter")?;
        let problem_id: i64 = row.try_get("problem_id")?;
        let submission_id: i64 = row.try_get("submission_id")?;
        let score: i32 = row.try_get("score")?;
        let penalty: i32 = row.try_get("penalty")?;
        let user_id = resolve_user_id_by_username(pg_pool, &username).await?;

        sqlx::query(
            r#"
            INSERT INTO contest_submissions (contest_id, submission_id, penalty_time)
            VALUES ($1, $2, $3)
            ON CONFLICT (submission_id) DO UPDATE
            SET contest_id = EXCLUDED.contest_id, penalty_time = EXCLUDED.penalty_time
            "#,
        )
        .bind(contest_id)
        .bind(submission_id)
        .bind(penalty)
        .execute(pg_pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_contest_submission_details (
                legacy_contest_id, contest_id, legacy_username, user_id, legacy_problem_id,
                problem_id, legacy_submission_id, submission_id, legacy_score, legacy_penalty
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (legacy_contest_id, legacy_username, legacy_problem_id) DO UPDATE
            SET
                contest_id = EXCLUDED.contest_id,
                user_id = EXCLUDED.user_id,
                problem_id = EXCLUDED.problem_id,
                legacy_submission_id = EXCLUDED.legacy_submission_id,
                submission_id = EXCLUDED.submission_id,
                legacy_score = EXCLUDED.legacy_score,
                legacy_penalty = EXCLUDED.legacy_penalty
            "#,
        )
        .bind(contest_id)
        .bind(contest_id)
        .bind(&username)
        .bind(user_id)
        .bind(problem_id)
        .bind(problem_id)
        .bind(submission_id)
        .bind(submission_id)
        .bind(score)
        .bind(penalty)
        .execute(pg_pool)
        .await?;
    }
    Ok(())
}

async fn sync_contest_permissions(pg_pool: &PgPool, rows: Vec<sqlx::mysql::MySqlRow>) -> Result<()> {
    for row in rows {
        let contest_id: i64 = row.try_get("contest_id")?;
        let username: String = row.try_get("username")?;
        let user_id = resolve_user_id_by_username(pg_pool, &username).await?;
        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_contest_permissions (legacy_contest_id, contest_id, legacy_username, user_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (legacy_contest_id, legacy_username) DO UPDATE
            SET contest_id = EXCLUDED.contest_id, user_id = EXCLUDED.user_id
            "#,
        )
        .bind(contest_id)
        .bind(contest_id)
        .bind(&username)
        .bind(user_id)
        .execute(pg_pool)
        .await?;
    }
    Ok(())
}

async fn sync_contest_asks(pg_pool: &PgPool, rows: Vec<sqlx::mysql::MySqlRow>) -> Result<()> {
    for row in rows {
        let ask_id: i64 = row.try_get("id")?;
        let contest_id: i64 = row.try_get("contest_id")?;
        let username: String = row.try_get("username")?;
        let user_id = resolve_user_id_by_username(pg_pool, &username).await?;
        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_contest_asks (
                legacy_ask_id, legacy_contest_id, contest_id, legacy_username, user_id,
                legacy_question, legacy_answer, legacy_post_time, legacy_reply_time, legacy_is_hidden
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (legacy_ask_id) DO UPDATE
            SET
                contest_id = EXCLUDED.contest_id,
                user_id = EXCLUDED.user_id,
                legacy_question = EXCLUDED.legacy_question,
                legacy_answer = EXCLUDED.legacy_answer,
                legacy_post_time = EXCLUDED.legacy_post_time,
                legacy_reply_time = EXCLUDED.legacy_reply_time,
                legacy_is_hidden = EXCLUDED.legacy_is_hidden
            "#,
        )
        .bind(ask_id)
        .bind(contest_id)
        .bind(contest_id)
        .bind(&username)
        .bind(user_id)
        .bind(row.try_get::<String, _>("question")?)
        .bind(row.try_get::<String, _>("answer")?)
        .bind(mysql_datetime_to_utc(row.try_get("post_time")?))
        .bind(row.try_get::<Option<NaiveDateTime>, _>("reply_time")?.map(mysql_datetime_to_utc))
        .bind(row.try_get::<bool, _>("is_hidden")?)
        .execute(pg_pool)
        .await?;
    }
    Ok(())
}

fn unique_notice_contest_ids(rows: &[LegacyContestNoticeRow]) -> Vec<i64> {
    let mut ids = rows.iter().map(|row| row.contest_id).collect::<Vec<_>>();
    ids.sort_unstable();
    ids.dedup();
    ids
}

async fn sync_contest_notices(pg_pool: &PgPool, rows: &[LegacyContestNoticeRow]) -> Result<()> {
    for contest_id in unique_notice_contest_ids(rows) {
        sqlx::query("DELETE FROM legacy_uoj_contest_notices WHERE legacy_contest_id = $1")
            .bind(contest_id)
            .execute(pg_pool)
            .await?;
    }

    for row in rows {
        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_contest_notices (legacy_contest_id, contest_id, legacy_title, legacy_content, legacy_time)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(row.contest_id)
        .bind(row.contest_id)
        .bind(&row.title)
        .bind(&row.content)
        .bind(row.time)
        .execute(pg_pool)
        .await?;
    }
    Ok(())
}

async fn upsert_submission(pg_pool: &PgPool, config: &ImportConfig, legacy_submission: &LegacySubmissionRow) -> Result<bool> {
    let mut tx = pg_pool.begin().await?;
    let user_id = resolve_user_id_by_username(&mut *tx, &legacy_submission.submitter).await?;
    let (runtime_status, verdict) = map_submission_status(&legacy_submission.status);
    let normalized_language = normalize_submission_language(&legacy_submission.language);

    let insert_result = sqlx::query(
        r#"
        INSERT INTO submissions (
            id, organization_id, user_id, problem_id, language, code, status, verdict,
            score, result_error, status_details, is_hidden, time_ms, memory_kb, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, $14))
        ON CONFLICT (id) DO UPDATE
        SET
            organization_id = EXCLUDED.organization_id,
            user_id = EXCLUDED.user_id,
            problem_id = EXCLUDED.problem_id,
            language = EXCLUDED.language,
            code = EXCLUDED.code,
            status = EXCLUDED.status,
            verdict = EXCLUDED.verdict,
            score = EXCLUDED.score,
            result_error = EXCLUDED.result_error,
            status_details = EXCLUDED.status_details,
            is_hidden = EXCLUDED.is_hidden,
            time_ms = EXCLUDED.time_ms,
            memory_kb = EXCLUDED.memory_kb,
            updated_at = COALESCE(EXCLUDED.updated_at, submissions.updated_at)
        RETURNING (xmax = 0) AS inserted
        "#,
    )
    .bind(legacy_submission.submission_id)
    .bind(config.organization_id)
    .bind(user_id)
    .bind(legacy_submission.legacy_problem_id)
    .bind(normalized_language)
    .bind(&legacy_submission.code)
    .bind(runtime_status)
    .bind(verdict)
    .bind(legacy_submission.score)
    .bind(&legacy_submission.result_error)
    .bind(&legacy_submission.status_details)
    .bind(legacy_submission.is_hidden)
    .bind(legacy_submission.used_time)
    .bind(legacy_submission.used_memory)
    .bind(legacy_submission.submit_time)
    .bind(legacy_submission.judge_time)
    .fetch_one(&mut *tx)
    .await?;
    let inserted: bool = insert_result.try_get("inserted")?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_submissions (
            legacy_submission_id, submission_id, legacy_problem_id, problem_id, legacy_contest_id,
            contest_id, legacy_submitter, user_id, legacy_tot_size, legacy_judge_time, legacy_result_raw,
            legacy_status, legacy_result_error, legacy_score, legacy_used_time, legacy_used_memory,
            legacy_is_hidden, legacy_status_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (legacy_submission_id) DO UPDATE
        SET
            submission_id = EXCLUDED.submission_id,
            problem_id = EXCLUDED.problem_id,
            contest_id = EXCLUDED.contest_id,
            user_id = EXCLUDED.user_id,
            legacy_tot_size = EXCLUDED.legacy_tot_size,
            legacy_judge_time = EXCLUDED.legacy_judge_time,
            legacy_result_raw = EXCLUDED.legacy_result_raw,
            legacy_status = EXCLUDED.legacy_status,
            legacy_result_error = EXCLUDED.legacy_result_error,
            legacy_score = EXCLUDED.legacy_score,
            legacy_used_time = EXCLUDED.legacy_used_time,
            legacy_used_memory = EXCLUDED.legacy_used_memory,
            legacy_is_hidden = EXCLUDED.legacy_is_hidden,
            legacy_status_details = EXCLUDED.legacy_status_details
        "#,
    )
    .bind(legacy_submission.submission_id)
    .bind(legacy_submission.submission_id)
    .bind(legacy_submission.legacy_problem_id)
    .bind(legacy_submission.legacy_problem_id)
    .bind(legacy_submission.legacy_contest_id)
    .bind(legacy_submission.legacy_contest_id)
    .bind(&legacy_submission.submitter)
    .bind(user_id)
    .bind(legacy_submission.total_size)
    .bind(legacy_submission.judge_time)
    .bind(&legacy_submission.result_raw)
    .bind(&legacy_submission.status)
    .bind(&legacy_submission.result_error)
    .bind(legacy_submission.score)
    .bind(legacy_submission.used_time)
    .bind(legacy_submission.used_memory)
    .bind(legacy_submission.is_hidden)
    .bind(&legacy_submission.status_details)
    .execute(&mut *tx)
    .await?;

    sync_submission_test_case_results(
        &mut *tx,
        legacy_submission.submission_id,
        legacy_submission.legacy_problem_id,
        &legacy_submission.result_raw,
    )
    .await?;

    tx.commit().await?;
    Ok(inserted)
}

async fn sync_submission_test_case_results(
    tx: &mut sqlx::PgConnection,
    submission_id: i64,
    problem_id: i64,
    result_raw: &[u8],
) -> Result<()> {
    let parsed = parse_legacy_test_case_results(result_raw);
    if parsed.is_empty() {
        return Ok(());
    }

    let test_case_ids = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM test_cases
        WHERE problem_id = $1
        ORDER BY order_index ASC, id ASC
        "#,
    )
    .bind(problem_id)
    .fetch_all(&mut *tx)
    .await?;

    if test_case_ids.is_empty() {
        return Ok(());
    }

    for (test_case_id, parsed_case) in test_case_ids.into_iter().zip(parsed.into_iter()) {
        sqlx::query(
            r#"
            INSERT INTO test_case_results (submission_id, test_case_id, verdict, time_ms, memory_kb)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (submission_id, test_case_id) DO UPDATE
            SET
                verdict = EXCLUDED.verdict,
                time_ms = EXCLUDED.time_ms,
                memory_kb = EXCLUDED.memory_kb
            "#,
        )
        .bind(submission_id)
        .bind(test_case_id)
        .bind(&parsed_case.verdict)
        .bind(parsed_case.time_ms)
        .bind(parsed_case.memory_kb)
        .execute(&mut *tx)
        .await?;
    }

    Ok(())
}

async fn upsert_article(pg_pool: &PgPool, legacy_article: &LegacyArticleRow) -> Result<bool> {
    let mut tx = pg_pool.begin().await?;
    let author_id = resolve_user_id_by_username(&mut *tx, &legacy_article.poster).await?;
    let content = if legacy_article.content_md.trim().is_empty() {
        legacy_article.content_html.clone()
    } else {
        legacy_article.content_md.clone()
    };
    let is_published = !(legacy_article.is_hidden || legacy_article.is_draft);
    let is_featured = legacy_article.important_level.unwrap_or_default() > 0;

    let insert_result = sqlx::query(
        r#"
        INSERT INTO articles (
            id, title, slug, content, summary, cover_image, author_id, tags, category,
            is_published, is_featured, like_count, created_at, updated_at, published_at
        )
        VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, $7, $8, $9, $10, $11, $11, $12)
        ON CONFLICT (id) DO UPDATE
        SET
            title = EXCLUDED.title,
            slug = EXCLUDED.slug,
            content = EXCLUDED.content,
            author_id = EXCLUDED.author_id,
            tags = EXCLUDED.tags,
            category = EXCLUDED.category,
            is_published = EXCLUDED.is_published,
            is_featured = EXCLUDED.is_featured,
            like_count = EXCLUDED.like_count,
            published_at = EXCLUDED.published_at,
            updated_at = EXCLUDED.updated_at
        RETURNING (xmax = 0) AS inserted
        "#,
    )
    .bind(legacy_article.article_id)
    .bind(&legacy_article.title)
    .bind(legacy_article_slug(legacy_article.article_id))
    .bind(&content)
    .bind(author_id)
    .bind(&legacy_article.tags)
    .bind(map_legacy_article_category(&legacy_article.article_type))
    .bind(is_published)
    .bind(is_featured)
    .bind(i64::from(legacy_article.zan))
    .bind(legacy_article.post_time)
    .bind(if is_published { Some(legacy_article.post_time) } else { None })
    .fetch_one(&mut *tx)
    .await?;
    let inserted: bool = insert_result.try_get("inserted")?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_articles (
            legacy_blog_id, article_id, legacy_title, legacy_content_html, legacy_content_md,
            legacy_post_time, legacy_poster, author_id, legacy_zan, legacy_is_hidden,
            legacy_type, legacy_is_draft, legacy_important_level
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (legacy_blog_id) DO UPDATE
        SET
            article_id = EXCLUDED.article_id,
            legacy_title = EXCLUDED.legacy_title,
            legacy_content_html = EXCLUDED.legacy_content_html,
            legacy_content_md = EXCLUDED.legacy_content_md,
            legacy_post_time = EXCLUDED.legacy_post_time,
            legacy_poster = EXCLUDED.legacy_poster,
            author_id = EXCLUDED.author_id,
            legacy_zan = EXCLUDED.legacy_zan,
            legacy_is_hidden = EXCLUDED.legacy_is_hidden,
            legacy_type = EXCLUDED.legacy_type,
            legacy_is_draft = EXCLUDED.legacy_is_draft,
            legacy_important_level = EXCLUDED.legacy_important_level
        "#,
    )
    .bind(legacy_article.article_id)
    .bind(legacy_article.article_id)
    .bind(&legacy_article.title)
    .bind(&legacy_article.content_html)
    .bind(&legacy_article.content_md)
    .bind(legacy_article.post_time)
    .bind(&legacy_article.poster)
    .bind(author_id)
    .bind(legacy_article.zan)
    .bind(legacy_article.is_hidden)
    .bind(normalize_legacy_char(&legacy_article.article_type, "B"))
    .bind(legacy_article.is_draft)
    .bind(legacy_article.important_level)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM legacy_uoj_article_tags WHERE legacy_blog_id = $1")
        .bind(legacy_article.article_id)
        .execute(&mut *tx)
        .await?;

    for tag in &legacy_article.tags {
        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_article_tags (legacy_blog_id, article_id, tag)
            VALUES ($1, $2, $3)
            ON CONFLICT (legacy_blog_id, tag) DO UPDATE
            SET article_id = EXCLUDED.article_id
            "#,
        )
        .bind(legacy_article.article_id)
        .bind(legacy_article.article_id)
        .bind(tag)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(inserted)
}

async fn sync_article_comments(pg_pool: &PgPool, rows: &[LegacyArticleCommentRow]) -> Result<()> {
    for row in rows {
        let author_id = resolve_user_id_by_username(pg_pool, &row.poster).await?;
        let parent_id = if row.reply_id > 0 { Some(i64::from(row.reply_id)) } else { None };

        sqlx::query(
            r#"
            INSERT INTO article_comments (
                id, article_id, parent_id, content, author_id, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            ON CONFLICT (id) DO UPDATE
            SET
                article_id = EXCLUDED.article_id,
                parent_id = EXCLUDED.parent_id,
                content = EXCLUDED.content,
                author_id = EXCLUDED.author_id,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(row.comment_id)
        .bind(row.article_id)
        .bind(parent_id)
        .bind(&row.content)
        .bind(author_id)
        .bind(row.post_time)
        .execute(pg_pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_article_comments (
                legacy_comment_id, article_comment_id, legacy_blog_id, article_id, legacy_reply_id,
                parent_comment_id, legacy_poster, author_id, legacy_content, legacy_post_time, legacy_zan
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (legacy_comment_id) DO UPDATE
            SET
                article_comment_id = EXCLUDED.article_comment_id,
                article_id = EXCLUDED.article_id,
                parent_comment_id = EXCLUDED.parent_comment_id,
                author_id = EXCLUDED.author_id,
                legacy_content = EXCLUDED.legacy_content,
                legacy_post_time = EXCLUDED.legacy_post_time,
                legacy_zan = EXCLUDED.legacy_zan
            "#,
        )
        .bind(row.comment_id)
        .bind(row.comment_id)
        .bind(row.article_id)
        .bind(row.article_id)
        .bind(row.reply_id)
        .bind(parent_id)
        .bind(&row.poster)
        .bind(author_id)
        .bind(&row.content)
        .bind(row.post_time)
        .bind(row.zan)
        .execute(pg_pool)
        .await?;
    }

    sqlx::query(
        r#"
        UPDATE articles a
        SET comment_count = counts.comment_count
        FROM (
            SELECT article_id, COUNT(*)::bigint AS comment_count
            FROM article_comments
            GROUP BY article_id
        ) counts
        WHERE a.id = counts.article_id
        "#
    )
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn sync_click_zans(pg_pool: &PgPool, rows: Vec<sqlx::mysql::MySqlRow>) -> Result<()> {
    for row in rows {
        let raw_type: String = row.try_get("type")?;
        let username: String = row.try_get("username")?;
        let user_id = resolve_user_id_by_username(pg_pool, &username).await?;
        let target_id: i64 = row.try_get("target_id")?;
        let mapped_target_type = map_legacy_like_target_type(&raw_type).map(str::to_string);
        let val = i16::from(row.try_get::<i8, _>("val")?);
        sqlx::query(
            r#"
            INSERT INTO legacy_uoj_click_zans (
                raw_type, legacy_target_id, legacy_username, user_id, val, mapped_target_type, mapped_target_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (raw_type, legacy_target_id, legacy_username) DO UPDATE
            SET
                user_id = EXCLUDED.user_id,
                val = EXCLUDED.val,
                mapped_target_type = EXCLUDED.mapped_target_type,
                mapped_target_id = EXCLUDED.mapped_target_id
            "#,
        )
        .bind(normalize_legacy_char(&raw_type, "B"))
        .bind(target_id)
        .bind(&username)
        .bind(user_id)
        .bind(val)
        .bind(&mapped_target_type)
        .bind(mapped_target_type.as_ref().map(|_| target_id))
        .execute(pg_pool)
        .await?;

        if val > 0 {
            if let Some(target_type) = mapped_target_type.as_deref() {
                sqlx::query(
                    r#"
                    INSERT INTO likes (user_id, target_type, target_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id, target_type, target_id) DO NOTHING
                    "#,
                )
                .bind(user_id)
                .bind(target_type)
                .bind(target_id)
                .execute(pg_pool)
                .await?;
            }
        } else if let Some(target_type) = mapped_target_type.as_deref() {
            sqlx::query("DELETE FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3")
                .bind(user_id)
                .bind(target_type)
                .bind(target_id)
                .execute(pg_pool)
                .await?;
        }
    }

    sqlx::query(
        r#"
        UPDATE articles a
        SET like_count = counts.like_count
        FROM (
            SELECT target_id, COUNT(*)::bigint AS like_count
            FROM likes
            WHERE target_type = 'article'
            GROUP BY target_id
        ) counts
        WHERE a.id = counts.target_id
        "#,
    )
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn upsert_system_message(pg_pool: &PgPool, legacy_message: &LegacySystemMessageRow) -> Result<()> {
    let user_id = resolve_user_id_by_username(pg_pool, &legacy_message.receiver).await?;
    let notification_id = sqlx::query_scalar(
        r#"
        INSERT INTO notifications (user_id, type, title, content, is_read, created_at, metadata)
        VALUES ($1, 'system', $2, $3, $4, $5, jsonb_build_object('legacy_uoj_system_msg_id', $6))
        ON CONFLICT DO NOTHING
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(&legacy_message.title)
    .bind(&legacy_message.content)
    .bind(legacy_message.read_time.is_some())
    .bind(legacy_message.send_time)
    .bind(legacy_message.message_id)
    .fetch_optional(pg_pool)
    .await?;

    let effective_notification_id = if let Some(notification_id) = notification_id {
        notification_id
    } else {
        sqlx::query_scalar::<_, Uuid>(
            r#"
            SELECT id
            FROM notifications
            WHERE user_id = $1
              AND type = 'system'
              AND title = $2
              AND content = $3
              AND created_at = $4
            LIMIT 1
            "#,
        )
        .bind(user_id)
        .bind(&legacy_message.title)
        .bind(&legacy_message.content)
        .bind(legacy_message.send_time)
        .fetch_one(pg_pool)
        .await?
    };

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_notifications (
            legacy_system_msg_id, notification_id, legacy_receiver, user_id,
            legacy_title, legacy_content, legacy_send_time, legacy_read_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (legacy_system_msg_id) DO UPDATE
        SET
            notification_id = EXCLUDED.notification_id,
            user_id = EXCLUDED.user_id,
            legacy_title = EXCLUDED.legacy_title,
            legacy_content = EXCLUDED.legacy_content,
            legacy_send_time = EXCLUDED.legacy_send_time,
            legacy_read_time = EXCLUDED.legacy_read_time
        "#,
    )
    .bind(legacy_message.message_id)
    .bind(effective_notification_id)
    .bind(&legacy_message.receiver)
    .bind(user_id)
    .bind(&legacy_message.title)
    .bind(&legacy_message.content)
    .bind(legacy_message.send_time)
    .bind(legacy_message.read_time)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn upsert_private_message(pg_pool: &PgPool, legacy_message: &LegacyPrivateMessageRow) -> Result<()> {
    let sender_id = resolve_user_id_by_username(pg_pool, &legacy_message.sender).await?;
    let receiver_id = resolve_user_id_by_username(pg_pool, &legacy_message.receiver).await?;
    let conversation_id = ensure_direct_conversation(pg_pool, sender_id, receiver_id, legacy_message.send_time).await?;

    let direct_message_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO direct_messages (conversation_id, sender_id, content, created_at, read_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        "#,
    )
    .bind(conversation_id)
    .bind(sender_id)
    .bind(&legacy_message.message)
    .bind(legacy_message.send_time)
    .bind(legacy_message.read_time)
    .fetch_one(pg_pool)
    .await?;

    sqlx::query(
        "UPDATE direct_conversations SET updated_at = GREATEST(updated_at, $2) WHERE id = $1"
    )
    .bind(conversation_id)
    .bind(legacy_message.send_time)
    .execute(pg_pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_private_messages (
            legacy_message_id, conversation_id, direct_message_id, legacy_sender, sender_id,
            legacy_receiver, receiver_id, legacy_message, legacy_send_time, legacy_read_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (legacy_message_id) DO UPDATE
        SET
            conversation_id = EXCLUDED.conversation_id,
            direct_message_id = EXCLUDED.direct_message_id,
            sender_id = EXCLUDED.sender_id,
            receiver_id = EXCLUDED.receiver_id,
            legacy_message = EXCLUDED.legacy_message,
            legacy_send_time = EXCLUDED.legacy_send_time,
            legacy_read_time = EXCLUDED.legacy_read_time
        "#,
    )
    .bind(legacy_message.message_id)
    .bind(conversation_id)
    .bind(direct_message_id)
    .bind(&legacy_message.sender)
    .bind(sender_id)
    .bind(&legacy_message.receiver)
    .bind(receiver_id)
    .bind(&legacy_message.message)
    .bind(legacy_message.send_time)
    .bind(legacy_message.read_time)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn ensure_direct_conversation(
    pg_pool: &PgPool,
    user_a: Uuid,
    user_b: Uuid,
    created_at: DateTime<Utc>,
) -> Result<Uuid> {
    if let Some(existing) = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT id
        FROM direct_conversations
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        LIMIT 1
        "#,
    )
    .bind(user_a)
    .bind(user_b)
    .fetch_optional(pg_pool)
    .await?
    {
        return Ok(existing);
    }

    let (user1_id, user2_id) = if user_a.as_bytes() <= user_b.as_bytes() {
        (user_a, user_b)
    } else {
        (user_b, user_a)
    };

    let conversation_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO direct_conversations (user1_id, user2_id, created_at, updated_at)
        VALUES ($1, $2, $3, $3)
        RETURNING id
        "#,
    )
    .bind(user1_id)
    .bind(user2_id)
    .bind(created_at)
    .fetch_one(pg_pool)
    .await?;

    Ok(conversation_id)
}

async fn upsert_legacy_hack(pg_pool: &PgPool, hack: &LegacyHackRow) -> Result<()> {
    let hacker_id = resolve_user_id_by_username(pg_pool, &hack.hacker).await?;
    let owner_id = resolve_user_id_by_username(pg_pool, &hack.owner).await?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_hacks (
            legacy_hack_id, legacy_problem_id, problem_id, legacy_contest_id, contest_id,
            legacy_submission_id, submission_id, legacy_hacker, hacker_id, legacy_owner, owner_id,
            legacy_input, legacy_input_type, legacy_submit_time, legacy_judge_time,
            legacy_success, legacy_details_raw, legacy_is_hidden
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (legacy_hack_id) DO UPDATE
        SET
            problem_id = EXCLUDED.problem_id,
            contest_id = EXCLUDED.contest_id,
            submission_id = EXCLUDED.submission_id,
            hacker_id = EXCLUDED.hacker_id,
            owner_id = EXCLUDED.owner_id,
            legacy_input = EXCLUDED.legacy_input,
            legacy_input_type = EXCLUDED.legacy_input_type,
            legacy_submit_time = EXCLUDED.legacy_submit_time,
            legacy_judge_time = EXCLUDED.legacy_judge_time,
            legacy_success = EXCLUDED.legacy_success,
            legacy_details_raw = EXCLUDED.legacy_details_raw,
            legacy_is_hidden = EXCLUDED.legacy_is_hidden
        "#
    )
    .bind(hack.hack_id)
    .bind(hack.problem_id)
    .bind(hack.problem_id)
    .bind(hack.contest_id)
    .bind(hack.contest_id)
    .bind(hack.submission_id)
    .bind(hack.submission_id)
    .bind(&hack.hacker)
    .bind(hacker_id)
    .bind(&hack.owner)
    .bind(owner_id)
    .bind(&hack.input)
    .bind(&hack.input_type)
    .bind(hack.submit_time)
    .bind(hack.judge_time)
    .bind(hack.success)
    .bind(&hack.details_raw)
    .bind(hack.is_hidden)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn upsert_legacy_best_ac_submission(pg_pool: &PgPool, best: &LegacyBestAcSubmissionRow) -> Result<()> {
    let user_id = resolve_user_id_by_username(pg_pool, &best.submitter).await?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_best_ac_submissions (
            legacy_problem_id, problem_id, legacy_submitter, user_id, legacy_submission_id, submission_id,
            legacy_used_time, legacy_used_memory, legacy_tot_size, legacy_shortest_id,
            legacy_shortest_submission_id, legacy_shortest_used_time, legacy_shortest_used_memory,
            legacy_shortest_tot_size
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (legacy_problem_id, legacy_submitter) DO UPDATE
        SET
            problem_id = EXCLUDED.problem_id,
            user_id = EXCLUDED.user_id,
            submission_id = EXCLUDED.submission_id,
            legacy_used_time = EXCLUDED.legacy_used_time,
            legacy_used_memory = EXCLUDED.legacy_used_memory,
            legacy_tot_size = EXCLUDED.legacy_tot_size,
            legacy_shortest_id = EXCLUDED.legacy_shortest_id,
            legacy_shortest_submission_id = EXCLUDED.legacy_shortest_submission_id,
            legacy_shortest_used_time = EXCLUDED.legacy_shortest_used_time,
            legacy_shortest_used_memory = EXCLUDED.legacy_shortest_used_memory,
            legacy_shortest_tot_size = EXCLUDED.legacy_shortest_tot_size
        "#
    )
    .bind(best.problem_id)
    .bind(best.problem_id)
    .bind(&best.submitter)
    .bind(user_id)
    .bind(best.submission_id)
    .bind(best.submission_id)
    .bind(best.used_time)
    .bind(best.used_memory)
    .bind(best.total_size)
    .bind(best.shortest_id)
    .bind(best.shortest_id)
    .bind(best.shortest_used_time)
    .bind(best.shortest_used_memory)
    .bind(best.shortest_total_size)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn upsert_legacy_custom_test_submission(
    pg_pool: &PgPool,
    custom: &LegacyCustomTestSubmissionRow,
) -> Result<()> {
    let user_id = resolve_user_id_by_username(pg_pool, &custom.submitter).await?;

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_custom_test_submissions (
            legacy_custom_test_submission_id, legacy_problem_id, problem_id, legacy_submitter,
            user_id, legacy_submit_time, legacy_content, legacy_judge_time, legacy_result_raw,
            legacy_status, legacy_status_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (legacy_custom_test_submission_id) DO UPDATE
        SET
            problem_id = EXCLUDED.problem_id,
            user_id = EXCLUDED.user_id,
            legacy_submit_time = EXCLUDED.legacy_submit_time,
            legacy_content = EXCLUDED.legacy_content,
            legacy_judge_time = EXCLUDED.legacy_judge_time,
            legacy_result_raw = EXCLUDED.legacy_result_raw,
            legacy_status = EXCLUDED.legacy_status,
            legacy_status_details = EXCLUDED.legacy_status_details
        "#
    )
    .bind(custom.custom_test_submission_id)
    .bind(custom.problem_id)
    .bind(custom.problem_id)
    .bind(&custom.submitter)
    .bind(user_id)
    .bind(custom.submit_time)
    .bind(&custom.content)
    .bind(custom.judge_time)
    .bind(&custom.result_raw)
    .bind(&custom.status)
    .bind(&custom.status_details)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn upsert_legacy_judger_info(pg_pool: &PgPool, judger: &LegacyJudgerInfoRow) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_judger_info (legacy_judger_name, legacy_password, legacy_ip)
        VALUES ($1, $2, $3)
        ON CONFLICT (legacy_judger_name) DO UPDATE
        SET
            legacy_password = EXCLUDED.legacy_password,
            legacy_ip = EXCLUDED.legacy_ip
        "#
    )
    .bind(&judger.judger_name)
    .bind(&judger.password)
    .bind(&judger.ip)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn upsert_legacy_search_request(pg_pool: &PgPool, request: &LegacySearchRequestRow) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_search_requests (
            legacy_search_request_id, legacy_created_at, legacy_remote_addr, legacy_type,
            legacy_cache_id, legacy_query, legacy_content, legacy_result
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (legacy_search_request_id) DO UPDATE
        SET
            legacy_created_at = EXCLUDED.legacy_created_at,
            legacy_remote_addr = EXCLUDED.legacy_remote_addr,
            legacy_type = EXCLUDED.legacy_type,
            legacy_cache_id = EXCLUDED.legacy_cache_id,
            legacy_query = EXCLUDED.legacy_query,
            legacy_content = EXCLUDED.legacy_content,
            legacy_result = EXCLUDED.legacy_result
        "#,
    )
    .bind(request.search_request_id)
    .bind(request.created_at)
    .bind(&request.remote_addr)
    .bind(normalize_search_request_type(&request.request_type))
    .bind(request.cache_id)
    .bind(&request.query)
    .bind(&request.content)
    .bind(&request.result)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn upsert_legacy_paste(pg_pool: &PgPool, paste: &LegacyPasteRow) -> Result<()> {
    let creator_id = match paste
        .creator
        .as_deref()
        .map(str::trim)
        .filter(|username| !username.is_empty())
    {
        Some(username) => resolve_optional_user_id_by_username(pg_pool, username).await?,
        None => None,
    };

    sqlx::query(
        r#"
        INSERT INTO legacy_uoj_pastes (
            legacy_paste_index, legacy_creator, creator_id, legacy_created_at, legacy_content
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (legacy_paste_index) DO UPDATE
        SET
            legacy_creator = EXCLUDED.legacy_creator,
            creator_id = EXCLUDED.creator_id,
            legacy_created_at = EXCLUDED.legacy_created_at,
            legacy_content = EXCLUDED.legacy_content
        "#,
    )
    .bind(&paste.paste_index)
    .bind(&paste.creator)
    .bind(creator_id)
    .bind(paste.created_at)
    .bind(&paste.content)
    .execute(pg_pool)
    .await?;

    Ok(())
}

async fn resolve_user_id_by_username<'a, E>(executor: E, username: &str) -> Result<Uuid>
where
    E: sqlx::Executor<'a, Database = sqlx::Postgres>,
{
    sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE username = $1")
        .bind(username)
        .fetch_optional(executor)
        .await?
        .with_context(|| format!("missing mapped user for legacy username `{}`", username))
}

async fn resolve_optional_user_id_by_username<'a, E>(executor: E, username: &str) -> Result<Option<Uuid>>
where
    E: sqlx::Executor<'a, Database = sqlx::Postgres>,
{
    sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE username = $1")
        .bind(username)
        .fetch_optional(executor)
        .await
        .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_legacy_usergroups_to_roles() {
        assert_eq!(map_legacy_usergroup_to_role("U"), "student");
        assert_eq!(map_legacy_usergroup_to_role("S"), "student");
        assert_eq!(map_legacy_usergroup_to_role("T"), "teacher");
        assert_eq!(map_legacy_usergroup_to_role("A"), "root");
    }

    #[test]
    fn normalizes_single_char_fields() {
        assert_eq!(normalize_legacy_char("M", "U"), "M");
        assert_eq!(normalize_legacy_char("", "U"), "U");
    }

    #[test]
    fn derives_problem_author_note_from_submission_requirement() {
        assert_eq!(
            derive_problem_author_note(Some("  submit answer.py  ")),
            Some("submit answer.py".to_string())
        );
        assert_eq!(derive_problem_author_note(Some("   ")), None);
        assert_eq!(derive_problem_author_note(None), None);
    }

    #[test]
    fn notice_contest_ids_are_unique_and_sorted() {
        let now = Utc::now();
        let rows = vec![
            LegacyContestNoticeRow {
                contest_id: 3,
                title: "B".to_string(),
                content: "x".to_string(),
                time: now,
            },
            LegacyContestNoticeRow {
                contest_id: 1,
                title: "A".to_string(),
                content: "x".to_string(),
                time: now,
            },
            LegacyContestNoticeRow {
                contest_id: 3,
                title: "C".to_string(),
                content: "x".to_string(),
                time: now,
            },
        ];

        assert_eq!(unique_notice_contest_ids(&rows), vec![1, 3]);
    }

    #[test]
    fn maps_legacy_like_target_types() {
        assert_eq!(map_legacy_like_target_type("B"), Some("article"));
        assert_eq!(map_legacy_like_target_type("BC"), Some("comment"));
        assert_eq!(map_legacy_like_target_type("P"), Some("problem"));
        assert_eq!(map_legacy_like_target_type("ZZ"), None);
    }

    #[test]
    fn parses_json_legacy_test_case_results() {
        let raw = br#"[{"verdict":"Accepted","time":12,"memory":256},{"status":"WA"}]"#;
        let parsed = parse_legacy_test_case_results(raw);
        assert_eq!(
            parsed,
            vec![
                ParsedLegacyTestCaseResult {
                    verdict: "ac".to_string(),
                    time_ms: Some(12),
                    memory_kb: Some(256),
                },
                ParsedLegacyTestCaseResult {
                    verdict: "wa".to_string(),
                    time_ms: None,
                    memory_kb: None,
                },
            ]
        );
    }

    #[test]
    fn parses_textual_legacy_test_case_results() {
        let raw = b"Accepted\nWrong Answer\nRuntime Error";
        let parsed = parse_legacy_test_case_results(raw);
        assert_eq!(
            parsed.into_iter().map(|item| item.verdict).collect::<Vec<_>>(),
            vec!["ac".to_string(), "wa".to_string(), "rte".to_string()]
        );
    }

    #[test]
    fn normalizes_legacy_search_request_type() {
        assert_eq!(normalize_search_request_type("search"), "search");
        assert_eq!(normalize_search_request_type("autocomplete"), "autocomplete");
        assert_eq!(normalize_search_request_type("other"), "search");
    }

    #[test]
    fn normalizes_legacy_paste_index() {
        assert_eq!(normalize_paste_index(" abc123 "), Some("abc123".to_string()));
        assert_eq!(normalize_paste_index("   "), None);
    }
}
