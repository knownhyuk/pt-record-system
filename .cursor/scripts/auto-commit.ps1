# AI Auto Commit Script
param(
    [string]$Type = "feat",
    [string]$Message = "AI auto changes",
    [string]$Files = ""
)

# Color output functions
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Check for changes
$changes = git status --porcelain
if ($changes.Count -eq 0) {
    Write-ColorOutput Yellow "No changes detected."
    exit 0
}

# Generate changed files list
if ($Files -eq "") {
    $Files = ($changes | ForEach-Object { $_.Substring(3) }) -join ", "
}

# Current timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Generate commit message
$commitMessage = @"
$Type`: $Message

- Changed time: $timestamp
- Changed files: $Files
- AI auto commit
"@

Write-ColorOutput Cyan "Committing changes..."
Write-ColorOutput Gray "Commit message:"
Write-ColorOutput White $commitMessage

# Execute commit
try {
    git add .
    $commitResult = git commit -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Commit successful!"
        Write-ColorOutput Green $commitResult
    } else {
        Write-ColorOutput Red "❌ Commit failed!"
        Write-ColorOutput Red $commitResult
    }
} catch {
    Write-ColorOutput Red "❌ Error occurred: $($_.Exception.Message)"
}

# Show recent commits
Write-ColorOutput Cyan "`nRecent commit history:"
git log --oneline -3