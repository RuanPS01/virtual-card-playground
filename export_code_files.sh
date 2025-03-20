#!/bin/bash

# Definir nomes dos arquivos de saída
TSX_OUTPUT="tsx_files_of_project.txt"
TS_OUTPUT="ts_files_of_project.txt"
JSON_OUTPUT="json_files_of_project.txt"
CSS_OUTPUT="css_files_of_project.txt"

# Verificar e limpar arquivos existentes
> "$TSX_OUTPUT"
> "$TS_OUTPUT"
> "$JSON_OUTPUT"
> "$CSS_OUTPUT"

# Concatenar conteúdos dos arquivos em UTF-8, ignorando node_modules/
find . -type f -name "*.tsx" -not -path "*/node_modules/*" -exec cat {} + >> "$TSX_OUTPUT"
find . -type f -name "*.ts" -not -name "*.d.ts" -not -path "*/node_modules/*" -exec cat {} + >> "$TS_OUTPUT"
find . -maxdepth 1 -type f -name "*.json" -not -name "*lock.json" -not -path "*/node_modules/*" -exec cat {} + >> "$JSON_OUTPUT"
find . -type f -name "*.css" -not -path "*/node_modules/*" -exec cat {} + >> "$CSS_OUTPUT"

echo "Exportação concluída!"
