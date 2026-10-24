# commit-and-push.ps1
# Uso: .\commit-and-push.ps1 "mensagem do commit"
param(
  [string]$Message = "auto-save: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)
Set-Location $PSScriptRoot
git add -A
git commit -m $Message
if ($LASTEXITCODE -ne 0) { Write-Host "Nada para commitar ou erro no commit." }
git push origin master
git push origin --tags
