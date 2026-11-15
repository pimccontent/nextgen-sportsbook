# Regenerates the "production deploy" folder from the repo (excludes node_modules, vendor, .git).
# Run:  powershell -File scripts\pack-production-deploy.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dest = Join-Path $root "production deploy"
$templates = Join-Path $root "infrastructure\production-deploy"

$envBackup = $null
$keepEnv = Join-Path $dest ".env"
if (Test-Path $keepEnv) { $envBackup = Get-Content $keepEnv -Raw }

if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
New-Item -ItemType Directory -Path $dest | Out-Null

$excludeDirs = @(
  "node_modules", ".next", "vendor", ".git", ".cursor", "production deploy",
  "coverage", ".turbo", "dist", "production-deploy"
)

function Copy-Tree([string]$src, [string]$dst) {
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  Get-ChildItem -LiteralPath $src -Force | ForEach-Object {
    if ($excludeDirs -contains $_.Name) { return }
    if ($_.PSIsContainer) {
      Copy-Tree $_.FullName (Join-Path $dst $_.Name)
    } else {
      if ($_.Name -match '^\.env(\.|$)' -and $_.Name -ne ".env.example") { return }
      if ($_.Name -match '\.(log|tmp)$') { return }
      Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dst $_.Name) -Force
    }
  }
}

@(
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "turbo.json",
  "tsconfig.base.json", ".gitignore", "AGENTS.md"
) | ForEach-Object {
  $p = Join-Path $root $_
  if (Test-Path $p) { Copy-Item $p (Join-Path $dest $_) -Force }
}

Copy-Tree (Join-Path $root "apps") (Join-Path $dest "apps")
Copy-Tree (Join-Path $root "packages") (Join-Path $dest "packages")
Copy-Tree (Join-Path $root "infrastructure") (Join-Path $dest "infrastructure")

New-Item -ItemType Directory -Force -Path (Join-Path $dest "docs") | Out-Null
$demo = Join-Path $root "docs\architecture\DEMO_ACCOUNTS.md"
if (Test-Path $demo) { Copy-Item $demo (Join-Path $dest "docs\DEMO_ACCOUNTS.md") -Force }
$golive = Join-Path $root "docs\architecture\GO_LIVE.md"
if (Test-Path $golive) { Copy-Item $golive (Join-Path $dest "docs\GO_LIVE.md") -Force }

Copy-Item (Join-Path $templates "install.sh") (Join-Path $dest "install.sh") -Force
Copy-Item (Join-Path $templates "README.md") (Join-Path $dest "README.md") -Force
Copy-Item (Join-Path $templates "env.example") (Join-Path $dest ".env.example") -Force

if ($null -ne $envBackup) {
  Set-Content -Path (Join-Path $dest ".env") -Value $envBackup -NoNewline
}

$zip = Join-Path $root "production-deploy.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $dest -DestinationPath $zip -CompressionLevel Optimal

$stats = Get-ChildItem $dest -Recurse -File | Measure-Object -Property Length -Sum
$zipMb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host "Packed: $($stats.Count) files, $([math]::Round($stats.Sum/1MB,1)) MB -> $dest"
Write-Host "Zip: $zip ($zipMb MB)"
Write-Host "Upload the folder or zip to your VPS (no GitHub needed), then: bash install.sh"
