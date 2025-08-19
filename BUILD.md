# ToolHive Studio Build Guide

This guide explains how to build ToolHive Studio for all supported platforms and how to create releases.

## Quick Start

### Prerequisites
- **Node.js** >= 22.0.0 (use `nvm` or `fnm` to manage versions)
- **pnpm** 10.13.1+ (package manager)
- **Docker** (required for ToolHive to function)
- **Git** (for version control and releases)

### Platform-Specific Requirements

#### Windows
- **Visual Studio Build Tools** or **Visual Studio Community** (for native modules)
- **Windows SDK** (latest version)

#### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **macOS code signing certificates** (for distribution)

#### Linux
- **Build essentials**: `sudo apt-get install build-essential`
- **System packages**: `sudo apt-get install rpm flatpak flatpak-builder elfutils`

## Build Commands

### Local Development Build
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run start

# Build for current platform only
pnpm run make
```

### Platform-Specific Builds
```bash
# Windows builds
pnpm run build:win        # Windows x64
pnpm run build:win-arm    # Windows ARM64

# macOS builds  
pnpm run build:mac        # macOS Intel
pnpm run build:mac-arm    # macOS Apple Silicon

# Linux builds
pnpm run build:linux      # Linux x64
pnpm run build:linux-arm  # Linux ARM64
```

### Build All Platforms
```bash
# Build for all supported platforms (current OS only)
pnpm run build:all

# Or use the script directly
./scripts/build-all.sh
```

## Generated Artifacts

The build process creates the following artifacts in the `out/` directory:

### Windows
- `ToolHive.Setup.exe` - Squirrel installer
- `ToolHive-win32-x64-0.2.0.zip` - Portable ZIP
- `ToolHive-0.2.0-full.nupkg` - NuGet package

### macOS
- `ToolHive-x64.dmg` - Intel DMG installer
- `ToolHive-arm64.dmg` - Apple Silicon DMG installer
- `ToolHive-darwin-x64-0.2.0.zip` - Intel ZIP
- `ToolHive-darwin-arm64-0.2.0.zip` - Apple Silicon ZIP

### Linux
- `toolhive-studio-linux-x64.tar.gz` - Generic Linux archive
- `toolhive_0.2.0_amd64.deb` - Debian/Ubuntu package
- `ToolHive-0.2.0-1.x86_64.rpm` - RedHat/Fedora package
- `io.github.stacklok.toolhive_studio_stable_x86_64.flatpak` - Flatpak package

## Release Process

### Automated Release (Recommended)

1. **Tag a release:**
   ```bash
   ./scripts/release.sh v1.0.0
   ```

2. **What happens automatically:**
   - Updates `package.json` version
   - Creates git tag
   - Pushes to GitHub
   - Triggers GitHub Actions workflow
   - Builds all platforms in parallel
   - Creates GitHub release with all artifacts

### Manual Release

1. **Update version:**
   ```bash
   npm version 1.0.0 --no-git-tag-version
   ```

2. **Build all platforms:**
   ```bash
   pnpm run build:all
   ```

3. **Create release manually:**
   - Go to GitHub Releases
   - Create new release
   - Upload artifacts from `out/` directory

### GitHub Actions Workflow

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/build-and-release.yml`) that:

- **Builds on 3 platforms:** Windows, macOS, Linux
- **Supports 2 architectures:** x64, ARM64
- **Runs quality checks:** TypeScript, ESLint, tests
- **Creates releases automatically** when tags are pushed
- **Uploads all artifacts** to GitHub Releases

#### Triggering the Workflow

**Automatic (on tag push):**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Manual trigger:**
- Go to Actions tab in GitHub
- Select "Build and Release" workflow
- Click "Run workflow"
- Enter version number

## Cross-Platform Building

### Building Windows Apps on macOS/Linux
❌ **Not directly supported** - Windows-specific installers require Windows

### Building macOS Apps on Linux/Windows  
❌ **Not directly supported** - macOS code signing requires macOS

### Building Linux Apps on Windows/macOS
✅ **Partially supported** - Some formats work, Flatpak requires Linux

### Recommended Approach
Use **GitHub Actions** for true cross-platform building as it provides all three OS environments.

## Code Signing & Notarization

### Windows Code Signing
Set these environment variables:
```bash
export WINDOWS_CERTIFICATE_FILE="path/to/cert.p12"
export WINDOWS_CERTIFICATE_PASSWORD="password"
```

### macOS Code Signing & Notarization
Set these secrets in GitHub or environment:
```bash
export MAC_DEVELOPER_IDENTITY="Developer ID Application: Your Name"
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export TEAM_ID="your-team-id"
```

## Troubleshooting

### Common Issues

**"thv binary not found"**
- Run `pnpm thv` to download the required binary
- Check your internet connection

**"Build failed for platform"**  
- Ensure you have platform-specific build tools installed
- Check the build logs for specific error messages

**"Permission denied: ./scripts/build-all.sh"**
```bash
chmod +x scripts/build-all.sh
chmod +x scripts/release.sh
```

**"Git working directory not clean"**
- Commit or stash your changes before releasing
- Or use the `-f` flag to force (not recommended)

### Getting Help

1. Check the build logs in GitHub Actions
2. Ensure all prerequisites are installed
3. Try building for your current platform first
4. Open an issue with build logs if problems persist

## Performance Tips

- **Parallel builds:** GitHub Actions builds all platforms simultaneously
- **Local development:** Only build for your current platform during development
- **CI/CD:** Use the automated release process for consistency
- **Dependencies:** Keep `node_modules` and build cache between builds when possible
