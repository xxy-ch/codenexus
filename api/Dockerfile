# Multi-stage build for Rust API service
# Stage 1: Build
FROM rust:1.88-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    postgresql-client \
    pkgconf \
    openssl-dev \
    curl

# Set working directory
WORKDIR /app

# Copy workspace sources required by api
COPY Cargo.toml Cargo.lock ./
COPY judge-worker/Cargo.toml ./judge-worker/Cargo.toml
COPY api ./api
COPY shared ./shared
RUN mkdir -p judge-worker/src && printf 'fn main() {}\n' > judge-worker/src/main.rs

# Build the actual application
RUN cargo build --release -p api

# Stage 2: Runtime
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    ca-certificates \
    curl

# Create app user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Set working directory
WORKDIR /app

# Copy binary, migrations, and entrypoint
COPY --from=builder /app/target/release/api /app/api
COPY api/migrations /app/migrations
COPY api/docker-entrypoint.sh /usr/local/bin/

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
# Run the application
CMD ["/app/api"]
