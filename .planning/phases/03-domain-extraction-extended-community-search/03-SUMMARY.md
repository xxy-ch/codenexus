---
phase: "03"
plan: "03"
name: "Wire Community and Search Crates into API"
status: complete
executor: orchestrator
date: 2026-04-20
---

## Objective
Wire the new `domain-community` and `domain-search` crates into the api binary.

## Outcome
**Already complete.** The API crate depends on both domain crates and nests their routers:

```rust
.nest("/discussions", domain_community::discussions_router())
.nest("/blog", domain_community::blog_router())
.nest("/search", domain_search::search_router())
.nest("/messages", domain_community::messages_router())
```

Full workspace `cargo build` passes cleanly.

## Key Files

### Modified (verified)
- `backend/api/Cargo.toml` — depends on domain-community, domain-search
- `backend/api/src/main.rs` — nests community and search routers

## Self-Check: PASSED
- [x] API crate compiles with domain dependencies
- [x] All routers nested at correct paths
- [x] Full workspace build passes
