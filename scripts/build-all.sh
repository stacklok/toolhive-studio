#!/bin/bash

# ToolHive Studio - Build All Platforms Script
# This script builds the application for all supported platforms and architectures

set -e

echo "🚀 Starting ToolHive Studio build for all platforms..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "forge.config.ts" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is required but not installed. Please install pnpm first."
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf out/ dist/ .vite/

# Install dependencies
print_status "Installing dependencies..."
pnpm install

# Run type checking
print_status "Running type checks..."
pnpm run type-check

# Run linting
print_status "Running linter..."
pnpm run lint

# Build TypeScript
print_status "Building TypeScript..."
npx tsc -b --clean && npx tsc -b

# Create out directory
mkdir -p out

# Build for current platform
print_status "Building for current platform..."
pnpm run make

print_success "🎉 Build completed! Check the 'out' directory for artifacts."

# List generated files
print_status "Generated artifacts:"
find out -name "*.exe" -o -name "*.dmg" -o -name "*.zip" -o -name "*.tar.gz" -o -name "*.deb" -o -name "*.rpm" -o -name "*.flatpak" -o -name "*.nupkg" | sort
