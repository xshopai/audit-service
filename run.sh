#!/usr/bin/env bash
# Run Audit Service with Dapr sidecar
# Usage: ./run.sh

echo -e "\033[0;32mStarting Audit Service with Dapr...\033[0m"
echo -e "\033[0;36mService will be available at: http://localhost:8012\033[0m"
echo -e "\033[0;36mDapr HTTP endpoint: http://localhost:3500\033[0m"
echo -e "\033[0;36mDapr gRPC endpoint: localhost:50001\033[0m"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

dapr run \
  --app-id audit-service \
  --app-port 8012 \
  --dapr-http-port 3500 \
  --dapr-grpc-port 50001 \
  --resources-path "$SCRIPT_DIR/.dapr/components" \
  --config "$SCRIPT_DIR/.dapr/config.yaml" \
  --log-level warn \
  -- npx tsx watch src/server.ts
