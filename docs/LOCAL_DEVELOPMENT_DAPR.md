# Audit Service - Local Development with Dapr

## Overview

Running Audit Service with Dapr enables:

- Event subscription from all platform services
- Distributed tracing
- Service-to-service invocation

## Prerequisites

- Dapr CLI installed (`dapr --version`)
- Dapr initialized (`dapr init`)
- RabbitMQ running (for local pub/sub)

## Dapr Components Setup

### 1. Start RabbitMQ

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

### 2. Dapr Component Configuration

The `.dapr/components/` folder contains:

**pubsub.yaml** - RabbitMQ pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: xshopai-pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
    - name: host
      value: amqp://guest:guest@localhost:5672
scopes:
  - audit-service
```

## Running with Dapr

### Using run.sh

```bash
./run.sh
```

### Manual Dapr Run

```bash
dapr run \
  --app-id audit-service \
  --app-port 1012 \
  --dapr-http-port 3512 \
  --dapr-grpc-port 50012 \
  --resources-path .dapr/components \
  --config .dapr/config.yaml \
  -- npm run dev
```

## Event Subscription Configuration

Audit Service uses programmatic subscriptions. In `src/subscriptions/index.js`:

```javascript
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    { pubsubname: 'xshopai-pubsub', topic: 'user.created', route: '/events/user-created' },
    { pubsubname: 'xshopai-pubsub', topic: 'auth.login', route: '/events/auth-login' },
    // ... more subscriptions
  ]);
});
```

## Testing Event Handling

### Publish Test Event

```bash
curl -X POST http://localhost:3512/v1.0/publish/xshopai-pubsub/user.created \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-123", "email": "test@example.com"}'
```

### Check Audit Logs

```bash
curl http://localhost:1012/api/audit/logs
```

## Dapr Dashboard

View Dapr components and subscriptions:

```bash
dapr dashboard
```

Opens at http://localhost:8080

## Troubleshooting

### Events Not Received

1. Check Dapr sidecar logs: `dapr logs --app-id audit-service`
2. Verify subscription endpoint: `curl http://localhost:1012/dapr/subscribe`
3. Check RabbitMQ management UI: http://localhost:15672

### Sidecar Not Starting

1. Ensure Dapr is initialized: `dapr init`
2. Check component YAML syntax
3. Verify RabbitMQ is accessible
