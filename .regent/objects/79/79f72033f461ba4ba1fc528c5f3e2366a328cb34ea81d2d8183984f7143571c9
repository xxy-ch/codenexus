# Multi-stage build for Rust judge-worker
# Build context: ./backend (from docker-compose.yml)
FROM rust:1.88-alpine AS builder

RUN apk add --no-cache \
    musl-dev \
    pkgconf \
    openssl-dev

WORKDIR /app

# Layer 1: Copy Cargo.toml files for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY judge-worker/Cargo.toml ./judge-worker/Cargo.toml
COPY shared/Cargo.toml ./shared/Cargo.toml

# Create dummy source files
RUN mkdir -p judge-worker/src shared/src && \
    printf 'fn main() {}\n' > judge-worker/src/main.rs && \
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
    cargo

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    addgroup appuser docker

WORKDIR /app

COPY --from=builder /app/target/release/judge-worker /app/judge-worker

RUN chown -R appuser:appuser /app

USER appuser

CMD ["/app/judge-worker"]
