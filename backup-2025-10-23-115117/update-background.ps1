# Update background.js importScripts paths after migration

Write-Host "🔧 Updating background.js import paths..." -ForegroundColor Cyan

$backgroundPath = "background.js"

if (-not (Test-Path $backgroundPath)) {
    Write-Host "❌ Error: background.js not found!" -ForegroundColor Red
    exit 1
}

# Read background.js
$content = Get-Content $backgroundPath -Raw

# Define old and new import paths
$oldImports = @"
importScripts(
    "modules/session-manager.js",
    "modules/smart-organizer.js",
    "modules/performance-analytics.js",
    "modules/activity-analytics.js",
    "modules/privacy-manager.js",
    "modules/cloud-backup.js",
    "modules/tracker-blocker.js"
);
"@

$newImports = @"
importScripts(
    "src/modules/session-manager/session-manager.js",
    "src/modules/smart-organizer/smart-organizer.js",
    "src/modules/analytics/performance-analytics.js",
    "src/modules/analytics/activity-analytics.js",
    "src/modules/privacy/privacy-manager.js",
    "src/modules/cloud-sync/cloud-backup.js",
    "src/modules/tracker-blocker/tracker-blocker.js"
);
"@

# Replace imports
if ($content -match "importScripts") {
    $content = $content -replace [regex]::Escape($oldImports), $newImports
    
    # Save updated background.js
    $content | Set-Content $backgroundPath -NoNewline
    
    Write-Host "✅ background.js updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Updated import paths:" -ForegroundColor Yellow
    Write-Host "  - src/modules/session-manager/session-manager.js" -ForegroundColor White
    Write-Host "  - src/modules/smart-organizer/smart-organizer.js" -ForegroundColor White
    Write-Host "  - src/modules/analytics/performance-analytics.js" -ForegroundColor White
    Write-Host "  - src/modules/analytics/activity-analytics.js" -ForegroundColor White
    Write-Host "  - src/modules/privacy/privacy-manager.js" -ForegroundColor White
    Write-Host "  - src/modules/cloud-sync/cloud-backup.js" -ForegroundColor White
    Write-Host "  - src/modules/tracker-blocker/tracker-blocker.js" -ForegroundColor White
} else {
    Write-Host "⚠️ Warning: importScripts not found in background.js" -ForegroundColor Yellow
    Write-Host "You may need to update imports manually" -ForegroundColor Yellow
}
