# Multi-stage build for Rust judge-worker
# Stage 1: Build
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    pkgconf \
    openssl-dev

# Set working directory
WORKDIR /app

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Create dummy main.rs to build dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy source code
COPY src ./src

# Build the actual application
RUN touch src/main.rs && \
    cargo build --release

# Stage 2: Runtime with Docker
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    docker \
    ca-certificates \
    curl

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

# Expose metrics port (optional)
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:9090/metrics || exit 1

# Switch to non-root user
USER appuser

# Run the application (requires privileged mode for Docker-in-Docker)
CMD ["/app/judge-worker"]
