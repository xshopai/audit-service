#!/bin/bash

# ============================================================================
# Azure Container Apps Deployment Script for Audit Service
# ============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() { echo -e "\n${BLUE}============================================================================${NC}\n${BLUE}$1${NC}\n${BLUE}============================================================================${NC}\n"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

prompt_with_default() {
    local prompt="$1" default="$2" varname="$3"
    read -p "$prompt [$default]: " input
    eval "$varname=\"${input:-$default}\""
}

# Prerequisites
print_header "Checking Prerequisites"
command -v az &> /dev/null || { print_error "Azure CLI not installed"; exit 1; }
command -v docker &> /dev/null || { print_error "Docker not installed"; exit 1; }
az account show &> /dev/null || az login
print_success "Prerequisites verified"

# Configuration
print_header "Azure Configuration"
az account list --query "[].{Name:name, SubscriptionId:id, IsDefault:isDefault}" --output table

prompt_with_default "Enter Resource Group name" "rg-xshopai-aca" RESOURCE_GROUP
prompt_with_default "Enter Azure Location" "swedencentral" LOCATION
prompt_with_default "Enter Azure Container Registry name" "acrxshopaiaca" ACR_NAME
prompt_with_default "Enter Container Apps Environment name" "cae-xshopai-aca" ENVIRONMENT_NAME
prompt_with_default "Enter PostgreSQL Server name" "psql-xshopai-aca" POSTGRES_SERVER
prompt_with_default "Enter PostgreSQL Admin Password" "" POSTGRES_PASSWORD

APP_NAME="audit-service"
APP_PORT=1012

# Confirmation
print_header "Deployment Configuration"
echo "Resource Group:       $RESOURCE_GROUP"
echo "Container Registry:   $ACR_NAME"
echo "PostgreSQL Server:    $POSTGRES_SERVER"
echo "App Name:             $APP_NAME"
echo "App Port:             $APP_PORT"

read -p "Proceed with deployment? (y/N): " CONFIRM
[[ ! "$CONFIRM" =~ ^[Yy]$ ]] && exit 0

# Resource Group
print_header "Step 1: Resource Group"
az group exists --name "$RESOURCE_GROUP" | grep -q "true" || az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
print_success "Resource group ready"

# PostgreSQL
print_header "Step 2: PostgreSQL Database"
if ! az postgres flexible-server show --name "$POSTGRES_SERVER" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_info "Creating PostgreSQL server..."
    az postgres flexible-server create \
        --name "$POSTGRES_SERVER" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --admin-user auditadmin \
        --admin-password "$POSTGRES_PASSWORD" \
        --sku-name Standard_B1ms \
        --tier Burstable \
        --storage-size 32 \
        --output none
fi
print_success "PostgreSQL ready"

# Create database
az postgres flexible-server db create \
    --resource-group "$RESOURCE_GROUP" \
    --server-name "$POSTGRES_SERVER" \
    --database-name audit_db \
    --output none 2>/dev/null || true

POSTGRES_HOST="${POSTGRES_SERVER}.postgres.database.azure.com"
POSTGRES_CONNECTION="postgresql://auditadmin:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/audit_db?sslmode=require"

# ACR
print_header "Step 3: Container Registry"
az acr show --name "$ACR_NAME" &> /dev/null || az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true --output none
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
az acr login --name "$ACR_NAME"
print_success "ACR ready"

# Build and Push
print_header "Step 4: Build and Push Image"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

IMAGE_TAG="${ACR_LOGIN_SERVER}/${APP_NAME}:latest"
docker build -t "$IMAGE_TAG" .
docker push "$IMAGE_TAG"
print_success "Image pushed"

# Container Apps Environment
print_header "Step 5: Container Apps Environment"
az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null || \
    az containerapp env create --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" --location "$LOCATION" --output none
print_success "Environment ready"

# Deploy
print_header "Step 6: Deploy Container App"
if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    az containerapp update --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --image "$IMAGE_TAG" \
        --set-env-vars "DATABASE_URL=secretref:database-url" --output none
else
    az containerapp create \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "$ENVIRONMENT_NAME" \
        --image "$IMAGE_TAG" \
        --registry-server "$ACR_LOGIN_SERVER" \
        --target-port $APP_PORT \
        --ingress internal \
        --min-replicas 1 \
        --max-replicas 5 \
        --cpu 0.5 \
        --memory 1Gi \
        --enable-dapr \
        --dapr-app-id "$APP_NAME" \
        --dapr-app-port $APP_PORT \
        --dapr-app-protocol http \
        --secrets "database-url=${POSTGRES_CONNECTION}" \
        --env-vars \
            "NODE_ENV=production" \
            "PORT=$APP_PORT" \
            "DATABASE_URL=secretref:database-url" \
            "DAPR_HTTP_PORT=3512" \
        --output none
fi
print_success "Container app deployed"

# Summary
print_header "Deployment Complete!"
echo -e "${GREEN}Audit Service deployed successfully!${NC}"
echo -e "${YELLOW}Dapr App ID:${NC} $APP_NAME"
echo -e "\n${YELLOW}Useful Commands:${NC}"
echo "  az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --type console --follow"
