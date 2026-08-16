# Zylo Platform Operability & Disaster Recovery Runbook

## 1. System Overview & Architecture
- **API Runtime**: Node.js 20 LTS (Express, ES Modules, layered service-controller pattern).
- **Frontend**: Next.js (App Router, Server Components + Client hydration).
- **Primary Database**: MongoDB 7.0 (Mongoose ODM).
- **Authentication**: JWT (Access Token in HttpOnly cookie or Authorization Bearer header, Refresh Token rotation with session revocation in DB).
- **Payment Gateways**: eSewa UAT/Prod (HMAC-SHA256 signature verification), Fonepay (MD5/SHA512 verification), Khalti, Cash on Delivery (COD).

---

## 2. Recovery Objectives (SLA)
- **RPO (Recovery Point Objective)**: $\le 1$ hour (continuous point-in-time oplog backups in MongoDB Atlas).
- **RTO (Recovery Time Objective)**: $\le 30$ minutes (automated container restart via Docker Compose / ECS / Render).
- **Availability Target**: 99.9% uptime.

---

## 3. Data Retention & Pruning Policies
1. **Financial & Tax Records (Orders, Payments, Purchases, Stock Moves)**:
   - **Retention**: Indefinite (mandatory under Nepal Inland Revenue Department / VAT regulations).
   - Soft deletes (`deletedAt`) used exclusively for catalog entities; financial transaction history is never mutated or hard-deleted.
2. **Guest Carts**:
   - **Retention**: 30 days.
   - Automatically pruned via MongoDB TTL index on `Cart.updatedAt` (`expireAfterSeconds: 2592000`).
3. **User Sessions**:
   - **Retention**: 7 days past expiration or revocation.
   - Pruned automatically via MongoDB TTL index on `Session.expiresAt`.
4. **Audit Logs & HTTP Request Traces**:
   - Production logs forwarded to centralized log aggregator (Datadog, CloudWatch, or Grafana Loki).
   - Log retention window: 90 days hot, 365 days cold archive.

---

## 4. Backup & Disaster Recovery Drill

### A. Automated Backups (MongoDB Atlas)
- **Daily Snapshots**: Retained for 30 days.
- **Continuous Oplog Archival**: Enables Point-in-Time Restore (PITR) to any second within the past 7 days.

### B. Manual Backup Procedure (CLI)
To perform an ad-hoc local or staging backup using `mongodump`:
```bash
# Dump all collections to compressed archive
mongodump --uri="mongodb://localhost:27017/zylo_db" --archive=zylo_backup_$(date +%Y%m%d_%H%M%S).gz --gzip
```

### C. Disaster Recovery Restore Procedure
To restore from a compressed archive into a clean cluster:
```bash
# Restore archive with drop safeguard
mongorestore --uri="mongodb://localhost:27017/zylo_db" --archive=zylo_backup_YYYYMMDD_HHMMSS.gz --gzip --drop
```

---

## 5. System Observability & Alerting

### Health & Readiness Endpoints
- `GET /health` — Liveness check for load balancers.
- `GET /health/ready` — Readiness check validating database connectivity (`pingDB`).
- `GET /health/metrics` — JSON metrics payload reporting:
  - Process uptime, Node version, memory usage (RSS, Heap Used, Heap Total).
  - HTTP request volume, active in-flight requests, slow requests ($>500\text{ms}$).
  - Latency percentiles ($p50, p95, p99$) across recent traffic.
  - HTTP status distribution (`2xx, 3xx, 4xx, 5xx`).

### Alert Thresholds
1. **5xx Error Spikes**: $> 1\%$ of total requests over a 5-minute rolling window $\to$ P1 Alert.
2. **Latency Degradation**: $p95 > 800\text{ms}$ on `/api/orders` checkout path $\to$ P2 Warning.
3. **Database Disconnect**: `/health/ready` returning 503 for $> 30$ seconds $\to$ P1 Critical Alert.
