#!/bin/bash

# Database initialization script for Online Judge
# This script sets up the database schema and sample data

set -e

echo "🔧 Online Judge Database Initialization"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    echo "Usage: DATABASE_URL=postgresql://user:password@host:port/database ./init_db.sh"
    exit 1
fi

print_success "Database URL found"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    print_error "psql is not installed. Please install PostgreSQL client tools."
    exit 1
fi

print_success "psql client found"

echo ""
echo "📋 Running database migrations..."
echo ""

# Run migrations
for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running migration: $migration"
        if psql "$DATABASE_URL" -f "$migration"; then
            print_success "Migration completed: $migration"
        else
            print_error "Migration failed: $migration"
            exit 1
        fi
    fi
done

echo ""
print_success "Database initialization completed successfully!"
echo ""
echo "📊 Database schema created:"
echo "  - Users and authentication"
echo "  - Problems and test cases"
echo "  - Submissions and results"
echo "  - Contests and registrations"
echo "  - Discussions and comments"
echo "  - Blog posts and comments"
echo ""
echo "👥 Sample users created:"
echo "  - admin@example.com (password: admin123)"
echo "  - user@example.com (password: admin123)"
echo "  - teacher@example.com (password: admin123)"
echo ""
echo "📝 Sample data:"
echo "  - 4 problems (easy to hard)"
echo "  - 2 contests"
echo "  - 2 discussions"
echo "  - 3 blog posts"
echo ""
print_warning "Remember to change default passwords in production!"
