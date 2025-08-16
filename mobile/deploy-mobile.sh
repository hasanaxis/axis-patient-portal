#!/bin/bash

# Axis Imaging Patient Portal - Mobile App Deployment Script
# This script builds and deploys the mobile app to app stores

set -e

echo "🏥 Axis Imaging Patient Portal - Mobile Deployment"
echo "================================================"

# Configuration
APP_NAME="Axis Imaging"
BUNDLE_ID="com.axisimaging.patientportal"
VERSION="1.0.0"
BUILD_NUMBER=$(date +%Y%m%d%H%M)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Expo CLI is installed
    if ! command -v expo &> /dev/null; then
        print_error "Expo CLI is not installed. Install with: npm install -g @expo/cli"
        exit 1
    fi
    
    # Check if EAS CLI is installed
    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI is not installed. Install with: npm install -g @expo/eas-cli"
        exit 1
    fi
    
    # Check if we're logged into Expo
    if ! expo whoami &> /dev/null; then
        print_warning "Not logged into Expo. Please run: expo login"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Clean and install dependencies
setup_environment() {
    print_status "Setting up environment..."
    
    # Clean node modules and reinstall
    rm -rf node_modules
    npm cache clean --force
    npm install
    
    # Update environment for production
    if [ "$1" = "production" ]; then
        print_status "Configuring for production environment..."
        # You would update environment variables here
        # cp .env.production .env
    fi
    
    print_success "Environment setup complete"
}

# Build for development testing
build_development() {
    print_status "Building development version..."
    
    # Build for iOS simulator
    print_status "Building iOS development..."
    expo run:ios --simulator
    
    # Build for Android emulator
    print_status "Building Android development..."
    expo run:android --device
    
    print_success "Development builds complete"
}

# Build for app store submission
build_production() {
    print_status "Building production version for app stores..."
    
    # Configure EAS build
    if [ ! -f "eas.json" ]; then
        print_status "Initializing EAS configuration..."
        eas build:configure
    fi
    
    # Build iOS for App Store
    print_status "Building iOS for App Store..."
    eas build --platform ios --profile production
    
    # Build Android for Play Store
    print_status "Building Android for Play Store..."
    eas build --platform android --profile production
    
    print_success "Production builds submitted to EAS"
    print_status "Check build status at: https://expo.dev/accounts/axis-imaging/projects/axis-imaging/builds"
}

# Submit to app stores
submit_to_stores() {
    print_status "Submitting to app stores..."
    
    # iOS App Store submission
    print_status "Submitting to iOS App Store..."
    eas submit --platform ios --latest
    
    # Android Play Store submission
    print_status "Submitting to Android Play Store..."
    eas submit --platform android --latest
    
    print_success "Apps submitted to stores"
    print_warning "Remember to complete app store metadata and screenshots"
}

# Update version numbers
update_version() {
    print_status "Updating version to $VERSION..."
    
    # Update app.json version
    jq ".expo.version = \"$VERSION\"" app.json > app.json.tmp && mv app.json.tmp app.json
    jq ".expo.ios.buildNumber = \"$BUILD_NUMBER\"" app.json > app.json.tmp && mv app.json.tmp app.json
    jq ".expo.android.versionCode = $BUILD_NUMBER" app.json > app.json.tmp && mv app.json.tmp app.json
    
    print_success "Version updated to $VERSION (build: $BUILD_NUMBER)"
}

# Test the build
test_build() {
    print_status "Running tests..."
    
    # Type checking
    npx tsc --noEmit
    
    # Lint check
    npx eslint src/ --ext .ts,.tsx
    
    # Bundle analysis
    npx expo export --dump-assetmap
    
    print_success "Tests passed"
}

# Generate release notes
generate_release_notes() {
    print_status "Generating release notes..."
    
    cat > release-notes.md << EOF
# Axis Imaging Patient Portal v${VERSION}

## Release Date
$(date +"%B %d, %Y")

## New Features
- View radiology scan images and reports
- Instant notifications when results are ready
- Book new appointments online
- Secure patient portal access
- Australian healthcare compliance

## Improvements
- Enhanced security and encryption
- Optimized image loading
- Improved user interface
- Better accessibility support

## Bug Fixes
- Resolved login issues
- Fixed image display problems
- Improved error handling

## Technical Details
- Version: ${VERSION}
- Build: ${BUILD_NUMBER}
- Platform: iOS/Android
- Minimum OS: iOS 13.0 / Android 6.0

## Support
For support, contact:
- Email: support@axisimaging.com.au
- Phone: +61 3 8765 1000
- Website: https://axisimaging.com.au/support
EOF

    print_success "Release notes generated"
}

# Main deployment function
deploy() {
    local target=${1:-development}
    
    print_status "Starting deployment for $target..."
    
    check_prerequisites
    setup_environment $target
    update_version
    test_build
    
    case $target in
        "development")
            build_development
            ;;
        "production")
            build_production
            generate_release_notes
            ;;
        "stores")
            build_production
            submit_to_stores
            generate_release_notes
            ;;
        *)
            print_error "Invalid target. Use: development, production, or stores"
            exit 1
            ;;
    esac
    
    print_success "Deployment completed!"
}

# Show usage
show_usage() {
    echo "Usage: $0 [target]"
    echo ""
    echo "Targets:"
    echo "  development  - Build for development/testing"
    echo "  production   - Build for app store review"
    echo "  stores       - Build and submit to app stores"
    echo ""
    echo "Examples:"
    echo "  $0 development"
    echo "  $0 production"
    echo "  $0 stores"
}

# Main script
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

case $1 in
    "development"|"production"|"stores")
        deploy $1
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac