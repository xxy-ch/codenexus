# Multi-stage build for Rust API service
# Build context: ./backend (from docker-compose.yml)
FROM rust:1.88-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    postgresql-client \
    pkgconf \
    openssl-dev \
    openssl-libs-static \
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
COPY domain-analysis/Cargo.toml ./domain-analysis/Cargo.toml
COPY domain-imex/Cargo.toml ./domain-imex/Cargo.toml
COPY feature-gateway/Cargo.toml ./feature-gateway/Cargo.toml
COPY judge-worker/Cargo.toml ./judge-worker/Cargo.toml
COPY llm-worker/Cargo.toml ./llm-worker/Cargo.toml
COPY migration-tool/Cargo.toml ./migration-tool/Cargo.toml
COPY monitor-server/Cargo.toml ./monitor-server/Cargo.toml

# Copy real source for crates that `api` links against so Cargo resolves the
# actual public APIs during the cached dependency build.
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
COPY domain-analysis ./domain-analysis
COPY domain-imex ./domain-imex

# Create dummy source files only for workspace members not needed by the API build.
RUN mkdir -p api/src feature-gateway/src judge-worker/src llm-worker/src migration-tool/src monitor-server/src && \
    printf 'fn main() {}\n' > api/src/main.rs && \
    printf 'fn main() {}\n' > feature-gateway/src/main.rs && \
    printf 'fn main() {}\n' > judge-worker/src/main.rs && \
    printf 'fn main() {}\n' > llm-worker/src/main.rs && \
    printf 'fn main() {}\n' > migration-tool/src/main.rs && \
    printf 'fn main() {}\n' > monitor-server/src/main.rs

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
COPY domain-analysis ./domain-analysis
COPY domain-imex ./domain-imex
COPY feature-gateway ./feature-gateway

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
    CMD curl -f http://localhost:3000/health/ready || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["/app/api"]
