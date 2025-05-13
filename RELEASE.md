# Release Process for Gyazo MCP Server

This document outlines the steps to release new versions of the `@notainc/gyazo-mcp-server` package to the npm registry.

## Release Steps

### 1. Create a Version Bump Branch

First, create a new branch following the pattern `bump-v{version}`:

```bash
# Example for version 0.2.0
git checkout -b bump-v0.2.0
```

### 2. Update the Version

Choose the appropriate command based on the type of changes:

```bash
# For bug fixes and minor changes (0.1.0 -> 0.1.1)
npm version patch

# For new features that don't break compatibility (0.1.0 -> 0.2.0)
npm version minor

# For breaking changes (0.1.0 -> 1.0.0)
npm version major
```

These commands will:

- Update the version in `package.json`
- Create a git commit with the new version
- Create a git tag with the new version (e.g., `v0.1.1`)

### 3. Create a Pull Request

Create a pull request from your version bump branch to the `main` branch:

```bash
# Push your changes to your branch
git push origin bump-v{version}
```

Then create a pull request on GitHub with:

- A clear title describing the release
- A detailed description of the changes included in this release
- Reference to any issues that are addressed

### 4. After PR Approval and Merge

Once the PR is approved and merged to `main`, ensure you have the latest main:

```bash
git checkout main
git pull origin main
```

### 5. Create and Push Git Tag

Create a tag that matches the version in `package.json`:

```bash
git tag v<version>  # e.g., git tag v0.1.1
```

Push the tag to trigger the release workflow:

```bash
git push origin v<version>  # e.g., git push origin v0.1.1
```

### 6. Verify the Release

The GitHub Action workflow (`publish_npm_package`) will automatically:

- Build the package
- Run linting and tests
- Publish the package to the npm registry
- Create a draft GitHub release with auto-generated release notes

Verify that:

- The workflow completes successfully on GitHub Actions
- The new version is available on npm (`npm view @notainc/gyazo-mcp-server`)

## Release Notes

The release notes will be automatically generated based on the PR labels and the configuration in `.github/release.yml`.

Categories in release notes:

- Breaking Changes 🛠
- Exciting New Features 🎉
- Other Changes
