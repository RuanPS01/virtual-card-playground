# Definir nomes dos arquivos de saída
$TSX_OUTPUT = "tsx_files_of_project.txt"
$TS_OUTPUT = "ts_files_of_project.txt"
$JSON_OUTPUT = "json_files_of_project.txt"
$CSS_OUTPUT = "css_files_of_project.txt"

# Remover arquivos de saída se existirem
Remove-Item -Path $TSX_OUTPUT, $TS_OUTPUT, $JSON_OUTPUT, $CSS_OUTPUT -ErrorAction SilentlyContinue

# Buscar arquivos e concatenar conteúdo, ignorando node_modules/
Get-ChildItem -Path . -Recurse -Filter "*.tsx" | Where-Object { $_.FullName -notmatch "node_modules" } | Get-Content | Out-File -FilePath $TSX_OUTPUT -Encoding utf8
Get-ChildItem -Path . -Recurse -Filter "*.ts" | Where-Object { $_.FullName -notmatch "node_modules" -and $_.Name -notmatch "\.d\.ts$" } | Get-Content | Out-File -FilePath $TS_OUTPUT -Encoding utf8
Get-ChildItem -Path . -Recurse -Filter "*.css" | Where-Object { $_.FullName -notmatch "node_modules" } | Get-Content | Out-File -FilePath $CSS_OUTPUT -Encoding utf8
Get-ChildItem -Path . -Filter "*.json" | Where-Object { $_.Name -notmatch "lock\.json$" } | Get-Content | Out-File -FilePath $JSON_OUTPUT -Encoding utf8

Write-Host "Exportação concluída!"
