#!/bin/bash

echo "🚀 Deploying Student Reports Application to Production"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production variables"
    exit 1
fi

# Load production environment variables
export $(cat .env.production | xargs)

echo "📦 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo "🗃️ Starting database..."
docker-compose -f docker-compose.prod.yml up -d postgres

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🔄 Running database migrations..."
cd backend
npm run db:migrate:prod
cd ..

echo "🌱 Seeding database with initial data..."
docker-compose -f docker-compose.prod.yml run --rm backend npm run db:seed:prod

echo "🚀 Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://localhost"
echo "🔗 Backend API: http://localhost:3001/api"
echo "🗃️ Database: postgresql://localhost:5432/${POSTGRES_DB}"

echo ""
echo "🔐 Default login credentials:"
echo "Email: teacher@demo.com"
echo "Password: demo123"
echo ""
echo "⚠️  Don't forget to:"
echo "1. Change default passwords"
echo "2. Configure SSL/HTTPS"
echo "3. Set up your domain"
echo "4. Configure backups"