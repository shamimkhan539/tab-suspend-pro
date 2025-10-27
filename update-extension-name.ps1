# Update extension name across all files

param(
    [string]$OldName = "Tab Suspend Pro",
    [string]$NewName = "BrowserGuard Pro"
)

Write-Host "🔄 Updating extension name from '$OldName' to '$NewName'..." -ForegroundColor Cyan
Write-Host ""

# Files to update (HTML, JS, MD files)
$filesToUpdate = @(
    "ui/options/options.html",
    "ui/options/advanced-options.html",
    "ui/dashboards/main/dashboard.html",
    "ui/dashboards/main/main-dashboard.html",
    "ui/dashboards/analytics/analytics-dashboard.html",
    "ui/dashboards/privacy/privacy-dashboard.html",
    "ui/dashboards/tracker-blocker/tracker-dashboard.html",
    "readme.md",
    "PROJECT_STRUCTURE.md"
)

$updatedCount = 0

foreach ($file in $filesToUpdate) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding UTF8

        if ($content -match [regex]::Escape($OldName)) {
            $newContent = $content -replace [regex]::Escape($OldName), $NewName
            $newContent | Set-Content $file -Encoding UTF8 -NoNewline

            Write-Host "✅ Updated: $file" -ForegroundColor Green
            $updatedCount++
        }
    } else {
        Write-Host "⚠️ File not found: $file" -ForegroundColor Yellow
    }
}

# Also update any JS files that might reference the name
$jsFiles = Get-ChildItem -Path "ui" -Filter "*.js" -Recurse
foreach ($jsFile in $jsFiles) {
    $content = Get-Content $jsFile.FullName -Raw -Encoding UTF8

    if ($content -match [regex]::Escape($OldName)) {
        $newContent = $content -replace [regex]::Escape($OldName), $NewName
        $newContent | Set-Content $jsFile.FullName -Encoding UTF8 -NoNewline

        Write-Host "✅ Updated: $($jsFile.FullName)" -ForegroundColor Green
        $updatedCount++
    }
}

Write-Host ""
Write-Host "🎉 Name update complete!" -ForegroundColor Green
Write-Host "Updated $updatedCount files" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Reload the extension in Chrome (chrome://extensions/)" -ForegroundColor White
Write-Host "2. Test that all pages load correctly" -ForegroundColor White
Write-Host "3. Check that the new name appears in the extension popup" -ForegroundColor White
