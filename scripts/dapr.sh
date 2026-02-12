#!/bin/bash

# Audit Service - Run with Dapr Pub/Sub

echo "Starting Audit Service (Dapr Pub/Sub)..."
echo "Service will be available at: http://localhost:8012"
echo "Dapr HTTP endpoint: http://localhost:3512"
echo "Dapr gRPC endpoint: localhost:50012"
echo ""

# Kill any processes using required ports (prevents "address already in use" errors)
for PORT in 8012 3512 50012; do
    for pid in $(netstat -ano 2>/dev/null | grep ":$PORT" | grep LISTENING | awk '{print $5}' | sort -u); do
        echo "Killing process $pid on port $PORT..."
        taskkill //F //PID $pid 2>/dev/null
    done
done

dapr run \
  --app-id audit-service \
  --app-port 8012 \
  --dapr-http-port 3512 \
  --dapr-grpc-port 50012 \
  --log-level info \
  --config ./.dapr/config.yaml \
  --resources-path ./.dapr/components \
  -- npm run dev

