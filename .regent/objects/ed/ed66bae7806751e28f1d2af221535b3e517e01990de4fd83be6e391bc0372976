# Phase 3 Discussion Log — Domain Extraction: Extended (Community, Search)

**Date:** 2026-04-14
**Phase:** 3 — Domain Extraction: Extended (Community, Search)

---

## Gray Areas Identified

1. Community crate structure (one vs. three crates)
2. WebSocket coupling with community modules
3. Search router signature normalization
4. Messages module flat-file structure

---

## Discussion Outcomes

### 1. Community Crate Structure

**Options considered:**
- Single `domain-community` crate with sub-modules (discussions/, blog/, messages/)
- Three separate crates: domain-discussions, domain-blog, domain-messages

**User chose:** Single `domain-community` crate

**Reasoning:** The three modules share the `CommunityRepo` trait, share WebSocket notification patterns, and are functionally related. A single crate reduces workspace complexity. Individual modules are small enough (~234–953 lines) that three separate crates would be over-fragmentation.

**Decision locked as D-08.**

---

### 2. WebSocket Coupling

**Findings:** `WebSocketMessage` and `WebSocketServer` already exist in `api-infra`. The `crate::websocket::message::WebSocketMessage` import is a re-export. Discussions and blog routes construct WebSocket messages and send them via `state.websocket_server`. No new abstraction needed — domain crates will import directly from api-infra.

**Resolution:** No decision needed. Already resolved by Phase 2 extraction of WebSocket types into api-infra.

---

### 3. Search Router Normalization

**Options considered:**
- Keep `create_search_router(pool, redis_url)` signature (inconsistent)
- Normalize to `search_router()` using `State<AppState>` (consistent with domain-problems/domain-users)

**User chose:** Standard `search_router()` pattern

**Reasoning:** The current signature is inconsistent — it takes pool and redis_url as function params, but routes still extract them from AppState. Normalizing makes the extraction pattern uniform.

**Decision locked as D-09.**

---

### 4. Messages Module Structure

**Options considered:**
- Keep flat file (234 lines, models+SQL+handlers co-located)
- Restructure to standard 3-file pattern (models.rs, service.rs, routes.rs)
- Split models only (extract models.rs, keep service+routes together)

**User chose:** Keep flat file

**Reasoning:** The module is small (234 lines) with simple CRUD. Restructuring adds churn without behavioral benefit.

**Decision locked as D-10.**

---

## Additional Findings

- No notification cross-dependency: Community modules use WebSocket notifications (comments/labels), not the `NotificationService` trait. The "notification" references in code are just WebSocket messages.
- No search indexing calls: Community modules don't call `SearchRepo.index_discussion()` or `SearchRepo.index_article()`. They have their own internal text search (SQL LIKE) in filter models.
- `AppState` is in `api-infra::state`, re-exported by api crate. All domain crates can access it.
- `AuthExtractor` is in `api-infra` (moved in Phase 2). Messages and search routes will import from there.
