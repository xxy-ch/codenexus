# Multi-stage build for Rust judge-worker
# Build context: ./backend (from docker-compose.yml)
FROM rust:1.88-alpine AS builder

RUN apk add --no-cache \
    musl-dev \
    pkgconf \
    openssl-dev \
    openssl-libs-static \
    libseccomp-dev

WORKDIR /app

# Layer 1: Copy Cargo.toml files for dependency caching
COPY Cargo.toml Cargo.lock ./
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
COPY feature-gateway/Cargo.toml ./feature-gateway/Cargo.toml
COPY judge-worker/Cargo.toml ./judge-worker/Cargo.toml
COPY llm-worker/Cargo.toml ./llm-worker/Cargo.toml
COPY migration-tool/Cargo.toml ./migration-tool/Cargo.toml
COPY monitor-server/Cargo.toml ./monitor-server/Cargo.toml
COPY shared/Cargo.toml ./shared/Cargo.toml

# Create dummy source files
RUN mkdir -p api/src api-infra/src domain-analysis/src domain-classes/src \
    domain-community/src domain-contests/src domain-imex/src domain-leaderboard/src \
    domain-problems/src domain-search/src domain-submissions/src domain-users/src \
    feature-gateway/src judge-worker/src llm-worker/src migration-tool/src monitor-server/src shared/src && \
    printf 'fn main() {}\n' > judge-worker/src/main.rs && \
    printf 'fn main() {}\n' > api/src/main.rs && \
    printf 'fn main() {}\n' > feature-gateway/src/main.rs && \
    printf 'fn main() {}\n' > llm-worker/src/main.rs && \
    printf 'fn main() {}\n' > migration-tool/src/main.rs && \
    printf 'fn main() {}\n' > monitor-server/src/main.rs && \
    for dir in api-infra domain-analysis domain-classes domain-community domain-contests \
        domain-imex domain-leaderboard domain-problems domain-search \
        domain-submissions domain-users; do \
        printf '' > ${dir}/src/lib.rs; \
    done && \
    printf '' > shared/src/lib.rs

# Build dependencies only (cached layer)
RUN cargo build --release -p judge-worker 2>/dev/null || true

# Layer 2: Copy actual source code
COPY judge-worker ./judge-worker
COPY shared ./shared

# Build the actual application
RUN cargo build --release -p judge-worker

# Stage 2: Runtime with Docker
FROM alpine:3.19

RUN apk add --no-cache \
    docker \
    ca-certificates \
    curl \
    bash \
    python3 \
    nodejs \
    npm \
    gcc \
    g++ \
    musl-dev \
    openjdk17-jdk \
    go \
    rust \
    cargo \
    libseccomp

RUN case "$(apk --print-arch)" in \
        aarch64) ln -sf /lib/ld-musl-aarch64.so.1 /lib/ld-linux-aarch64.so.1 ;; \
        x86_64) mkdir -p /lib64 && ln -sf /lib/ld-musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2 ;; \
    esac

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    addgroup appuser docker

WORKDIR /app

COPY --from=builder /app/target/release/judge-worker /app/judge-worker

RUN chown -R appuser:appuser /app

USER appuser

CMD ["/app/judge-worker"]
