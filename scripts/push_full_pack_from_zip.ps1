param(
  [string]$ZipPath = "BI_CENTRAL_GITHUB_READY_REPO_2026-07-03.zip"
)

if (-not (Test-Path $ZipPath)) {
  Write-Error "Zip introuvable : $ZipPath"
  exit 1
}

$tmp = Join-Path $env:TEMP ("bi-central-pack-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $tmp -Force
$src = Join-Path $tmp "bi-central-github-ready"

Copy-Item -Path (Join-Path $src "*") -Destination . -Recurse -Force
Copy-Item -Path (Join-Path $src ".github") -Destination . -Recurse -Force
Copy-Item -Path (Join-Path $src ".gitignore") -Destination . -Force

git add .
git commit -m "Remplace les placeholders par les BI HTML complets"
git push origin main

Write-Host "Pack complet poussé vers GitHub." -ForegroundColor Green
