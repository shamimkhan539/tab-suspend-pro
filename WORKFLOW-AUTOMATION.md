# Automated GitHub Actions Workflow Setup

This repository now has a complete automated workflow system that handles tagging and releases when code is pushed to the master branch.

## 🚀 How It Works

### 1. **Master Branch Pipeline** (`master-pipeline.yml`)

**Triggers:** When code is pushed to the `master` branch (excluding documentation files)

**What it does:**

1. **Validates** the extension code:

    - Checks `manifest.json` is valid JSON
    - Verifies all required files exist
    - Validates JavaScript syntax
    - Ensures all required icons are present
    - Creates a test build

2. **Auto-creates tags:**

    - Reads version from `manifest.json`
    - Creates a tag like `v2.0.3` (based on manifest version)
    - Only creates tag if it doesn't already exist
    - Pushes the tag to GitHub

3. **Triggers release:**
    - The new tag automatically triggers the existing `release.yml` workflow
    - Creates a GitHub release with the extension zip file

### 2. **Pull Request Validation** (`pr-validation.yml`)

**Triggers:** When a Pull Request is opened/updated against `master`

**What it does:**

1. Runs the same validation checks as master pipeline
2. Compares version with master branch
3. Shows a summary of what will happen when PR is merged
4. Helps catch issues before they reach master

### 3. **Release Workflow** (`release.yml`) - _Existing_

**Triggers:** When a tag matching `v*.*.*` is pushed

**What it does:**

1. Validates manifest version matches tag version
2. Creates extension package zip file
3. Creates GitHub release with auto-generated changelog
4. Attaches the zip file to the release

## 📋 Workflow Summary

```
Push to Master → Validation → Auto-Tag Creation → Release Workflow → GitHub Release
```

## 🔄 Development Workflow

### For Regular Updates (No New Release):

1. Make your changes
2. Push to master
3. ✅ Validation runs automatically
4. ⏭️ No new tag created (version unchanged)

### For New Releases:

1. Make your changes
2. **Update version in `manifest.json`** (e.g., `2.0.3` → `2.0.4`)
3. Push to master
4. ✅ Validation runs
5. 🏷️ Tag `v2.0.4` created automatically
6. 📦 Release workflow triggered
7. 🚀 GitHub release published with zip file

### For Pull Requests:

1. Create PR against master
2. ✅ PR validation runs automatically
3. 📋 Shows summary of what will happen when merged
4. Merge when ready

## 🛠️ Manual Operations

### To create a release manually:

```bash
# Update version in manifest.json first, then:
git tag v2.0.4
git push origin v2.0.4
```

### To skip automation:

Add `[skip ci]` to your commit message to skip GitHub Actions.

## 📁 Current Workflow Files

-   `.github/workflows/master-pipeline.yml` - Main automation for master branch
-   `.github/workflows/pr-validation.yml` - PR validation and preview
-   `.github/workflows/release.yml` - Creates GitHub releases from tags

## 🔍 What Gets Validated

### Required Files:

-   `manifest.json` (valid JSON)
-   `background.js`
-   `content.js`
-   `popup.html` & `popup.js`
-   `options.html` & `options.js`
-   `suspended.html` & `suspended.js`

### Required Icons:

-   `icons/icon16.png`
-   `icons/icon32.png`
-   `icons/icon48.png`
-   `icons/icon128.png`

### Validation Checks:

-   ✅ JSON syntax validation
-   ✅ JavaScript syntax validation
-   ✅ File existence checks
-   ✅ Version format validation (semver)
-   ✅ Build creation test

## 🎯 Benefits

1. **Automated Releases**: No need to manually create tags or releases
2. **Quality Assurance**: Automatic validation prevents broken deployments
3. **Version Control**: Tags are automatically created from manifest version
4. **Consistent Process**: Same validation for PRs and master branch
5. **Transparency**: Clear logs and summaries for each step
6. **Error Prevention**: Catches issues before they reach production

## 🚨 Important Notes

-   **Version bumps are required** for new releases
-   Tags are only created if they don't already exist
-   All validations must pass before tag creation
-   The system respects semantic versioning from `manifest.json`
-   Documentation changes don't trigger the pipeline

This automated system ensures that every push to master goes through proper validation and creates consistent releases when the version is updated.
