# Update manifest.json paths after migration

Write-Host "🔧 Updating manifest.json paths..." -ForegroundColor Cyan

$manifestPath = "manifest.json"

if (-not (Test-Path $manifestPath)) {
    Write-Host "❌ Error: manifest.json not found!" -ForegroundColor Red
    exit 1
}

# Read manifest
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

# Update content_scripts paths
if ($manifest.content_scripts) {
    foreach ($script in $manifest.content_scripts) {
        if ($script.js -contains "content.js") {
            $script.js = @("src/content/content.js")
        }
    }
}

# Update action (popup) path
if ($manifest.action) {
    if ($manifest.action.default_popup -eq "popup.html") {
        $manifest.action.default_popup = "ui/popup/popup.html"
    }
}

# Update options_page path
if ($manifest.options_page -eq "options.html") {
    $manifest.options_page = "ui/options/options.html"
}

# Update icons paths (if they reference icons/ folder)
if ($manifest.icons) {
    $newIcons = @{}
    foreach ($key in $manifest.icons.PSObject.Properties.Name) {
        $value = $manifest.icons.$key
        if ($value -like "icons/*") {
            $newIcons[$key] = $value -replace "^icons/", "ui/assets/icons/"
        } else {
            $newIcons[$key] = $value
        }
    }
    $manifest.icons = $newIcons
}

# Save updated manifest
$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath

Write-Host "✅ manifest.json updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Updated paths:" -ForegroundColor Yellow
Write-Host "  - Content script: src/content/content.js" -ForegroundColor White
Write-Host "  - Popup: ui/popup/popup.html" -ForegroundColor White
Write-Host "  - Options: ui/options/options.html" -ForegroundColor White
Write-Host "  - Icons: ui/assets/icons/*" -ForegroundColor White
