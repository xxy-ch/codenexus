# Phase 3 Context — Domain Extraction: Extended (Community, Search)

**Phase:** 3
**Created:** 2026-04-14
**Status:** Context Gathered

---

## Prior Decisions (Carried Forward from Phase 2)

These decisions from `02-CONTEXT.md` remain binding:

- **D-01** `deny(warnings)` in CI
- **D-02** Push + PR trigger for GitHub Actions
- **D-03** Combined CI workflow with parallel jobs
- **D-04** Crate naming: `domain-*` prefix
- **D-05** Mirror current module structure (models.rs, service.rs, routes.rs per sub-module)
- **D-06** Cross-domain dependencies via api-infra traits
- **D-07** CI-only verification (no manual smoke tests)

---

## Phase 3 Decisions

### D-08: Single `domain-community` crate with sub-modules

**Decision:** Extract discussions, blog, and messages into a single `domain-community` workspace crate with sub-modules (`discussions/`, `blog/`, `messages/`), not three separate crates.

**Rationale:** The three modules share the `CommunityRepo` trait in api-infra, share the same WebSocket notification pattern, and are functionally related (user-to-user interaction). A single crate reduces workspace complexity and avoids over-fragmentation for modules that are individually small (~234–953 lines each).

---

### D-09: Normalize search router to standard pattern

**Decision:** Refactor `create_search_router(pool, redis_url)` to `search_router() -> Router<AppState>`, matching the `domain-problems` and `domain-users` pattern where router functions take no parameters and use `State<AppState>` from axum.

**Rationale:** The current signature passes pool and redis_url as function parameters, then routes still extract them from AppState — an inconsistency. Normalizing makes the extraction pattern uniform across all domain crates.

---

### D-10: Messages module stays flat (single file)

**Decision:** Extract `messages/routes.rs` as a single flat file into `domain-community/src/messages.rs` (or `messages/mod.rs`), preserving the current structure where models, SQL queries, and handlers are co-located in one file. Do NOT restructure into separate models/service/routes files.

**Rationale:** The module is only 234 lines with simple CRUD operations. Restructuring adds churn and risk without behavioral benefit. Consistency with the 3-file pattern is not worth the cost at this size.

---

## Already-Resolved Dependencies

### WebSocket coupling — No decision needed

`WebSocketMessage` and `WebSocketServer` already live in `api-infra`. Discussions and blog routes import them via `crate::websocket::message::WebSocketMessage` (re-exported from api-infra). After extraction, they will import directly from `api-infra`. No new abstraction layer required.

### AuthExtractor — No decision needed

`AuthExtractor` was moved to `api-infra` in Phase 2. Messages and search routes already import it from `crate::middleware::auth::AuthExtractor` (re-exported). After extraction, they will import directly from `api-infra`.

### AppState — No decision needed

`AppState` is defined in `api-infra::state` and re-exported by the api crate. Domain crates will depend on api-infra and use `AppState` directly, same as `domain-problems` and `domain-users`.

### Search cross-cutting — Data-level only, no code-level deps

`SearchService` queries the database directly via SQL across multiple tables (problems, discussions, blog). It does NOT import from other domain modules. The `SearchRepo` trait in api-infra provides indexing methods (`index_discussion`, `index_article`) but the current search code does not use them — it uses raw SQL. No cross-domain crate dependencies needed.

---

## Code Context

### Module sizes being extracted
| Module | Lines | Files |
|--------|-------|-------|
| `api/src/discussions/` | 682 | routes.rs, service.rs, models.rs |
| `api/src/blog/` | 953 | routes.rs, service.rs, models.rs |
| `api/src/messages/` | 234 | routes.rs (flat) |
| `api/src/search/` | 463 | routes.rs, service.rs |
| **Total** | **2332** | **9 files** |

### Cross-module imports to resolve
| Source | Import | Resolution |
|--------|--------|------------|
| `discussions/routes.rs` | `crate::websocket::message::WebSocketMessage` | → `api_infra::websocket::message::WebSocketMessage` |
| `discussions/routes.rs` | `crate::AppState` | → `api_infra::state::AppState` |
| `blog/routes.rs` | `crate::websocket::message::WebSocketMessage` | → `api_infra::websocket::message::WebSocketMessage` |
| `blog/routes.rs` | `crate::AppState` | → `api_infra::state::AppState` |
| `messages/routes.rs` | `crate::middleware::auth::AuthExtractor` | → `api_infra::middleware::auth::AuthExtractor` |
| `messages/routes.rs` | `crate::AppState` | → `api_infra::state::AppState` |
| `search/routes.rs` | `crate::middleware::auth::AuthExtractor` | → `api_infra::middleware::auth::AuthExtractor` |
| `search/routes.rs` (signature) | `create_search_router(pool, redis_url)` | → `search_router()` using State<AppState> |

### Existing api-infra traits for these domains
- `CommunityRepo` — covers discussions, blog articles, direct messages
- `SearchRepo` — covers search, indexing operations
- `NotificationService` — available but not used by current community/search code

### WebSocket notification patterns
- `discussions/routes.rs`: constructs `WebSocketMessage::DiscussionReply`, sends via `state.websocket_server.send_to_topic()`
- `blog/routes.rs`: constructs `WebSocketMessage::TrendingArticles` and `WebSocketMessage::ArticleComment`, sends via `state.websocket_server.send_to_topic()`
- `messages/routes.rs`: no WebSocket usage

---

## Claude's Discretion

The following items are left to Claude's judgment during planning/execution:

- Internal sub-module organization within `domain-community` (flat files vs. sub-directories)
- Exact import path updates (mechanical, follow the table above)
- How to refactor `create_search_router` into `search_router()` (remove params, use State<AppState> internally)
- Whether `domain-search` needs a `models.rs` (currently only routes.rs + service.rs)
- Dependency declarations in `Cargo.toml` for new crates
- Order of extraction (community first, search first, or parallel)
