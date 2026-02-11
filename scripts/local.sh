#!/bin/bash

# Audit Service - Run without Dapr (local development)

echo "Starting Audit Service (without Dapr)..."
echo "Service will be available at: http://localhost:8010"
echo ""
echo "Note: Event consumption will fail without Dapr."
echo "This mode is suitable for isolated development and testing."
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run in development mode with hot reload
npm run dev
