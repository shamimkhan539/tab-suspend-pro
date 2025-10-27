# Backup current project before migration

param(
    [string]$BackupName = "backup-$(Get-Date -Format 'yyyy-MM-dd-HHmmss')"
)

Write-Host "💾 Creating project backup..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location
$backupPath = Join-Path $projectRoot.Path $BackupName

try {
    # Create backup directory
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    
    Write-Host "📁 Backup location: $backupPath" -ForegroundColor Yellow
    Write-Host ""
    
    # Copy all files except node_modules, .git, and previous backups
    Write-Host "📋 Copying files..." -ForegroundColor White
    
    Get-ChildItem -Path $projectRoot.Path -Exclude "backup-*","node_modules",".git" | 
        Copy-Item -Destination $backupPath -Recurse -Force
    
    Write-Host "✅ Backup created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To restore from backup:" -ForegroundColor Yellow
    Write-Host "  1. Delete current files" -ForegroundColor White
    Write-Host "  2. Copy contents from $BackupName back to root" -ForegroundColor White
    Write-Host ""
    
    return $backupPath
    
} catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
    exit 1
}
