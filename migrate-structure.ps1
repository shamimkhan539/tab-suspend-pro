# Tab Suspend Pro - Structure Migration Script
# Run this from the project root directory

Write-Host "🚀 Starting Tab Suspend Pro restructuring..." -ForegroundColor Cyan
Write-Host ""

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
    Write-Host "  ✓ Moved session-manager.js" -ForegroundColor Gray
}
if (Test-Path "session-manager-enhanced.js") {
    Move-Item -Path "session-manager-enhanced.js" -Destination "src/modules/session-manager/session-storage.js" -Force
    Write-Host "  ✓ Moved session-manager-enhanced.js" -ForegroundColor Gray
}

# Tracker Blocker
if (Test-Path "modules/tracker-blocker.js") {
    Move-Item -Path "modules/tracker-blocker.js" -Destination "src/modules/tracker-blocker/tracker-blocker.js" -Force
    Write-Host "  ✓ Moved tracker-blocker.js" -ForegroundColor Gray
}

# Analytics
if (Test-Path "modules/performance-analytics.js") {
    Move-Item -Path "modules/performance-analytics.js" -Destination "src/modules/analytics/performance-analytics.js" -Force
    Write-Host "  ✓ Moved performance-analytics.js" -ForegroundColor Gray
}
if (Test-Path "modules/activity-analytics.js") {
    Move-Item -Path "modules/activity-analytics.js" -Destination "src/modules/analytics/activity-analytics.js" -Force
    Write-Host "  ✓ Moved activity-analytics.js" -ForegroundColor Gray
}

# Privacy
if (Test-Path "modules/privacy-manager.js") {
    Move-Item -Path "modules/privacy-manager.js" -Destination "src/modules/privacy/privacy-manager.js" -Force
    Write-Host "  ✓ Moved privacy-manager.js" -ForegroundColor Gray
}

# Cloud Sync
if (Test-Path "modules/cloud-backup.js") {
    Move-Item -Path "modules/cloud-backup.js" -Destination "src/modules/cloud-sync/cloud-backup.js" -Force
    Write-Host "  ✓ Moved cloud-backup.js" -ForegroundColor Gray
}

# Smart Organizer
if (Test-Path "modules/smart-organizer.js") {
    Move-Item -Path "modules/smart-organizer.js" -Destination "src/modules/smart-organizer/smart-organizer.js" -Force
    Write-Host "  ✓ Moved smart-organizer.js" -ForegroundColor Gray
}

Write-Host "✅ Modules moved" -ForegroundColor Green

# Move UI files
Write-Host "🎨 Moving UI files..." -ForegroundColor Yellow

# Popup
if (Test-Path "popup.html") { 
    Move-Item -Path "popup.html" -Destination "ui/popup/popup.html" -Force
    Write-Host "  ✓ Moved popup.html" -ForegroundColor Gray
}
if (Test-Path "popup.js") { 
    Move-Item -Path "popup.js" -Destination "ui/popup/popup.js" -Force
    Write-Host "  ✓ Moved popup.js" -ForegroundColor Gray
}

# Options
if (Test-Path "options.html") { 
    Move-Item -Path "options.html" -Destination "ui/options/options.html" -Force
    Write-Host "  ✓ Moved options.html" -ForegroundColor Gray
}
if (Test-Path "options.js") { 
    Move-Item -Path "options.js" -Destination "ui/options/options.js" -Force
    Write-Host "  ✓ Moved options.js" -ForegroundColor Gray
}
if (Test-Path "advanced-options.html") { 
    Move-Item -Path "advanced-options.html" -Destination "ui/options/sections/advanced-options.html" -Force
    Write-Host "  ✓ Moved advanced-options.html" -ForegroundColor Gray
}
if (Test-Path "advanced-settings.js") { 
    Move-Item -Path "advanced-settings.js" -Destination "ui/options/sections/advanced-settings.js" -Force
    Write-Host "  ✓ Moved advanced-settings.js" -ForegroundColor Gray
}

# Dashboards
if (Test-Path "dashboard.html") { 
    Move-Item -Path "dashboard.html" -Destination "ui/dashboards/main/dashboard.html" -Force
    Write-Host "  ✓ Moved dashboard.html" -ForegroundColor Gray
}
if (Test-Path "dashboard.js") { 
    Move-Item -Path "dashboard.js" -Destination "ui/dashboards/main/dashboard.js" -Force
    Write-Host "  ✓ Moved dashboard.js" -ForegroundColor Gray
}
if (Test-Path "main-dashboard.html") { 
    Move-Item -Path "main-dashboard.html" -Destination "ui/dashboards/main/main-dashboard.html" -Force
    Write-Host "  ✓ Moved main-dashboard.html" -ForegroundColor Gray
}
if (Test-Path "main-dashboard.js") { 
    Move-Item -Path "main-dashboard.js" -Destination "ui/dashboards/main/main-dashboard.js" -Force
    Write-Host "  ✓ Moved main-dashboard.js" -ForegroundColor Gray
}

if (Test-Path "analytics-dashboard.html") { 
    Move-Item -Path "analytics-dashboard.html" -Destination "ui/dashboards/analytics/analytics-dashboard.html" -Force
    Write-Host "  ✓ Moved analytics-dashboard.html" -ForegroundColor Gray
}
if (Test-Path "analytics-dashboard.js") { 
    Move-Item -Path "analytics-dashboard.js" -Destination "ui/dashboards/analytics/analytics-dashboard.js" -Force
    Write-Host "  ✓ Moved analytics-dashboard.js" -ForegroundColor Gray
}

if (Test-Path "privacy-dashboard.html") { 
    Move-Item -Path "privacy-dashboard.html" -Destination "ui/dashboards/privacy/privacy-dashboard.html" -Force
    Write-Host "  ✓ Moved privacy-dashboard.html" -ForegroundColor Gray
}
if (Test-Path "privacy-dashboard.js") { 
    Move-Item -Path "privacy-dashboard.js" -Destination "ui/dashboards/privacy/privacy-dashboard.js" -Force
    Write-Host "  ✓ Moved privacy-dashboard.js" -ForegroundColor Gray
}

if (Test-Path "tracker-dashboard.html") { 
    Move-Item -Path "tracker-dashboard.html" -Destination "ui/dashboards/tracker-blocker/tracker-dashboard.html" -Force
    Write-Host "  ✓ Moved tracker-dashboard.html" -ForegroundColor Gray
}
if (Test-Path "tracker-dashboard.js") { 
    Move-Item -Path "tracker-dashboard.js" -Destination "ui/dashboards/tracker-blocker/tracker-dashboard.js" -Force
    Write-Host "  ✓ Moved tracker-dashboard.js" -ForegroundColor Gray
}

# Suspended page
if (Test-Path "suspended.html") { 
    Move-Item -Path "suspended.html" -Destination "ui/suspended/suspended.html" -Force
    Write-Host "  ✓ Moved suspended.html" -ForegroundColor Gray
}
if (Test-Path "suspended.js") { 
    Move-Item -Path "suspended.js" -Destination "ui/suspended/suspended.js" -Force
    Write-Host "  ✓ Moved suspended.js" -ForegroundColor Gray
}

Write-Host "✅ UI files moved" -ForegroundColor Green

# Move content script
Write-Host "📄 Moving content scripts..." -ForegroundColor Yellow
if (Test-Path "content.js") { 
    Move-Item -Path "content.js" -Destination "src/content/content.js" -Force
    Write-Host "  ✓ Moved content.js" -ForegroundColor Gray
}

# Move icons
Write-Host "🎨 Moving assets..." -ForegroundColor Yellow
if (Test-Path "icons") {
    Get-ChildItem -Path "icons" | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "ui/assets/icons/" -Force
    }
    Remove-Item -Path "icons" -Recurse -Force
    Write-Host "  ✓ Moved all icons" -ForegroundColor Gray
}

# Move documentation
Write-Host "📚 Moving documentation..." -ForegroundColor Yellow
if (Test-Path "TRACKER_BLOCKER_README.md") { 
    Move-Item -Path "TRACKER_BLOCKER_README.md" -Destination "docs/guides/tracker-blocker.md" -Force
    Write-Host "  ✓ Moved TRACKER_BLOCKER_README.md" -ForegroundColor Gray
}
if (Test-Path "TRACKER_BLOCKER_QUICKSTART.md") { 
    Move-Item -Path "TRACKER_BLOCKER_QUICKSTART.md" -Destination "docs/guides/tracker-blocker-quickstart.md" -Force
    Write-Host "  ✓ Moved TRACKER_BLOCKER_QUICKSTART.md" -ForegroundColor Gray
}
if (Test-Path "TRACKER_BLOCKER_COMPARISON.md") { 
    Move-Item -Path "TRACKER_BLOCKER_COMPARISON.md" -Destination "docs/guides/tracker-blocker-comparison.md" -Force
    Write-Host "  ✓ Moved TRACKER_BLOCKER_COMPARISON.md" -ForegroundColor Gray
}
if (Test-Path "IMPLEMENTATION_SUMMARY.md") { 
    Move-Item -Path "IMPLEMENTATION_SUMMARY.md" -Destination "docs/development/implementation-summary.md" -Force
    Write-Host "  ✓ Moved IMPLEMENTATION_SUMMARY.md" -ForegroundColor Gray
}
if (Test-Path "RESTRUCTURING_PLAN.md") { 
    Move-Item -Path "RESTRUCTURING_PLAN.md" -Destination "docs/development/restructuring-plan.md" -Force
    Write-Host "  ✓ Moved RESTRUCTURING_PLAN.md" -ForegroundColor Gray
}
if (Test-Path "MIGRATION_GUIDE.md") { 
    Move-Item -Path "MIGRATION_GUIDE.md" -Destination "docs/development/migration-guide.md" -Force
    Write-Host "  ✓ Moved MIGRATION_GUIDE.md" -ForegroundColor Gray
}

# Move test files
Write-Host "🧪 Moving test files..." -ForegroundColor Yellow
if (Test-Path "test.js") { 
    Move-Item -Path "test.js" -Destination "tests/unit/test.js" -Force
    Write-Host "  ✓ Moved test.js" -ForegroundColor Gray
}
if (Test-Path "test-suite.js") { 
    Move-Item -Path "test-suite.js" -Destination "tests/integration/test-suite.js" -Force
    Write-Host "  ✓ Moved test-suite.js" -ForegroundColor Gray
}
if (Test-Path "dashboard-test.js") { 
    Move-Item -Path "dashboard-test.js" -Destination "tests/integration/dashboard-test.js" -Force
    Write-Host "  ✓ Moved dashboard-test.js" -ForegroundColor Gray
}

# Move scripts
Write-Host "⚙️ Moving scripts..." -ForegroundColor Yellow
if (Test-Path "update-changelog.js") { 
    Move-Item -Path "update-changelog.js" -Destination "scripts/update-changelog.js" -Force
    Write-Host "  ✓ Moved update-changelog.js" -ForegroundColor Gray
}

# Clean up old modules directory if empty
if (Test-Path "modules") {
    $itemCount = (Get-ChildItem -Path "modules" | Measure-Object).Count
    if ($itemCount -eq 0) {
        Remove-Item -Path "modules" -Recurse -Force
        Write-Host "🗑️ Removed empty modules directory" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Warning: modules directory not empty, keeping it" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ Migration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ IMPORTANT: Next steps required!" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 📝 Update manifest.json paths" -ForegroundColor Cyan
Write-Host "   Run: .\update-manifest.ps1" -ForegroundColor White
Write-Host ""
Write-Host "2. 🔧 Update background.js imports" -ForegroundColor Cyan
Write-Host "   Run: .\update-background.ps1" -ForegroundColor White
Write-Host ""
Write-Host "3. 🧪 Test the extension" -ForegroundColor Cyan
Write-Host "   - Go to chrome://extensions/" -ForegroundColor White
Write-Host "   - Remove and reload the extension" -ForegroundColor White
Write-Host "   - Test all features" -ForegroundColor White
Write-Host ""
Write-Host "📋 Migration Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Modules organized in src/modules/" -ForegroundColor White
Write-Host "  ✓ UI files organized in ui/" -ForegroundColor White
Write-Host "  ✓ Documentation in docs/" -ForegroundColor White
Write-Host "  ✓ Tests in tests/" -ForegroundColor White
Write-Host "  ✓ Scripts in scripts/" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your project is now properly structured!" -ForegroundColor Green
