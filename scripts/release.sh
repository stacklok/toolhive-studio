#!/bin/bash

# ToolHive Studio - Manual Release Script
# This script builds all platforms and creates a GitHub release

set -e

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

# Check if version argument is provided
if [ $# -eq 0 ]; then
    print_error "Please provide a version number (e.g., ./scripts/release.sh v1.0.0)"
    exit 1
fi

VERSION=$1

# Validate version format
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    print_error "Invalid version format. Use semantic versioning like v1.0.0 or v1.0.0-beta"
    exit 1
fi

print_status "🚀 Starting release process for version $VERSION"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This is not a git repository"
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory is not clean. Uncommitted changes:"
    git status --short
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Release cancelled"
        exit 1
    fi
fi

# Update package.json version
print_status "Updating package.json version to $VERSION"
npm version ${VERSION#v} --no-git-tag-version

# Run build script
print_status "Running build for all platforms..."
./scripts/build-all.sh

# Create git tag
print_status "Creating git tag $VERSION"
git add package.json
git commit -m "Release $VERSION"
git tag $VERSION

# Push to GitHub
print_status "Pushing to GitHub..."
git push origin main
git push origin $VERSION

print_success "🎉 Release $VERSION created successfully!"
print_status "The GitHub Actions workflow will automatically build and publish the release."
print_status "Check: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
