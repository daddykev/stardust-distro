#!/bin/bash

echo "🚀 Setting up protocol testing environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "Please install Docker Desktop from https://www.docker.com"
    echo ""
    echo "Alternative: You can still test with public servers:"
    echo "  - FTP: ftp.dlptest.com"
    echo "  - SFTP: test.rebex.net"
    echo "  - Firebase Storage: Already available"
    exit 0
fi

# Check if docker-compose exists
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "⚠️  docker-compose not found, but you can still use public test servers"
    exit 0
fi

# Start test services if Docker is available
if [ -f "docker/docker-compose.test.yml" ]; then
    echo "📦 Starting local test services with Docker..."
    $DOCKER_COMPOSE -f docker/docker-compose.test.yml up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo "✅ Local test environment ready!"
else
    echo "⚠️  Docker compose file not found, using public test servers only"
fi

echo ""
echo "Available test endpoints:"
echo "  📁 FTP:     ftp.dlptest.com (Public)"
echo "  🔐 SFTP:    test.rebex.net (Public)"
echo "  💾 Storage: Firebase Storage (Your Project)"
echo ""
echo "To test S3/Azure locally, ensure Docker is running with:"
echo "  📦 S3:      http://localhost:9000 (MinIO)"
echo "  ☁️  Azure:   http://localhost:10000 (Azurite)"
echo ""
echo "Ready to run tests! Use: npm run test:run"