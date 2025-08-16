#!/bin/bash

# Axis Imaging Patient Portal - Comprehensive Test Runner
# Runs all tests across backend, frontend, and mobile applications

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV="test"
PARALLEL_TESTS=true
COVERAGE_REPORT=true

echo -e "${BLUE}🧪 Axis Imaging Patient Portal - Test Suite${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Test categories
BACKEND_TESTS=true
FRONTEND_TESTS=true
MOBILE_TESTS=false  # Requires emulator/device
E2E_TESTS=false     # Requires full environment setup
INTEGRATION_TESTS=true
PERFORMANCE_TESTS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --backend-only)
      BACKEND_TESTS=true
      FRONTEND_TESTS=false
      MOBILE_TESTS=false
      E2E_TESTS=false
      shift
      ;;
    --frontend-only)
      BACKEND_TESTS=false
      FRONTEND_TESTS=true
      MOBILE_TESTS=false
      E2E_TESTS=false
      shift
      ;;
    --mobile-only)
      BACKEND_TESTS=false
      FRONTEND_TESTS=false
      MOBILE_TESTS=true
      E2E_TESTS=false
      shift
      ;;
    --with-e2e)
      E2E_TESTS=true
      shift
      ;;
    --with-mobile)
      MOBILE_TESTS=true
      shift
      ;;
    --with-performance)
      PERFORMANCE_TESTS=true
      shift
      ;;
    --no-coverage)
      COVERAGE_REPORT=false
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --backend-only      Run only backend tests"
    echo "  --frontend-only     Run only frontend tests"
    echo "  --mobile-only       Run only mobile tests"
    echo "  --with-e2e         Include end-to-end tests"
    echo "  --with-mobile      Include mobile tests"
    echo "  --with-performance Include performance tests"
    echo "  --no-coverage      Disable coverage reporting"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run backend and frontend tests"
    echo "  $0 --backend-only     # Run only backend tests"
    echo "  $0 --with-e2e         # Run all tests including E2E"
}

# Test results tracking
BACKEND_RESULT=0
FRONTEND_RESULT=0
MOBILE_RESULT=0
E2E_RESULT=0
INTEGRATION_RESULT=0
PERFORMANCE_RESULT=0

# Setup test environment
setup_test_environment() {
    echo -e "${BLUE}🔧 Setting up test environment...${NC}"
    
    # Set test environment variables
    export NODE_ENV=test
    export DATABASE_URL="postgresql://test:test@localhost:5432/axis_portal_test"
    export REDIS_URL="redis://localhost:6379/1"
    export JWT_SECRET="test-jwt-secret-key-for-testing-only"
    
    # Start test databases if needed
    if command -v docker-compose >/dev/null 2>&1; then
        echo "Starting test databases..."
        docker-compose -f docker-compose.test.yml up -d postgres redis
        sleep 5
    fi
    
    echo -e "${GREEN}✅ Test environment setup completed${NC}"
}

# Run backend tests
run_backend_tests() {
    if [ "$BACKEND_TESTS" = false ]; then
        return 0
    fi
    
    echo -e "${BLUE}🔙 Running Backend Tests...${NC}"
    echo "================================"
    
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing backend dependencies..."
        npm ci
    fi
    
    # Setup test database
    echo "Setting up test database..."
    npx prisma generate
    npx prisma db push --skip-generate
    
    # Run tests
    if [ "$COVERAGE_REPORT" = true ]; then
        npm run test:coverage || BACKEND_RESULT=$?
    else
        npm test || BACKEND_RESULT=$?
    fi
    
    cd ..
    
    if [ $BACKEND_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Backend tests passed${NC}"
    else
        echo -e "${RED}❌ Backend tests failed${NC}"
    fi
    
    echo ""
}

# Run frontend tests
run_frontend_tests() {
    if [ "$FRONTEND_TESTS" = false ]; then
        return 0
    fi
    
    echo -e "${BLUE}🌐 Running Frontend Tests...${NC}"
    echo "================================="
    
    cd webapp
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm ci
    fi
    
    # Run tests
    if [ "$COVERAGE_REPORT" = true ]; then
        npm run test:coverage || FRONTEND_RESULT=$?
    else
        npm test || FRONTEND_RESULT=$?
    fi
    
    cd ..
    
    if [ $FRONTEND_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend tests passed${NC}"
    else
        echo -e "${RED}❌ Frontend tests failed${NC}"
    fi
    
    echo ""
}

# Run mobile tests
run_mobile_tests() {
    if [ "$MOBILE_TESTS" = false ]; then
        return 0
    fi
    
    echo -e "${BLUE}📱 Running Mobile Tests...${NC}"
    echo "==========================="
    
    cd mobile
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing mobile dependencies..."
        npm ci
    fi
    
    # Run unit tests
    npm test || MOBILE_RESULT=$?
    
    # Run E2E tests if enabled and device/emulator available
    if [ "$E2E_TESTS" = true ]; then
        echo "Running mobile E2E tests..."
        
        # Check if iOS simulator is available
        if command -v xcrun >/dev/null 2>&1; then
            echo "Running iOS E2E tests..."
            npx detox test --configuration ios || MOBILE_RESULT=$?
        fi
        
        # Check if Android emulator is available
        if command -v adb >/dev/null 2>&1; then
            echo "Running Android E2E tests..."
            npx detox test --configuration android || MOBILE_RESULT=$?
        fi
    fi
    
    cd ..
    
    if [ $MOBILE_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Mobile tests passed${NC}"
    else
        echo -e "${RED}❌ Mobile tests failed${NC}"
    fi
    
    echo ""
}

# Run integration tests
run_integration_tests() {
    if [ "$INTEGRATION_TESTS" = false ]; then
        return 0
    fi
    
    echo -e "${BLUE}🔗 Running Integration Tests...${NC}"
    echo "==============================="
    
    # Run API integration tests
    cd backend
    npm run test:integration || INTEGRATION_RESULT=$?
    cd ..
    
    if [ $INTEGRATION_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
    fi
    
    echo ""
}

# Run performance tests
run_performance_tests() {
    if [ "$PERFORMANCE_TESTS" = false ]; then
        return 0
    fi
    
    echo -e "${BLUE}⚡ Running Performance Tests...${NC}"
    echo "==============================="
    
    cd backend
    npm run test:performance || PERFORMANCE_RESULT=$?
    cd ..
    
    if [ $PERFORMANCE_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Performance tests passed${NC}"
    else
        echo -e "${RED}❌ Performance tests failed${NC}"
    fi
    
    echo ""
}

# Run security tests
run_security_tests() {
    echo -e "${BLUE}🔒 Running Security Tests...${NC}"
    echo "============================="
    
    # Run npm audit
    echo "Checking for security vulnerabilities..."
    
    cd backend
    npm audit --audit-level moderate || echo -e "${YELLOW}⚠️  Backend security issues found${NC}"
    cd ..
    
    cd webapp
    npm audit --audit-level moderate || echo -e "${YELLOW}⚠️  Frontend security issues found${NC}"
    cd ..
    
    cd mobile
    npm audit --audit-level moderate || echo -e "${YELLOW}⚠️  Mobile security issues found${NC}"
    cd ..
    
    echo -e "${GREEN}✅ Security audit completed${NC}"
    echo ""
}

# Generate test report
generate_test_report() {
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo "======================="
    
    local total_tests=0
    local passed_tests=0
    
    if [ "$BACKEND_TESTS" = true ]; then
        total_tests=$((total_tests + 1))
        echo -n "Backend Tests: "
        if [ $BACKEND_RESULT -eq 0 ]; then
            echo -e "${GREEN}PASSED${NC}"
            passed_tests=$((passed_tests + 1))
        else
            echo -e "${RED}FAILED${NC}"
        fi
    fi
    
    if [ "$FRONTEND_TESTS" = true ]; then
        total_tests=$((total_tests + 1))
        echo -n "Frontend Tests: "
        if [ $FRONTEND_RESULT -eq 0 ]; then
            echo -e "${GREEN}PASSED${NC}"
            passed_tests=$((passed_tests + 1))
        else
            echo -e "${RED}FAILED${NC}"
        fi
    fi
    
    if [ "$MOBILE_TESTS" = true ]; then
        total_tests=$((total_tests + 1))
        echo -n "Mobile Tests: "
        if [ $MOBILE_RESULT -eq 0 ]; then
            echo -e "${GREEN}PASSED${NC}"
            passed_tests=$((passed_tests + 1))
        else
            echo -e "${RED}FAILED${NC}"
        fi
    fi
    
    if [ "$INTEGRATION_TESTS" = true ]; then
        total_tests=$((total_tests + 1))
        echo -n "Integration Tests: "
        if [ $INTEGRATION_RESULT -eq 0 ]; then
            echo -e "${GREEN}PASSED${NC}"
            passed_tests=$((passed_tests + 1))
        else
            echo -e "${RED}FAILED${NC}"
        fi
    fi
    
    if [ "$PERFORMANCE_TESTS" = true ]; then
        total_tests=$((total_tests + 1))
        echo -n "Performance Tests: "
        if [ $PERFORMANCE_RESULT -eq 0 ]; then
            echo -e "${GREEN}PASSED${NC}"
            passed_tests=$((passed_tests + 1))
        else
            echo -e "${RED}FAILED${NC}"
        fi
    fi
    
    echo ""
    echo "Overall: $passed_tests/$total_tests test suites passed"
    
    if [ $passed_tests -eq $total_tests ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        return 1
    fi
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up test environment...${NC}"
    
    # Stop test databases
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose -f docker-compose.test.yml down
    fi
    
    # Reset environment variables
    unset NODE_ENV
    unset DATABASE_URL
    unset REDIS_URL
    unset JWT_SECRET
}

# Handle script interruption
trap cleanup INT TERM

# Main test execution
main() {
    echo -e "${BLUE}Starting comprehensive test suite...${NC}"
    echo ""
    
    setup_test_environment
    echo ""
    
    # Run test suites
    run_backend_tests
    run_frontend_tests
    run_mobile_tests
    run_integration_tests
    run_performance_tests
    run_security_tests
    
    # Generate final report
    if generate_test_report; then
        cleanup
        exit 0
    else
        cleanup
        exit 1
    fi
}

# Run main function
main