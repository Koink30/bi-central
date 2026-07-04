# Remplacer USER et REPO avant usage
# Exemple : .\scripts\setup_git_remote.ps1 -RemoteUrl "https://github.com/USER/bi-central.git"
param([string]$RemoteUrl)
if (-not $RemoteUrl) { Write-Error "RemoteUrl obligatoire"; exit 1 }
git init
git add .
git commit -m "Initialisation BI Central"
git branch -M main
git remote add origin $RemoteUrl
git push -u origin main
