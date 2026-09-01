# Release Process

This document outlines the release process for Taykie, including version releases, build releases, and store submissions.

## Overview

We use Git Flow with automated EAS builds and a custom deploy script to manage releases. All releases are tagged with build numbers for complete traceability.

## Release Types

### Version Releases (major/minor/patch)

Creates a new version with semantic versioning:

- **Patch**: Bug fixes (1.0.0 → 1.0.1)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Major**: Breaking changes (1.0.0 → 2.0.0)

### Build Releases

Creates additional builds of the current version for TestFlight iterations without changing the version number.

## Commands

### Version Releases

```bash
yarn release:major    # 1.0.0 → 2.0.0
yarn release:minor    # 1.0.0 → 1.1.0
yarn release:patch    # 1.0.0 → 1.0.1
```

### Build Releases

```bash
yarn release:build    # Additional build of current version
```

### Store Submission

```bash
yarn deploy:submit                # Submit both platforms
yarn deploy:submit --platform ios   # iOS only
yarn deploy:submit --platform android # Android only
```

### Web Deployment

```bash
yarn deploy:web                   # Deploy to production
yarn deploy:web --env staging     # Deploy to staging
```

### Testing

```bash
yarn deploy --dry-run            # Preview any command without executing
```

## Release Flow

### 1. Version Release Process

```bash
yarn release:patch
```

**What happens:**

1. Fetches current EAS build numbers
2. Predicts next build numbers (+1)
3. Starts Git Flow release branch
4. Updates version in `package.json` and `app.json`
5. Commits version changes
6. Finishes Git Flow release (merges to main, creates tag)
7. Tags with predicted build numbers
8. Pushes to develop, main, and tags
9. GitHub Actions automatically triggers EAS builds

**Result:**

- Git tag: `1.0.1+8` (if build numbers are aligned)
- EAS builds available in TestFlight/Internal Testing

### 2. Build Release Process

```bash
yarn release:build
```

**What happens:**

1. Fetches current EAS build numbers
2. Predicts next build numbers (+1)
3. Git Flow release (no version commits)
4. Tags with predicted build numbers
5. Pushes changes
6. GitHub Actions triggers EAS builds

**Result:**

- Git tag: `1.0.1+9` (next build of same version)
- Additional EAS builds for testing

### 3. Store Submission

```bash
yarn deploy:submit --platform ios
```

**What happens:**

- Submits latest build to TestFlight/App Store
- Uses EAS Submit for automated process

## Git Flow Integration

- **Version releases**: Create release branch → commit version changes → merge to main → tag
- **Build releases**: Create release branch → no commits → merge to main → tag
- **All releases**: Push to develop, main, and tags
- **CI Integration**: GitHub Actions automatically builds from main branch pushes

## Build Number Management

### Aligned Build Numbers

When iOS and Android build numbers match, tags use simple format:

- Tag: `1.0.1+8`
- iOS build: `1.0.1 (8)`
- Android build: `1.0.1 (8)`

### Misaligned Build Numbers

When build numbers differ, tags use compound format:

- Tag: `1.0.1+ios8+and10`
- iOS build: `1.0.1 (8)`
- Android build: `1.0.1 (10)`

### Manual Alignment

To realign build numbers:

```bash
# Check current numbers
eas build:version:get -p all

# Set both to highest number + 1
eas build:version:set --platform ios --build-number {number}
eas build:version:set --platform android --build-number {number}
```

## Typical Workflows

### New Feature Release

```bash
# Create minor version release
yarn release:minor

# Wait for CI to complete builds
# Test in TestFlight/Internal Testing

# Submit to stores when ready
yarn deploy:submit
```

### Bug Fix Release

```bash
# Create patch version release
yarn release:patch

# Test and submit
yarn deploy:submit
```

### TestFlight Iteration

```bash
# Make code changes
# Create build release (same version, new build)
yarn release:build

# Test in TestFlight
# Repeat as needed

# Final submission
yarn deploy:submit
```

### Web Deployment

```bash
# Deploy to staging for testing
yarn deploy:web --env staging

# Deploy to production
yarn deploy:web
```

## Troubleshooting

### Build Number Mismatch

If predicted build numbers don't match actual EAS builds:

- This is just a tag mismatch, builds still work
- Re-tag manually if needed: `git tag 1.0.1+{actual_numbers}`

### Failed CI Build

If GitHub Actions fails:

- Check workflow logs
- Fix issues and push again
- CI will rebuild automatically

### EAS Build Failures

- Check EAS dashboard for build logs
- Common issues: dependency conflicts, native code changes
- Retry with: `eas build --platform {platform} --profile production`

## Configuration Files

### EAS Configuration (`eas.json`)

- Build profiles: development, preview, production
- Auto-increment enabled for production builds
- Submit configuration for store uploads

### GitHub Actions (`.github/workflows/create-builds.yml`)

- Triggers on pushes to main branch
- Builds both iOS and Android
- Uses production profile

### Deploy Script (`scripts/deploy.js`)

- Handles all release commands
- Integrates with Git Flow
- Manages build number prediction and tagging

## Best Practices

1. **Always test with dry run first**: `yarn deploy --dry-run`
2. **Use build releases for TestFlight iterations**
3. **Keep build numbers aligned when possible**
4. **Test in TestFlight/Internal Testing before store submission**
5. **Use semantic versioning appropriately**
6. **Document significant changes in commit messages**
7. **Monitor CI builds after releases**

## Recovery Procedures

### If Git Flow Release Fails

```bash
# Abort current release
git flow release abort {version}

# Clean up any partial changes
git reset --hard HEAD
git checkout develop
```

### If Build Numbers Get Out of Sync

```bash
# Get current state
eas build:version:get -p all

# Manually align to highest + 1
eas build:version:set --platform ios
eas build:version:set --platform android
```

### If Tags Are Incorrect

```bash
# Delete incorrect tag
git tag -d {tag_name}
git push origin :refs/tags/{tag_name}

# Create correct tag
git tag {correct_tag_name} {commit_hash}
git push origin {correct_tag_name}
```
