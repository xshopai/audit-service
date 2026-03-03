# Copilot Instructions — audit-service

## Service Identity

- **Name**: audit-service
- **Purpose**: Terminal event consumer — immutable audit trail storage for all platform events
- **Port**: 8012
- **Language**: Node.js 20+ (TypeScript)
- **Framework**: Express with TypeScript
- **Database**: PostgreSQL (port 5434) via Knex.js query builder
- **Dapr App ID**: `audit-service`

## Architecture

- **Pattern**: Terminal event consumer — subscribes to ALL Dapr pub/sub events, writes immutable audit records
- **API Style**: RESTful (read-only query endpoints + health) + Dapr subscription endpoints
- **Authentication**: JWT Bearer tokens for query endpoints; service-to-service for subscriptions
- **Messaging**: Dapr pub/sub consumer (RabbitMQ backend)
- **Event Format**: CloudEvents 1.0 specification

## Project Structure

```
audit-service/
├── src/
│   ├── controllers/     # Query + subscription handlers
│   ├── services/        # Audit record business logic
│   ├── repositories/    # Data access (Knex.js)
│   ├── middlewares/      # Auth, logging, tracing
│   ├── routes/          # Route + subscription definitions
│   ├── migrations/      # Knex database migrations
│   └── core/            # Config, logger
├── tests/
│   └── unit/
├── .dapr/components/
└── package.json
```

## Code Conventions

- **TypeScript** with strict mode
- Use **Knex.js** for PostgreSQL queries (NOT an ORM)
- Audit records are **immutable** — no UPDATE or DELETE operations
- All event data stored as JSONB in PostgreSQL
- Structured logging via Winston
- Handlers must be idempotent (deduplicate by event ID)

## Database Patterns

- PostgreSQL via Knex.js query builder
- Migrations in `src/migrations/`
- Audit table: `id`, `event_type`, `source`, `subject`, `data` (JSONB), `correlation_id`, `created_at`
- Index on `event_type`, `source`, `created_at` for query performance
- Never delete records — append-only pattern

## Event Subscriptions

Subscribes to ALL platform events — acts as the universal audit sink:

- `auth.*`, `user.*`, `admin.*`, `order.*`, `payment.*`, `product.*`, `cart.*`, `inventory.*`

## Security Rules

- JWT MUST be validated for all query endpoints
- Dapr subscription endpoints are authenticated by Dapr sidecar — no additional JWT required
- All audit records are **immutable** — no UPDATE or DELETE operations on audit data
- Never expose raw database IDs or internal structure in API responses
- Rate limiting must be applied to query endpoints

## Error Handling Contract

All errors MUST follow this JSON structure:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "correlationId": "uuid"
  }
}
```

- Never expose stack traces in production
- Use centralized error middleware only

## Logging Rules

- Use structured JSON logging only
- Include:
  - timestamp
  - level
  - serviceName
  - correlationId
  - message
- Never log JWT tokens
- Never log secrets

## Testing Requirements

- All new controllers MUST have unit tests
- Subscription handlers MUST be tested with mock event payloads
- Use **Jest** with **ts-jest** as the test framework
- Mock PostgreSQL (Knex) calls in unit tests
- Do NOT call real databases in unit tests
- Test idempotency: duplicate event IDs must not create duplicate records
- Run: `npm test`

## Non-Goals

- This service does NOT publish business events — it only consumes and stores them
- This service does NOT provide real-time event streaming
- This service does NOT modify or delete audit records — append-only
- This service does NOT perform business logic on events

## Environment Variables

```
PORT=8012
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/audit-service
JWT_SECRET=<shared-secret>
DAPR_HTTP_PORT=3500
```
