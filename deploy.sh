#!/bin/bash

# Axis Imaging Patient Portal - Production Deployment Script
# This script deploys the application to production environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="axis-imaging-portal"
ENVIRONMENT="${1:-production}"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${BLUE}🏥 Axis Imaging Patient Portal - Deployment Script${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    command -v docker >/dev/null 2>&1 || { 
        echo -e "${RED}❌ Docker is required but not installed.${NC}" >&2; exit 1; 
    }
    
    command -v docker-compose >/dev/null 2>&1 || { 
        echo -e "${RED}❌ Docker Compose is required but not installed.${NC}" >&2; exit 1; 
    }
    
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ .env file not found. Please copy .env.example to .env and configure it.${NC}" >&2
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Build all services
build_services() {
    echo -e "${BLUE}🔨 Building services...${NC}"
    
    # Build backend
    echo -e "Building backend..."
    cd backend
    npm ci --production=false
    npm run build
    cd ..
    
    # Build webapp
    echo -e "Building webapp..."
    cd webapp
    npm ci --production=false
    npm run build
    cd ..
    
    # Build mobile app (web version)
    echo -e "Building mobile web app..."
    cd mobile
    npm ci --production=false
    npx expo export:web
    cd ..
    
    echo -e "${GREEN}✅ All services built successfully${NC}"
}

# Start database and run migrations
setup_database() {
    echo -e "${BLUE}🗄️  Setting up database...${NC}"
    
    # Start database container
    docker-compose -f $DOCKER_COMPOSE_FILE up -d postgres redis
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    sleep 10
    
    # Run database migrations
    cd backend
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed
    cd ..
    
    echo -e "${GREEN}✅ Database setup completed${NC}"
}

# Deploy application
deploy_application() {
    echo -e "${BLUE}🚀 Deploying application...${NC}"
    
    # Stop existing containers
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    # Pull latest images (if using external registry)
    # docker-compose -f $DOCKER_COMPOSE_FILE pull
    
    # Start all services
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 20
    
    echo -e "${GREEN}✅ Application deployed successfully${NC}"
}

# Run health checks
health_check() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Check backend health
    echo "Checking backend health..."
    if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        return 1
    fi
    
    # Check webapp
    echo "Checking webapp..."
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Webapp is healthy${NC}"
    else
        echo -e "${RED}❌ Webapp health check failed${NC}"
        return 1
    fi
    
    # Check database connection
    echo "Checking database connection..."
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_isready >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is healthy${NC}"
    else
        echo -e "${RED}❌ Database health check failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All health checks passed${NC}"
}

# Show deployment status
show_status() {
    echo -e "${BLUE}📊 Deployment Status${NC}"
    echo -e "${BLUE}==================${NC}"
    
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "Services available at:"
    echo -e "  📱 Patient Portal (Web): ${YELLOW}http://localhost:3000${NC}"
    echo -e "  📱 Mobile Web App: ${YELLOW}http://localhost:3002${NC}"
    echo -e "  🔧 Backend API: ${YELLOW}http://localhost:3001${NC}"
    echo -e "  📊 API Health: ${YELLOW}http://localhost:3001/api/health${NC}"
    echo ""
    echo -e "To view logs: ${YELLOW}docker-compose -f $DOCKER_COMPOSE_FILE logs -f${NC}"
    echo -e "To stop: ${YELLOW}docker-compose -f $DOCKER_COMPOSE_FILE down${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}⚠️  Deployment interrupted. Cleaning up...${NC}"
    docker-compose -f $DOCKER_COMPOSE_FILE down
    exit 1
}

# Handle script interruption
trap cleanup INT TERM

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    echo ""
    
    check_prerequisites
    echo ""
    
    build_services
    echo ""
    
    setup_database
    echo ""
    
    deploy_application
    echo ""
    
    if health_check; then
        echo ""
        show_status
    else
        echo -e "${RED}❌ Health checks failed. Deployment may have issues.${NC}"
        echo -e "${YELLOW}Check logs with: docker-compose -f $DOCKER_COMPOSE_FILE logs${NC}"
        exit 1
    fi
}

# Help message
show_help() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Arguments:"
    echo "  environment    Deployment environment (default: production)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy to production"
    echo "  $0 staging           # Deploy to staging"
    echo ""
    echo "Prerequisites:"
    echo "  - Docker and Docker Compose installed"
    echo "  - .env file configured (copy from .env.example)"
    echo "  - Required ports available (3000, 3001, 5432, 6379)"
}

# Check arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main deployment
main