#!/bin/bash

# Script para RESET TOTAL do Git e novo envio profissional
echo "🧹 Removendo rastros de conexões antigas..."

# 1. Remove a pasta .git se ela existir (isso desconecta de históricos antigos)
rm -rf .git

echo "✅ Projeto limpo. Inicializando novo repositório..."

# 2. Inicializa um novo repositório do zero
git init

# 3. Adiciona o novo repositório remoto oficial
git remote add origin https://github.com/jlmachado/lotohub.git

# 4. Adiciona todos os arquivos (respeitando o .gitignore)
git add .

# 5. Cria o commit inicial
git commit -m "feat: reinicialização do projeto LotoHub 🚀"

# 6. Define a branch principal como main
git branch -M main

echo "📤 Enviando arquivos para https://github.com/jlmachado/lotohub.git..."
echo "💡 Se o GitHub pedir senha, use o seu Personal Access Token (PAT)."

# 7. Envia para o GitHub (usando --force para garantir a sincronização total no novo repositório)
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo "✨ SUCESSO! Seu projeto LotoHub agora está conectado e atualizado no GitHub."
else
    echo "❌ Erro ao enviar. Verifique sua conexão e se o repositório existe."
fi
