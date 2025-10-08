#!/bin/bash

echo "📤 Подготовка к загрузке в GitHub"

# Проверяем, есть ли git репозиторий
if [ ! -d ".git" ]; then
    echo "🔧 Инициализация Git репозитория..."
    git init
    git branch -M main
fi

# Создаем .gitignore если его нет
if [ ! -f ".gitignore" ]; then
    echo "📝 Создание .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.production.local
*.env

# Database
*.db
*.sqlite

# Build outputs
dist/
build/

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker
docker-compose.override.yml

# Uploads
uploads/
EOF
fi

echo "📋 Файлы для загрузки:"
git add .
git status

echo ""
echo "💬 Введите описание изменений (commit message):"
read -r commit_message

if [ -z "$commit_message" ]; then
    commit_message="Initial commit: Student Reports Application"
fi

git commit -m "$commit_message"

echo ""
echo "🌐 Теперь:"
echo "1. Создайте новый репозиторий на GitHub:"
echo "   https://github.com/new"
echo ""
echo "2. Название: student-reports-app"
echo "3. Сделайте его публичным или приватным"
echo "4. НЕ создавайте README.md (у нас уже есть файлы)"
echo ""
echo "5. После создания репозитория выполните:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/student-reports-app.git"
echo "   git push -u origin main"
echo ""
echo "✅ Готово! Ваш код будет загружен в GitHub"