# Multi-stage build for Rust feature-gateway
# Build context: ./backend (from docker-compose.yml)
FROM rust:1.88-alpine AS builder

RUN apk add --no-cache \
    musl-dev \
    pkgconf \
    openssl-dev \
    openssl-libs-static

WORKDIR /app

# Layer 1: Copy all Cargo.toml files for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY feature-gateway/Cargo.toml ./feature-gateway/Cargo.toml
COPY shared ./shared
# Copy stub Cargo.toml for other workspace members (only needed for workspace resolution)
COPY api/Cargo.toml ./api/Cargo.toml
COPY api-infra/Cargo.toml ./api-infra/Cargo.toml
COPY domain-analysis/Cargo.toml ./domain-analysis/Cargo.toml
COPY domain-classes/Cargo.toml ./domain-classes/Cargo.toml
COPY domain-community/Cargo.toml ./domain-community/Cargo.toml
COPY domain-contests/Cargo.toml ./domain-contests/Cargo.toml
COPY domain-imex/Cargo.toml ./domain-imex/Cargo.toml
COPY domain-leaderboard/Cargo.toml ./domain-leaderboard/Cargo.toml
COPY domain-problems/Cargo.toml ./domain-problems/Cargo.toml
COPY domain-search/Cargo.toml ./domain-search/Cargo.toml
COPY domain-submissions/Cargo.toml ./domain-submissions/Cargo.toml
COPY domain-users/Cargo.toml ./domain-users/Cargo.toml
COPY judge-worker/Cargo.toml ./judge-worker/Cargo.toml
COPY llm-worker/Cargo.toml ./llm-worker/Cargo.toml
COPY migration-tool/Cargo.toml ./migration-tool/Cargo.toml
COPY monitor-server/Cargo.toml ./monitor-server/Cargo.toml

# Create dummy source files for all workspace members
RUN mkdir -p feature-gateway/src api/src api-infra/src \
    domain-analysis/src \
    domain-classes/src domain-community/src domain-contests/src \
    domain-imex/src domain-leaderboard/src domain-problems/src \
    domain-search/src domain-submissions/src domain-users/src \
    judge-worker/src llm-worker/src migration-tool/src monitor-server/src && \
    printf 'fn main() {}\n' > feature-gateway/src/main.rs && \
    for dir in api api-infra domain-analysis domain-classes domain-community domain-contests \
        domain-imex domain-leaderboard domain-problems domain-search \
        domain-submissions domain-users judge-worker llm-worker migration-tool monitor-server; do \
        printf '' > ${dir}/src/lib.rs; \
    done

# Build dependencies only (cached layer)
RUN cargo build --release -p feature-gateway 2>/dev/null || true

# Layer 2: Copy actual source code
COPY feature-gateway ./feature-gateway

# Build the actual application
RUN cargo build --release -p feature-gateway

# Stage 2: Runtime
FROM alpine:3.19

RUN apk add --no-cache \
    ca-certificates \
    curl

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

COPY --from=builder /app/target/release/feature-gateway /app/feature-gateway

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3001

ENV GATEWAY_BIND_ADDRESS=0.0.0.0:3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f -H "Authorization: Bearer ${WORKER_SECRET}" http://localhost:3001/health || exit 1

CMD ["/app/feature-gateway"]
