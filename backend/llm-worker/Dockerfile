# Multi-stage build for Rust llm-worker
# Build context: ./backend (from docker-compose.yml)
FROM rust:1.88-alpine AS builder

RUN apk add --no-cache \
    musl-dev \
    pkgconf \
    openssl-dev

WORKDIR /app

# Layer 1: Copy Cargo.toml files for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY llm-worker/Cargo.toml ./llm-worker/Cargo.toml
COPY shared/Cargo.toml ./shared/Cargo.toml

# Create dummy source files
RUN mkdir -p llm-worker/src shared/src && \
    printf 'fn main() {}\n' > llm-worker/src/main.rs && \
    printf '' > shared/src/lib.rs

# Build dependencies only (cached layer)
RUN cargo build --release -p llm-worker 2>/dev/null || true

# Layer 2: Copy actual source code
COPY llm-worker ./llm-worker
COPY shared ./shared

# Build the actual application
RUN cargo build --release -p llm-worker

# Stage 2: Minimal runtime
FROM alpine:3.19

RUN apk add --no-cache \
    ca-certificates \
    curl

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

COPY --from=builder /app/target/release/llm-worker /app/llm-worker

RUN chown -R appuser:appuser /app

USER appuser

CMD ["/app/llm-worker"]
