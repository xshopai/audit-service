# Audit Service - Local Development Guide

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- PostgreSQL 14+ (local or Docker)
- Dapr CLI (optional, for event subscription)

## Quick Start

### 1. Start PostgreSQL

Using Docker:

```bash
docker run -d \
  --name postgres-audit \
  -e POSTGRES_USER=auditadmin \
  -e POSTGRES_PASSWORD=auditpass \
  -e POSTGRES_DB=audit_db \
  -p 5432:5432 \
  postgres:14
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env`:

```env
NODE_ENV=development
PORT=1012
DATABASE_URL=postgresql://auditadmin:auditpass@localhost:5432/audit_db
DAPR_HTTP_PORT=3500
```

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. Start the Service

Without Dapr:

```bash
npm run dev
```

With Dapr (for event subscriptions):

```bash
./run.sh
# or on Windows
./run.ps1
```

## Available Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start with hot reload    |
| `npm start`       | Start in production mode |
| `npm test`        | Run tests                |
| `npm run migrate` | Run database migrations  |
| `npm run lint`    | Run ESLint               |

## Project Structure

```
audit-service/
├── src/
│   ├── controllers/    # HTTP request handlers
│   ├── services/       # Business logic
│   ├── models/         # Database models
│   ├── routes/         # Route definitions
│   ├── subscriptions/  # Dapr event subscriptions
│   └── app.js          # Express app
├── migrations/         # Database migrations
├── tests/              # Test files
└── package.json
```

## Event Subscriptions

Audit Service subscribes to events from all services via Dapr pub/sub:

| Event       | Source          | Description           |
| ----------- | --------------- | --------------------- |
| `user.*`    | user-service    | User lifecycle events |
| `auth.*`    | auth-service    | Authentication events |
| `order.*`   | order-service   | Order events          |
| `product.*` | product-service | Product changes       |

## API Endpoints

| Method | Endpoint              | Description      |
| ------ | --------------------- | ---------------- |
| GET    | `/health`             | Health check     |
| GET    | `/api/audit/logs`     | Query audit logs |
| GET    | `/api/audit/logs/:id` | Get specific log |

## Troubleshooting

### Database Connection Failed

- Verify PostgreSQL is running: `docker ps`
- Check connection string in `.env`

### Events Not Being Received

- Ensure Dapr sidecar is running
- Check pub/sub component configuration
