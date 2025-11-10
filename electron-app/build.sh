#!/bin/bash
# Script de build para Electron

echo "Compilando TypeScript..."
npx tsc

echo "Copiando arquivos estáticos..."
mkdir -p dist/renderer dist/config
cp src/renderer/index.html dist/renderer/
cp src/renderer/styles.css dist/renderer/
cp src/config/config.example.json dist/config/config.json 2>/dev/null || echo "Aviso: config.json não encontrado, use config.example.json como base"

echo "Build concluído!"

