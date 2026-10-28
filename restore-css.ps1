# restore-css.ps1
# Restaura o styles.css a partir da ultima versao boa (styles.css.lastgood)
$css = "agenda-agora-main\src\styles.css"
$backup = "agenda-agora-main\src\styles.css.lastgood"
if (Test-Path $backup) {
    Copy-Item $backup $css -Force
    Write-Host "CSS restaurado de $backup"
} else {
    Write-Host "Nenhum backup encontrado ($backup)."
}
