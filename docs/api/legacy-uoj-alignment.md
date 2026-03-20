# Legacy UOJ Alignment

This document records how the customized legacy `app_uoj233` schema is aligned
into the new Online Judge schema.

## Principles

- Authentication remains on the new model:
  - login uses the legacy account identifier stored in `users.username`
  - internal identity uses `users.id` (UUID)
- Auth payloads accept both `username` and `user_id` during the transition.
- `users.username` must support legacy usernames that may include letters, not
  only numeric IDs.
- Imported legacy MD5 passwords stay preserved in `legacy_uoj_users`; on the
  first successful login they are upgraded into the runtime bcrypt hash in
  `users.password_hash`.
- Legacy numeric ids and username-based relations are preserved in
  `legacy_uoj_*` compatibility tables.
- Current runtime tables stay clean; old-only fields are archived instead of
  being forced back into the business schema.

## Core Mappings

### Users

- `user_info.username` -> `users.username`
- `user_info.email` -> `users.email`
- `user_info.password` -> `legacy_uoj_users.legacy_password_md5`
- `user_info.usergroup` -> `user_roles.role` via migration enum mapping
- `user_info.ac_num` -> `user_competitive_stats.ac_count`
- `user_info.rating` -> `user_competitive_stats.contest_rating`
- `user_info.qq/sex/register_time/remote_addr/http_x_forwarded_for/remember_token/motto`
  -> `legacy_uoj_users`

### Problems

- `problems.id/title/is_hidden` -> `problems`
- `problems_contents.statement` -> `problems.description`
- `problems_tags.tag` -> `problems.tags` and `legacy_uoj_problem_tags`
- `problems.submission_requirement` -> `problems.author_note` and `legacy_uoj_problems`
- `problems_contents.statement_md` -> `legacy_uoj_problems.legacy_statement_md`
- `problems.hackable/extra_config/zan/ac_num/submit_num`
  -> `legacy_uoj_problems`
- `problems_permissions` -> `legacy_uoj_problem_permissions`

### Submissions

- Core execution fields, including `score`, `result_error`, `status_details`,
  and `is_hidden`, -> `submissions`
- Old result blob and unsupported state fields -> `legacy_uoj_submissions`
- Parsed testcase details can be normalized later into `test_case_results`

### Contests

- Core contest metadata -> `contests`
- `last_min/status/player_num/extra_config/zan` -> `legacy_uoj_contests`
- `contests_registrants` -> `contest_participants` plus `legacy_uoj_contest_registrations`
- `contests_submissions` -> `contest_submissions` plus `legacy_uoj_contest_submission_details`
- `contests_permissions` -> `legacy_uoj_contest_permissions`
- `contests_asks` / `contests_notice` -> `legacy_uoj_contest_asks` / `legacy_uoj_contest_notices`

### Community

- `blogs` -> `articles` plus `legacy_uoj_articles`
- `blogs_comments` -> `article_comments` plus `legacy_uoj_article_comments`
- `blogs_tags` -> `articles.tags` and `legacy_uoj_article_tags`
- `important_blogs.level` -> `legacy_uoj_articles.legacy_important_level`
- `click_zans` -> `likes` when possible, always preserved in `legacy_uoj_click_zans`

### Messaging

- `user_system_msg` -> `notifications` plus `legacy_uoj_notifications`
- `user_msg` -> `direct_conversations` / `direct_messages` plus `legacy_uoj_private_messages`

### Unsupported Legacy Entities

These are preserved in archive-compatible tables because the current product
does not expose equivalent runtime models:

- `hacks` -> `legacy_uoj_hacks`
- `best_ac_submissions` -> `legacy_uoj_best_ac_submissions`
- `custom_test_submissions` -> `legacy_uoj_custom_test_submissions`
- `judger_info` -> `legacy_uoj_judger_info`
- `search_requests` -> `legacy_uoj_search_requests`
- `pastes` -> `legacy_uoj_pastes`

## Recommended Migration Flow

1. Import legacy rows into `legacy_uoj_*` compatibility tables.
2. Create / upsert current runtime entities (`users`, `problems`, `submissions`, `contests`, `articles`, etc.).
3. Backfill runtime foreign keys into compatibility rows.
4. Recompute cache-like fields after import instead of trusting legacy counters.
5. Add blob parsing for `submissions.result` only after the core entity import is stable.

## Current Execution Support

- `cargo run -p api --bin import_legacy_uoj -- users`
  imports legacy `user_info` rows from MySQL into:
  - `users`
  - `user_roles`
  - `legacy_uoj_users`
- `cargo run -p api --bin import_legacy_uoj -- problems`
  imports legacy `problems`, `problems_contents`, and `problems_tags` into:
  - `problems`
  - `legacy_uoj_problems`
  - `legacy_uoj_problem_tags`
- `cargo run -p api --bin import_legacy_uoj -- contests`
  imports legacy `contests`, `contests_problems`, registrants, notices, asks,
  and permissions into:
  - `contests`
  - `contest_problems`
  - `contest_participants`
  - `contest_submissions`
  - `legacy_uoj_contests`
  - `legacy_uoj_contest_*`
- `cargo run -p api --bin import_legacy_uoj -- submissions`
  imports legacy `submissions` into:
  - `submissions`
  - `legacy_uoj_submissions`
- `cargo run -p api --bin import_legacy_uoj -- articles`
  imports legacy `blogs`, `blogs_comments`, `blogs_tags`, `important_blogs`,
  and `click_zans` into:
  - `articles`
  - `article_comments`
  - `legacy_uoj_articles`
  - `legacy_uoj_article_comments`
  - `legacy_uoj_article_tags`
  - `legacy_uoj_click_zans`
- `cargo run -p api --bin import_legacy_uoj -- messages`
  imports legacy `user_system_msg` and `user_msg` into:
  - `notifications`
  - `direct_conversations`
  - `direct_messages`
  - `legacy_uoj_notifications`
  - `legacy_uoj_private_messages`
- `cargo run -p api --bin import_legacy_uoj -- archives`
  imports legacy archive-only entities into:
  - `legacy_uoj_hacks`
  - `legacy_uoj_best_ac_submissions`
  - `legacy_uoj_custom_test_submissions`
  - `legacy_uoj_judger_info`
  - `legacy_uoj_search_requests`
  - `legacy_uoj_pastes`
- Required environment variables:
  - `DATABASE_URL`
  - `LEGACY_UOJ_DATABASE_URL`
  - `IMPORT_ORGANIZATION_ID`
- Optional environment variables:
  - `IMPORT_CAMPUS_ID`
  - `IMPORT_AUTHOR_USERNAME`

This importer intentionally starts with users because account identity and
password compatibility are the highest-risk part of the migration. Problems are
the next supported entity because they exercise both runtime-field merging and
legacy-field archiving. Contest, submission, article, and message importers
should follow the same dual-write pattern: runtime table plus `legacy_uoj_*`
compatibility archive.
