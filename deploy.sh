#!/bin/bash

# Online Judge Deployment Script
# This script helps deploy the Online Judge system in different modes

set -e

echo "🚀 Online Judge Deployment Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Docker and Docker Compose are installed"

# Parse command line arguments
MODE=${1:-"frontend"}

case $MODE in
    frontend)
        echo ""
        echo "🎯 Deploying Frontend-Only Mode (Mock Data)"
        echo "=========================================="
        echo ""
        echo "This will start:"
        echo "  - Frontend (Vite dev server with mock data)"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_success "Starting frontend services..."
            docker compose up -d postgres redis frontend
            echo ""
            print_success "Frontend is now running!"
            echo ""
            echo "📱 Access the application at: http://localhost:5173"
            echo "📊 PostgreSQL at: localhost:5432"
            echo "🔴 Redis at: localhost:6379"
            echo ""
            echo "📝 View logs with: docker compose logs -f frontend"
            echo "🛑 Stop with: docker compose down"
        fi
        ;;

    full)
        echo ""
        echo "🎯 Deploying Full Stack Mode"
        echo "============================"
        echo ""
        echo "This will start:"
        echo "  - PostgreSQL database"
        echo "  - Redis cache"
        echo "  - Rust API backend"
        echo "  - React frontend"
        echo "  - Judge worker"
        echo ""
        print_warning "Note: Backend API requires compilation fixes first!"
        print_warning "See DEPLOYMENT_STATUS.md for details"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_success "Building and starting all services..."
            docker compose up -d --build
            echo ""
            print_success "All services are now running!"
            echo ""
            echo "📱 Frontend: http://localhost:5173"
            echo "🔧 API: http://localhost:3000"
            echo "❤️  Health check: http://localhost:3000/health"
            echo "📊 PostgreSQL: localhost:5432"
            echo "🔴 Redis: localhost:6379"
            echo ""
            echo "📝 View logs with: docker compose logs -f [service]"
            echo "🛑 Stop with: docker compose down"
            echo "🧹 Clean everything: docker compose down -v"
        fi
        ;;

    stop)
        echo ""
        echo "🛑 Stopping all services..."
        docker compose down
        print_success "All services stopped"
        ;;

    clean)
        echo ""
        echo "🧹 Cleaning up everything (including volumes)..."
        echo "⚠️  This will delete all data!"
        read -p "Are you sure? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose down -v
            print_success "All services stopped and volumes removed"
        fi
        ;;

    status)
        echo ""
        echo "📊 Service Status"
        echo "================"
        docker compose ps
        ;;

    logs)
        SERVICE=${2:-""}
        echo ""
        echo "📝 Viewing logs..."
        if [ -z "$SERVICE" ]; then
            docker compose logs -f
        else
            docker compose logs -f "$SERVICE"
        fi
        ;;

    rebuild)
        SERVICE=${2:-""}
        echo ""
        echo "🔨 Rebuilding services..."
        if [ -z "$SERVICE" ]; then
            docker compose up -d --build
        else
            docker compose up -d --build "$SERVICE"
        fi
        print_success "Rebuild complete"
        ;;

    *)
        echo "Usage: $0 {frontend|full|stop|clean|status|logs|rebuild}"
        echo ""
        echo "Commands:"
        echo "  frontend  - Deploy frontend only with mock data (recommended)"
        echo "  full      - Deploy full stack (requires backend fixes)"
        echo "  stop      - Stop all services"
        echo "  clean     - Stop and remove all volumes (deletes data)"
        echo "  status    - Show service status"
        echo "  logs      - View logs (optional: specify service name)"
        echo "  rebuild   - Rebuild services (optional: specify service name)"
        echo ""
        echo "Examples:"
        echo "  $0 frontend           # Deploy frontend with mock data"
        echo "  $0 full               # Deploy full stack"
        echo "  $0 logs frontend      # View frontend logs"
        echo "  $0 rebuild api        # Rebuild API service"
        exit 1
        ;;
esac

echo ""
print_success "Deployment script completed!"
echo ""
