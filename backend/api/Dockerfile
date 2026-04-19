# Multi-stage build for Rust API service
# Build context: ./backend (from docker-compose.yml)
FROM rust:1.88-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    postgresql-client \
    pkgconf \
    openssl-dev \
    curl

WORKDIR /app

# Layer 1: Copy all Cargo.toml files for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY api/Cargo.toml ./api/Cargo.toml
COPY api-infra/Cargo.toml ./api-infra/Cargo.toml
COPY shared/Cargo.toml ./shared/Cargo.toml
COPY domain-users/Cargo.toml ./domain-users/Cargo.toml
COPY domain-problems/Cargo.toml ./domain-problems/Cargo.toml
COPY domain-community/Cargo.toml ./domain-community/Cargo.toml
COPY domain-search/Cargo.toml ./domain-search/Cargo.toml
COPY domain-submissions/Cargo.toml ./domain-submissions/Cargo.toml
COPY domain-contests/Cargo.toml ./domain-contests/Cargo.toml
COPY domain-classes/Cargo.toml ./domain-classes/Cargo.toml
COPY domain-leaderboard/Cargo.toml ./domain-leaderboard/Cargo.toml
COPY domain-imex/Cargo.toml ./domain-imex/Cargo.toml
COPY judge-worker/Cargo.toml ./judge-worker/Cargo.toml
COPY migration-tool/Cargo.toml ./migration-tool/Cargo.toml

# Create dummy source files so cargo can resolve the workspace
RUN mkdir -p api/src api-infra/src shared/src && \
    mkdir -p domain-users/src domain-problems/src domain-community/src domain-search/src && \
    mkdir -p domain-submissions/src domain-contests/src domain-classes/src domain-leaderboard/src && \
    mkdir -p domain-imex/src judge-worker/src migration-tool/src && \
    printf 'fn main() {}\n' > api/src/main.rs && \
    printf '' > api-infra/src/lib.rs && \
    printf '' > shared/src/lib.rs && \
    printf '' > domain-users/src/lib.rs && \
    printf '' > domain-problems/src/lib.rs && \
    printf '' > domain-community/src/lib.rs && \
    printf '' > domain-search/src/lib.rs && \
    printf '' > domain-submissions/src/lib.rs && \
    printf '' > domain-contests/src/lib.rs && \
    printf '' > domain-classes/src/lib.rs && \
    printf '' > domain-leaderboard/src/lib.rs && \
    printf '' > domain-imex/src/lib.rs && \
    printf 'fn main() {}\n' > judge-worker/src/main.rs && \
    printf 'fn main() {}\n' > migration-tool/src/main.rs

# Build dependencies only (cached layer)
RUN cargo build --release -p api 2>/dev/null || true

# Layer 2: Copy actual source code
COPY api ./api
COPY api-infra ./api-infra
COPY shared ./shared
COPY domain-users ./domain-users
COPY domain-problems ./domain-problems
COPY domain-community ./domain-community
COPY domain-search ./domain-search
COPY domain-submissions ./domain-submissions
COPY domain-contests ./domain-contests
COPY domain-classes ./domain-classes
COPY domain-leaderboard ./domain-leaderboard
COPY domain-imex ./domain-imex

# Build the actual application
RUN cargo build --release -p api

# Stage 2: Runtime
FROM alpine:3.19

RUN apk add --no-cache \
    postgresql-client \
    ca-certificates \
    curl

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

COPY --from=builder /app/target/release/api /app/api
COPY api/migrations /app/migrations
COPY api/docker-entrypoint.sh /usr/local/bin/

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["/app/api"]
