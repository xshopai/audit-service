<div align="center">

# 📋 Audit Service

**Event-driven audit logging microservice for the xshopai e-commerce platform**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Dapr](https://img.shields.io/badge/Dapr-Enabled-0D597F?style=for-the-badge&logo=dapr&logoColor=white)](https://dapr.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Getting Started](#-getting-started) •
[Documentation](#-documentation) •
[API Reference](#api-endpoints) •
[Contributing](#-contributing)

</div>

---

## 🎯 Overview

The **Audit Service** is a terminal event consumer that captures all platform activity into an immutable audit trail. It subscribes to events from every xshopai service via Dapr pub/sub (RabbitMQ) and stores structured audit records in PostgreSQL. Designed for compliance, it tracks WHO did WHAT, WHEN, WHERE, WHY, and HOW — supporting advanced search, retention policies, and export capabilities.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 📋 Comprehensive Audit Trail

- Immutable audit record storage (PostgreSQL)
- WHO/WHAT/WHEN/WHERE/WHY/HOW tracking
- Configurable retention policies (default: 7 years)
- Compliance-ready export capabilities

</td>
<td width="50%">

### 📡 Event-Driven Architecture

- Consumes events from all services via Dapr pub/sub
- Terminal consumer (no outbound publishing)
- Correlation tracking across distributed services
- RabbitMQ message broker integration

</td>
</tr>
<tr>
<td width="50%">

### 🔍 Search & Analytics

- Advanced search with filters and statistics
- High-performance queries (<5ms latency)
- Risk level classification (low/medium/high)
- Entity-based and user-based audit views

</td>
<td width="50%">

### 🛡️ Enterprise Security

- JWT authentication with service tokens
- Service-to-service token validation
- OpenTelemetry distributed tracing
- Prometheus-compatible health checks

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional)
- Dapr CLI (for production-like setup)

### Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/xshopai/audit-service.git
cd audit-service

# Start all services (PostgreSQL + audit-service)
docker-compose up -d

# Verify the service is healthy
curl http://localhost:8012/health
```

### Local Development Setup

<details>
<summary><b>🔧 Without Dapr (Simple Setup)</b></summary>

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker-compose -f docker-compose.db.yml up -d

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build TypeScript
npm run build

# Start the service
npm run dev
```

📖 See [Local Development Guide](docs/LOCAL_DEVELOPMENT.md) for detailed instructions.

</details>

<details>
<summary><b>⚡ With Dapr (Production-like)</b></summary>

```bash
# Ensure Dapr is initialized
dapr init

# Start with Dapr sidecar
./run.sh       # Linux/Mac
.\run.ps1      # Windows

# Or manually
dapr run \
  --app-id audit-service \
  --app-port 8012 \
  --dapr-http-port 3500 \
  --resources-path .dapr/components \
  --config .dapr/config.yaml \
  -- npm start
```

> **Note:** All services now use the standard Dapr ports (3500 for HTTP, 50001 for gRPC).

📖 See [Dapr Development Guide](docs/LOCAL_DEVELOPMENT_DAPR.md) for detailed instructions.

</details>

---

## 📚 Documentation

| Document                                                         | Description                                        |
| :--------------------------------------------------------------- | :------------------------------------------------- |
| 📘 [Local Development](docs/LOCAL_DEVELOPMENT.md)                | Step-by-step local setup without Dapr              |
| ⚡ [Local Development with Dapr](docs/LOCAL_DEVELOPMENT_DAPR.md) | Local setup with full Dapr integration             |
| ☁️ [Azure Container Apps](docs/ACA_DEPLOYMENT.md)                | Deploy to serverless containers with built-in Dapr |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### Test Coverage

| Metric     | Status      |
| :--------- | :---------- |
| Unit Tests | ✅ Jest     |
| Linting    | ✅ ESLint   |
| Formatting | ✅ Prettier |

---

## API Endpoints

### Authentication

All endpoints require service authentication via `x-service-token` header or Bearer token.

| Method | Endpoint              | Description                    |
| :----- | :-------------------- | :----------------------------- |
| POST   | `/api/v1/logs`        | Create audit log entry         |
| GET    | `/api/v1/logs/search` | Search audit logs with filters |
| GET    | `/api/v1/stats`       | Get audit statistics           |
| GET    | `/health`             | Health check                   |

---

## 🏗️ Project Structure

```
audit-service/
├── 📁 src/                       # Application source code
│   ├── 📁 api/                   # REST API endpoints
│   ├── 📁 consumers/             # Event consumers (Dapr pub/sub)
│   ├── 📁 services/              # Business logic layer
│   ├── 📁 repositories/          # Data access layer (PostgreSQL)
│   ├── 📁 models/                # Data models and schemas
│   ├── 📁 middleware/            # Authentication, logging
│   └── 📁 utils/                 # Helper functions
├── 📁 tests/                     # Test suite
├── 📁 dist/                      # Compiled JavaScript output
├── 📁 scripts/                   # Database init and utility scripts
├── 📁 docs/                      # Documentation
├── 📁 .dapr/                     # Dapr configuration
│   ├── 📁 components/            # Pub/sub, state store configs
│   └── 📄 config.yaml            # Dapr runtime configuration
├── 📄 docker-compose.yml         # Full service stack
├── 📄 docker-compose.db.yml      # PostgreSQL only
├── 📄 Dockerfile                 # Production container image
└── 📄 package.json               # Dependencies and scripts
```

---

## 🔧 Technology Stack

| Category          | Technology                                 |
| :---------------- | :----------------------------------------- |
| 🟢 Runtime        | Node.js 20+ with TypeScript                |
| 🌐 Framework      | Express 4.18 with path aliases (tsc-alias) |
| 🗄️ Database       | PostgreSQL 15+ via pg driver               |
| 📨 Messaging      | Dapr Pub/Sub (RabbitMQ) + amqplib          |
| 🔐 Authentication | JWT Tokens + service-to-service tokens     |
| 🧪 Testing        | Jest with unit tests                       |
| 📊 Observability  | OpenTelemetry + Azure Monitor + Winston    |

---

## ⚡ Quick Reference

```bash
# 🐳 Docker Compose
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose -f docker-compose.db.yml up -d  # PostgreSQL only

# 🔧 Local Development
npm run dev                       # Start with hot reload
npm run build                     # Compile TypeScript
npm start                         # Production mode

# ⚡ Dapr Development
./run.sh                          # Linux/Mac
.\run.ps1                         # Windows

# 🧪 Testing
npm test                          # Run all tests
npm run test:unit                 # Unit tests only
npm run test:watch                # Watch mode

# 🔍 Health Check
curl http://localhost:8012/health
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Write** tests for your changes
4. **Run** the test suite
   ```bash
   npm test && npm run lint
   ```
5. **Commit** your changes
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
6. **Push** to your branch
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open** a Pull Request

Please ensure your PR:

- ✅ Passes all existing tests
- ✅ Includes tests for new functionality
- ✅ Follows the existing code style
- ✅ Updates documentation as needed

---

## 🆘 Support

| Resource         | Link                                                                       |
| :--------------- | :------------------------------------------------------------------------- |
| 🐛 Bug Reports   | [GitHub Issues](https://github.com/xshopai/audit-service/issues)           |
| 📖 Documentation | [docs/](docs/)                                                             |
| 💬 Discussions   | [GitHub Discussions](https://github.com/xshopai/audit-service/discussions) |

---

## 📄 License

This project is part of the **xshopai** e-commerce platform.
Licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**[⬆ Back to Top](#-audit-service)**

Made with ❤️ by the xshopai team

</div>
