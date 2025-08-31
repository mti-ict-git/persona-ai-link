#!/usr/bin/env pwsh
# Production Deployment Script
# This script deploys the application using docker-compose.yml for production

Write-Host "Starting Production Deployment..." -ForegroundColor Green

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "Warning: .env.production file not found. Using default .env file." -ForegroundColor Yellow
    Write-Host "Please create .env.production with your production settings." -ForegroundColor Yellow
}

# Stop any running containers
Write-Host "Stopping existing containers..." -ForegroundColor Blue
docker-compose down

# Build and start production containers
Write-Host "Building and starting production containers..." -ForegroundColor Blue
docker-compose --env-file .env.production build --no-cache
docker-compose --env-file .env.production up -d

# Show container status
Write-Host "Container Status:" -ForegroundColor Green
docker-compose ps

# Show logs
Write-Host "Recent logs:" -ForegroundColor Green
docker-compose logs --tail=20

Write-Host "Production deployment completed!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "" 
Write-Host "To view logs: docker-compose logs -f" -ForegroundColor Yellow
Write-Host "To stop: docker-compose down" -ForegroundColor Yellow