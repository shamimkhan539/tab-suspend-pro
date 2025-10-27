# Master migration script - Orchestrates the complete restructuring process

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                        ║" -ForegroundColor Cyan
Write-Host "║    Tab Suspend Pro - Automated Migration v1.0         ║" -ForegroundColor Cyan
Write-Host "║                                                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Confirmation
Write-Host "⚠️  This will restructure your entire project!" -ForegroundColor Yellow
Write-Host ""
Write-Host "The migration will:" -ForegroundColor White
Write-Host "  ✓ Create backup of current state" -ForegroundColor Gray
Write-Host "  ✓ Reorganize files into modular structure" -ForegroundColor Gray
Write-Host "  ✓ Update all import paths automatically" -ForegroundColor Gray
Write-Host "  ✓ Verify the new structure" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "Continue with migration? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Step 2: Create Backup
Write-Host "📦 STEP 1/4: Creating Backup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

.\backup-project.ps1
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "❌ Backup failed! Migration aborted." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Step 3: Migrate Structure
Write-Host "📁 STEP 2/4: Migrating File Structure" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

.\migrate-structure.ps1
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "❌ Migration failed! Please restore from backup." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Step 4: Update Paths
Write-Host "🔧 STEP 3/4: Updating Import Paths" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Updating manifest.json..." -ForegroundColor White
.\update-manifest.ps1
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "⚠️ manifest.json update had issues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Updating background.js..." -ForegroundColor White
.\update-background.ps1
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "⚠️ background.js update had issues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Step 5: Verification
Write-Host "✅ STEP 4/4: Verification" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$errors = @()

# Check critical files exist
$criticalFiles = @(
    "manifest.json",
    "background.js",
    "src/modules/tracker-blocker/tracker-blocker.js",
    "src/modules/session-manager/session-manager.js",
    "ui/popup/popup.html",
    "ui/popup/popup.js"
)

Write-Host "Checking critical files..." -ForegroundColor White
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (missing!)" -ForegroundColor Red
        $errors += "Missing file: $file"
    }
}

Write-Host ""

# Check directory structure
$requiredDirs = @(
    "src/modules",
    "src/core",
    "src/content",
    "ui/popup",
    "ui/options",
    "ui/dashboards",
    "ui/assets"
)

Write-Host "Checking directory structure..." -ForegroundColor White
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir -PathType Container) {
        Write-Host "  ✓ $dir/" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $dir/ (missing!)" -ForegroundColor Red
        $errors += "Missing directory: $dir"
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Final Status
if ($errors.Count -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                        ║" -ForegroundColor Green
    Write-Host "║          🎉 MIGRATION COMPLETED SUCCESSFULLY! 🎉       ║" -ForegroundColor Green
    Write-Host "║                                                        ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Load the extension in Chrome (chrome://extensions/)" -ForegroundColor White
    Write-Host "  2. Click 'Load unpacked' and select this folder" -ForegroundColor White
    Write-Host "  3. Test all features to ensure everything works" -ForegroundColor White
    Write-Host "  4. Check browser console for any errors" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 New project structure:" -ForegroundColor Yellow
    Write-Host "   src/        - All source code" -ForegroundColor Gray
    Write-Host "   ui/         - All UI components" -ForegroundColor Gray
    Write-Host "   docs/       - Documentation" -ForegroundColor Gray
    Write-Host "   tests/      - Test files" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║                                                        ║" -ForegroundColor Red
    Write-Host "║        ⚠️  MIGRATION COMPLETED WITH ERRORS ⚠️          ║" -ForegroundColor Red
    Write-Host "║                                                        ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Errors found:" -ForegroundColor Yellow
    foreach ($error in $errors) {
        Write-Host "  ✗ $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please review the errors above and fix manually," -ForegroundColor Yellow
    Write-Host "or restore from backup if needed." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Backup location: Look for 'backup-YYYY-MM-DD-*' folder" -ForegroundColor Cyan
Write-Host ""
