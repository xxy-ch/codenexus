---
phase: 11-feature-gateway-infrastructure
plan: 03
subsystem: backend/docker
tags: [docker-compose, integration, verification, standalone-service]
dependency_graph:
  requires: [11-02]
  provides: []
  affects: [docker-compose]
tech_stack:
  added: []
  patterns:
    - "Docker Compose service following judge-worker pattern (D-20)"
key_files:
  created: []
  modified:
    - "docker-compose.yml"
decisions:
  - "WORKER_SECRET env var added to api service for Gateway Bearer auth (D-24)"
  - "Pre-existing test_admin_list_users_returns_200 failure documented as out-of-scope (Phase 14 audit artifact)"
metrics:
  duration: 6min
  completed_date: 2026-04-21
---

# Phase 11 Plan 03: Docker Compose Integration + Workspace Verification Summary

Added feature-gateway service to Docker Compose configuration and verified the full workspace builds, tests pass, and frontend is unaffected. Completes Phase 11 standalone Gateway architecture (D-17 through D-26).

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Add feature-gateway service to docker-compose.yml | a0fe4ac | Done |
| 2 | Full workspace build and test verification | N/A (verification only) | Done |

## What Was Built

### Docker Compose Configuration (docker-compose.yml)

**New service: `feature-gateway`**
- Build context `./backend`, Dockerfile `feature-gateway/Dockerfile`
- Port 3001 exposed (D-17)
- Environment: DATABASE_URL (direct PostgreSQL, D-19), WORKER_SECRET (shared auth, D-24), GATEWAY_BIND_ADDRESS, FEATURE_GATEWAY_ENABLED, RUST_LOG
- depends_on postgres (service_healthy)
- Health check on GET /health with 30s interval

**Updated service: `api`**
- Added `FEATURE_GATEWAY_URL: http://feature-gateway:3001` (D-18, D-20)
- Added `WORKER_SECRET` env var (needed by GatewayClient for Bearer auth, D-24)
- Added `feature-gateway` to depends_on (service_healthy)

### Verification Results

| Check | Result |
|-------|--------|
| `cargo build --workspace` | PASS - all 16 crates compile |
| `cargo test --workspace --lib` | PASS - 403 tests, 0 failures, 18 ignored |
| `cargo clippy -p feature-gateway` | PASS - zero warnings |
| `cargo clippy -p api-infra` | PASS - zero warnings |
| `npm run build` (frontend) | PASS - built in 29.98s (D-22 confirmed) |
| `docker compose config` | PASS - valid YAML |
| `grep FeatureGatewayService api-infra/` | PASS - zero matches (deletion confirmed) |
| feature-gateway has resolve/set_flag/require_worker_secret | PASS - all present |

## Key Design Decisions

1. **WORKER_SECRET on api service**: Added WORKER_SECRET environment variable to the api service definition so GatewayClient can authenticate to the feature-gateway service with Bearer token (D-24). Previously this was only used by judge-worker.

2. **Health check dependency chain**: API depends_on feature-gateway (service_healthy), feature-gateway depends_on postgres (service_healthy). This ensures the gateway is ready before API starts accepting requests.

## Deviations from Plan

### Deferred Issues

**1. [Out-of-scope] Pre-existing integration test failure**
- **Test:** `api/tests/handlers/users_test::test_admin_list_users_returns_200`
- **Issue:** Returns 401 instead of 200 -- caused by Phase 14 audit security tightening (campus_id auth changes)
- **Verification:** Confirmed pre-existing by running test against pre-Task-1 code (still fails)
- **Impact:** None on Phase 11 functionality
- **Status:** Documented as out-of-scope per scope boundary rules

**2. [Out-of-scope] Pre-existing clippy warnings**
- **Crates affected:** domain-submissions (empty doc comment lines), domain-users (collapsible if), judge-worker (too many arguments)
- **Status:** Pre-existing from prior phase audit code; feature-gateway and api-infra pass clippy clean

## Decision Verification (D-17 through D-26)

| Decision | Verification |
|----------|-------------|
| D-17: Standalone binary on port 3001 | Dockerfile exists, docker-compose exposes 3001 |
| D-18: API HTTP REST to Gateway | FEATURE_GATEWAY_URL set in api service env |
| D-19: Direct PostgreSQL | feature-gateway has DATABASE_URL, no API dependency |
| D-20: Docker Compose deployment | feature-gateway service defined with depends_on postgres |
| D-21: 10s TTL cache | Implemented in Plan 02 (GatewayClient) |
| D-22: Zero frontend changes | `npm run build` succeeds without any frontend file changes |
| D-23: Fail-open degradation | Implemented in Plan 02 (GatewayClient) |
| D-24: WORKER_SECRET auth | Both api and feature-gateway have WORKER_SECRET env var |
| D-25: Gateway hosts all CRUD | feature-gateway has resolve, set_flag, delete_flag, registry, health |
| D-26: One-step migration | Completed in Plan 02 (embedded module deleted) |

## Self-Check: PASSED

- [x] docker-compose.yml contains feature-gateway service on port 3001
- [x] API has FEATURE_GATEWAY_URL and depends_on feature-gateway
- [x] `cargo build --workspace` succeeds
- [x] `cargo test --workspace --lib` passes (403/403)
- [x] Frontend build succeeds (D-22 confirmed)
- [x] Commit a0fe4ac exists in git log
