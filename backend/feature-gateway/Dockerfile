# Multi-stage build for Rust feature-gateway
# Build context: ./backend (from docker-compose.yml)
FROM rust:1.88-alpine AS builder

RUN apk add --no-cache \
    musl-dev \
    pkgconf \
    openssl-dev

WORKDIR /app

# Layer 1: Copy Cargo.toml files for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY feature-gateway/Cargo.toml ./feature-gateway/Cargo.toml
COPY shared/Cargo.toml ./shared/Cargo.toml

# Create dummy source files
RUN mkdir -p feature-gateway/src shared/src && \
    printf 'fn main() {}\n' > feature-gateway/src/main.rs && \
    printf '' > shared/src/lib.rs

# Build dependencies only (cached layer)
RUN cargo build --release -p feature-gateway 2>/dev/null || true

# Layer 2: Copy actual source code
COPY feature-gateway ./feature-gateway
COPY shared ./shared

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
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["/app/feature-gateway"]
