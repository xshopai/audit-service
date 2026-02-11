#!/bin/bash

# Audit Service - Run with Dapr

echo "Starting Audit Service with Dapr..."
echo "Service will be available at: http://localhost:8012"
echo "Dapr HTTP endpoint: http://localhost:3512"
echo "Dapr gRPC endpoint: localhost:50012"
echo ""

dapr run \
  --app-id audit-service \
  --app-port 8012 \
  --dapr-http-port 3512 \
  --dapr-grpc-port 50012 \
  --log-level info \
  --config ./.dapr/config.yaml \
  --resources-path ./.dapr/components \
  -- npm run dev:local

