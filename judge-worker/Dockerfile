# Multi-stage build for Rust judge-worker
# Stage 1: Build
FROM rust:1.88-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    pkgconf \
    openssl-dev

# Set working directory
WORKDIR /app

# Copy workspace sources required by judge-worker
COPY Cargo.toml Cargo.lock ./
COPY api/Cargo.toml ./api/Cargo.toml
COPY judge-worker ./judge-worker
COPY shared ./shared
RUN mkdir -p api/src && printf 'fn main() {}\n' > api/src/main.rs

# Build the actual application
RUN cargo build --release -p judge-worker

# Stage 2: Runtime with Docker
FROM alpine:3.19

# Install runtime dependencies
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

# Create app user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    addgroup appuser docker

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/judge-worker /app/judge-worker

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Run the application (requires privileged mode for Docker-in-Docker)
CMD ["/app/judge-worker"]
