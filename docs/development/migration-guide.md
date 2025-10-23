# Migration Script for BrowserGuard Pro Restructuring

## Automated Migration

This script will automatically reorganize your extension into the new structure.

**⚠️ IMPORTANT: Backup your project before running this script!**

### Prerequisites

```powershell
# Create a backup
Copy-Item -Path "d:\test\extension\tab-suspend-pro" -Destination "d:\test\extension\tab-suspend-pro-backup" -Recurse
```

### Migration Script (PowerShell)

Save this as `migrate-structure.ps1`:

```powershell
# BrowserGuard Pro - Structure Migration Script
# Run this from the project root directory

Write-Host "🚀 Starting BrowserGuard Pro restructuring..." -ForegroundColor Cyan

# Create new directory structure
Write-Host "📁 Creating directory structure..." -ForegroundColor Yellow

$directories = @(
    "src/core",
    "src/modules/session-manager",
    "src/modules/tracker-blocker",
    "src/modules/analytics",
    "src/modules/privacy",
    "src/modules/cloud-sync/providers",
    "src/modules/smart-organizer",
    "src/utils",
    "src/config",
    "src/content",
    "ui/popup/components",
    "ui/options/sections",
    "ui/dashboards/main",
    "ui/dashboards/analytics",
    "ui/dashboards/privacy",
    "ui/dashboards/tracker-blocker",
    "ui/suspended",
    "ui/shared/components",
    "ui/shared/styles",
    "ui/assets/icons",
    "ui/assets/images",
    "tests/unit",
    "tests/integration",
    "tests/e2e",
    "docs/api",
    "docs/guides",
    "docs/development",
    "scripts"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "✅ Directory structure created" -ForegroundColor Green

# Move modules
Write-Host "📦 Moving module files..." -ForegroundColor Yellow

# Session Manager
if (Test-Path "modules/session-manager.js") {
    Move-Item -Path "modules/session-manager.js" -Destination "src/modules/session-manager/session-manager.js" -Force
}
if (Test-Path "session-manager-enhanced.js") {
    Move-Item -Path "session-manager-enhanced.js" -Destination "src/modules/session-manager/session-storage.js" -Force
}

# Tracker Blocker
if (Test-Path "modules/tracker-blocker.js") {
    Move-Item -Path "modules/tracker-blocker.js" -Destination "src/modules/tracker-blocker/tracker-blocker.js" -Force
}

# Analytics
if (Test-Path "modules/performance-analytics.js") {
    Move-Item -Path "modules/performance-analytics.js" -Destination "src/modules/analytics/performance-analytics.js" -Force
}
if (Test-Path "modules/activity-analytics.js") {
    Move-Item -Path "modules/activity-analytics.js" -Destination "src/modules/analytics/activity-analytics.js" -Force
}

# Privacy
if (Test-Path "modules/privacy-manager.js") {
    Move-Item -Path "modules/privacy-manager.js" -Destination "src/modules/privacy/privacy-manager.js" -Force
}

# Cloud Sync
if (Test-Path "modules/cloud-backup.js") {
    Move-Item -Path "modules/cloud-backup.js" -Destination "src/modules/cloud-sync/cloud-backup.js" -Force
}

# Smart Organizer
if (Test-Path "modules/smart-organizer.js") {
    Move-Item -Path "modules/smart-organizer.js" -Destination "src/modules/smart-organizer/smart-organizer.js" -Force
}

Write-Host "✅ Modules moved" -ForegroundColor Green

# Move UI files
Write-Host "🎨 Moving UI files..." -ForegroundColor Yellow

# Popup
if (Test-Path "popup.html") { Move-Item -Path "popup.html" -Destination "ui/popup/popup.html" -Force }
if (Test-Path "popup.js") { Move-Item -Path "popup.js" -Destination "ui/popup/popup.js" -Force }

# Options
if (Test-Path "options.html") { Move-Item -Path "options.html" -Destination "ui/options/options.html" -Force }
if (Test-Path "options.js") { Move-Item -Path "options.js" -Destination "ui/options/options.js" -Force }
if (Test-Path "advanced-options.html") { Move-Item -Path "advanced-options.html" -Destination "ui/options/sections/advanced-options.html" -Force }
if (Test-Path "advanced-settings.js") { Move-Item -Path "advanced-settings.js" -Destination "ui/options/sections/advanced-settings.js" -Force }

# Dashboards
if (Test-Path "dashboard.html") { Move-Item -Path "dashboard.html" -Destination "ui/dashboards/main/dashboard.html" -Force }
if (Test-Path "dashboard.js") { Move-Item -Path "dashboard.js" -Destination "ui/dashboards/main/dashboard.js" -Force }
if (Test-Path "main-dashboard.html") { Move-Item -Path "main-dashboard.html" -Destination "ui/dashboards/main/main-dashboard.html" -Force }
if (Test-Path "main-dashboard.js") { Move-Item -Path "main-dashboard.js" -Destination "ui/dashboards/main/main-dashboard.js" -Force }

if (Test-Path "analytics-dashboard.html") { Move-Item -Path "analytics-dashboard.html" -Destination "ui/dashboards/analytics/analytics-dashboard.html" -Force }
if (Test-Path "analytics-dashboard.js") { Move-Item -Path "analytics-dashboard.js" -Destination "ui/dashboards/analytics/analytics-dashboard.js" -Force }

if (Test-Path "privacy-dashboard.html") { Move-Item -Path "privacy-dashboard.html" -Destination "ui/dashboards/privacy/privacy-dashboard.html" -Force }
if (Test-Path "privacy-dashboard.js") { Move-Item -Path "privacy-dashboard.js" -Destination "ui/dashboards/privacy/privacy-dashboard.js" -Force }

if (Test-Path "tracker-dashboard.html") { Move-Item -Path "tracker-dashboard.html" -Destination "ui/dashboards/tracker-blocker/tracker-dashboard.html" -Force }
if (Test-Path "tracker-dashboard.js") { Move-Item -Path "tracker-dashboard.js" -Destination "ui/dashboards/tracker-blocker/tracker-dashboard.js" -Force }

# Suspended page
if (Test-Path "suspended.html") { Move-Item -Path "suspended.html" -Destination "ui/suspended/suspended.html" -Force }
if (Test-Path "suspended.js") { Move-Item -Path "suspended.js" -Destination "ui/suspended/suspended.js" -Force }

Write-Host "✅ UI files moved" -ForegroundColor Green

# Move content script
Write-Host "📄 Moving content scripts..." -ForegroundColor Yellow
if (Test-Path "content.js") { Move-Item -Path "content.js" -Destination "src/content/content.js" -Force }

# Move icons
Write-Host "🎨 Moving assets..." -ForegroundColor Yellow
if (Test-Path "icons") {
    Get-ChildItem -Path "icons" | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "ui/assets/icons/" -Force
    }
    Remove-Item -Path "icons" -Recurse -Force
}

# Move documentation
Write-Host "📚 Moving documentation..." -ForegroundColor Yellow
if (Test-Path "TRACKER_BLOCKER_README.md") { Move-Item -Path "TRACKER_BLOCKER_README.md" -Destination "docs/guides/tracker-blocker.md" -Force }
if (Test-Path "TRACKER_BLOCKER_QUICKSTART.md") { Move-Item -Path "TRACKER_BLOCKER_QUICKSTART.md" -Destination "docs/guides/tracker-blocker-quickstart.md" -Force }
if (Test-Path "TRACKER_BLOCKER_COMPARISON.md") { Move-Item -Path "TRACKER_BLOCKER_COMPARISON.md" -Destination "docs/guides/tracker-blocker-comparison.md" -Force }
if (Test-Path "IMPLEMENTATION_SUMMARY.md") { Move-Item -Path "IMPLEMENTATION_SUMMARY.md" -Destination "docs/development/implementation-summary.md" -Force }

# Move test files
Write-Host "🧪 Moving test files..." -ForegroundColor Yellow
if (Test-Path "test.js") { Move-Item -Path "test.js" -Destination "tests/unit/test.js" -Force }
if (Test-Path "test-suite.js") { Move-Item -Path "test-suite.js" -Destination "tests/integration/test-suite.js" -Force }
if (Test-Path "dashboard-test.js") { Move-Item -Path "dashboard-test.js" -Destination "tests/integration/dashboard-test.js" -Force }

# Move scripts
Write-Host "⚙️ Moving scripts..." -ForegroundColor Yellow
if (Test-Path "update-changelog.js") { Move-Item -Path "update-changelog.js" -Destination "scripts/update-changelog.js" -Force }

# Clean up old modules directory if empty
if (Test-Path "modules") {
    $itemCount = (Get-ChildItem -Path "modules" | Measure-Object).Count
    if ($itemCount -eq 0) {
        Remove-Item -Path "modules" -Recurse -Force
        Write-Host "🗑️ Removed empty modules directory" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✨ Migration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ Next steps:" -ForegroundColor Yellow
Write-Host "1. Update manifest.json paths" -ForegroundColor White
Write-Host "2. Update importScripts() in background.js" -ForegroundColor White
Write-Host "3. Test the extension thoroughly" -ForegroundColor White
Write-Host "4. Update documentation links" -ForegroundColor White
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  - Modules organized in src/modules/" -ForegroundColor White
Write-Host "  - UI files organized in ui/" -ForegroundColor White
Write-Host "  - Documentation in docs/" -ForegroundColor White
Write-Host "  - Tests in tests/" -ForegroundColor White
Write-Host "  - Scripts in scripts/" -ForegroundColor White
```

### After Migration Checklist

1. **Update manifest.json paths:**

```json
{
    "background": {
        "service_worker": "background.js"
    },
    "content_scripts": [
        {
            "matches": ["http://*/*", "https://*/*"],
            "js": ["src/content/content.js"],
            "run_at": "document_start"
        }
    ],
    "action": {
        "default_popup": "ui/popup/popup.html"
    },
    "options_page": "ui/options/options.html"
}
```

2. **Update background.js imports:**

```javascript
importScripts(
    "src/modules/session-manager/session-manager.js",
    "src/modules/smart-organizer/smart-organizer.js",
    "src/modules/analytics/performance-analytics.js",
    "src/modules/analytics/activity-analytics.js",
    "src/modules/privacy/privacy-manager.js",
    "src/modules/cloud-sync/cloud-backup.js",
    "src/modules/tracker-blocker/tracker-blocker.js"
);
```

3. **Update HTML file paths:**

For popup.html, options.html, etc., update script src paths:

```html
<!-- Old -->
<script src="popup.js"></script>

<!-- New -->
<script src="popup.js"></script>
<!-- Already in same directory -->
```

For dashboards, update relative paths:

```html
<!-- Old -->
<script src="dashboard.js"></script>

<!-- New -->
<script src="dashboard.js"></script>
<!-- Already in same directory -->
```

4. **Create index files for modules:**

Create `src/modules/index.js`:

```javascript
export { SessionManager } from "./session-manager/session-manager.js";
export { TrackerBlocker } from "./tracker-blocker/tracker-blocker.js";
export { PerformanceAnalytics } from "./analytics/performance-analytics.js";
// ... etc
```

### Testing After Migration

```powershell
# Test the extension
1. Go to chrome://extensions/
2. Remove old extension
3. Load unpacked from new structure
4. Test each feature:
   - Tab suspension
   - Tracker blocking
   - Dashboards
   - Settings
   - Session management
```

### Rollback (if needed)

```powershell
# If something goes wrong, restore from backup
Remove-Item -Path "d:\test\extension\tab-suspend-pro" -Recurse -Force
Copy-Item -Path "d:\test\extension\tab-suspend-pro-backup" -Destination "d:\test\extension\tab-suspend-pro" -Recurse
```

## Running the Migration

```powershell
# 1. Navigate to project directory
cd "d:\test\extension\tab-suspend-pro"

# 2. Create backup
Copy-Item -Path . -Destination ../tab-suspend-pro-backup -Recurse

# 3. Run migration script
.\migrate-structure.ps1

# 4. Update manifest and background.js
# (Manual step - use the examples above)

# 5. Test the extension
# Load unpacked and verify all features work
```

## Post-Migration Tasks

1. ✅ Verify all files moved correctly
2. ✅ Update all file paths in manifest.json
3. ✅ Update importScripts in background.js
4. ✅ Test extension loading
5. ✅ Test all features
6. ✅ Update README with new structure
7. ✅ Commit changes to git
8. ✅ Update CI/CD if applicable

## Need Help?

If you encounter issues during migration:

1. Check the console for path errors
2. Verify manifest.json paths
3. Restore from backup if needed
4. Contact support or create an issue
