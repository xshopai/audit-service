# Audit Service - Azure Container Apps Deployment

## Overview

This guide covers deploying the Audit Service to Azure Container Apps (ACA) with Dapr integration for event consumption.

## Prerequisites

- Azure CLI installed and authenticated
- Docker installed
- Azure subscription with appropriate permissions
- Azure Container Registry (ACR) created
- Azure PostgreSQL Flexible Server

## Quick Deployment

### Using the Deployment Script

**PowerShell (Windows):**

```powershell
cd scripts
.\aca.ps1
```

**Bash (macOS/Linux):**

```bash
cd scripts
./aca.sh
```

## Manual Deployment

### 1. Set Variables

```bash
RESOURCE_GROUP="rg-xshopai-aca"
LOCATION="swedencentral"
ACR_NAME="acrxshopaiaca"
ENVIRONMENT_NAME="cae-xshopai-aca"
POSTGRES_SERVER="psql-xshopai-aca"
APP_NAME="audit-service"
APP_PORT=1012
DATABASE_NAME="audit_db"
```

### 2. Create PostgreSQL Database

```bash
# Create PostgreSQL server (if not exists)
az postgres flexible-server create \
  --name $POSTGRES_SERVER \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user pgadmin \
  --admin-password <password> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32

# Create database
az postgres flexible-server db create \
  --server-name $POSTGRES_SERVER \
  --resource-group $RESOURCE_GROUP \
  --database-name $DATABASE_NAME
```

### 3. Build and Push Image

```bash
az acr login --name $ACR_NAME
docker build -t $ACR_NAME.azurecr.io/$APP_NAME:latest .
docker push $ACR_NAME.azurecr.io/$APP_NAME:latest
```

### 4. Deploy Container App

```bash
DATABASE_URL="postgresql://pgadmin:<password>@${POSTGRES_SERVER}.postgres.database.azure.com:5432/${DATABASE_NAME}"

az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_NAME.azurecr.io/$APP_NAME:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --target-port $APP_PORT \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1Gi \
  --enable-dapr \
  --dapr-app-id $APP_NAME \
  --dapr-app-port $APP_PORT \
  --secrets "db-url=$DATABASE_URL" \
  --env-vars \
    "PORT=$APP_PORT" \
    "NODE_ENV=production" \
    "DATABASE_URL=secretref:db-url" \
    "LOG_LEVEL=info"
```

## Event Subscriptions

The audit service subscribes to events from other services via Dapr pub/sub. Ensure the pub/sub component is configured:

```yaml
# pubsub.yaml
componentType: pubsub.azure.servicebus
version: v1
metadata:
  - name: connectionString
    secretRef: servicebus-connection
scopes:
  - audit-service
```

## Monitoring

### View Logs

```bash
az containerapp logs show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL firewall allows Azure services
2. Check connection string format
3. Ensure SSL mode is configured correctly
