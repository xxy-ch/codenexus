#!/bin/sh

# Docker entrypoint script for API service
# This script waits for PostgreSQL to be healthy, runs migrations, then starts the API

set -e

echo "Starting API service entrypoint..."

# Function to wait for PostgreSQL to be healthy
wait_for_postgres() {
    echo "Waiting for PostgreSQL to be healthy..."
    
    # Extract host and port from DATABASE_URL
    # Expected format: postgresql://postgres:postgres@postgres:5432/online_judge
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    echo "Database connection details: Host=$DB_HOST, Port=$DB_PORT, User=$DB_USER, Database=$DB_NAME"
    
    # Wait for PostgreSQL to be ready using pg_isready
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
        echo "PostgreSQL is not ready yet. Waiting 5 seconds..."
        sleep 5
    done
    
    echo "PostgreSQL is healthy and ready!"
}

# Main execution
main() {
    # Wait for PostgreSQL to be healthy
    wait_for_postgres

    echo "Starting API application..."
    
    # Start the API application
    exec "$@"
}

# Execute main function with all arguments passed to the script
main "$@"
