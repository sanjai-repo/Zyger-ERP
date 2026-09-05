# Zyger ERP — Staging Deployment

Production-like, containerized staging environment. Deployed with Docker Compose.

---

## 1. Architecture

```
                         Local Network
                              |
                              v
                     +------------------+
                     |      NGINX       |   PUBLIC ENTRY  (host port 80)
                     |  Reverse Proxy   |
                     +--------+---------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
    +-------------------+          +-------------------+
    | React Frontend    |          | Spring Boot API   |   INTERNAL ONLY
    | static app (nginx)|          | :9090 (internal)  |
    +-------------------+          +---------+---------+
                                             |
                                             v
                                   +-------------------+
                                   | PostgreSQL 18     |   INTERNAL ONLY
                                   | :5432 (internal)  |
                                   +---------+---------+
                                             |
                                             v
                                     pg_staging_data
                                     (persistent volume)

Backend uploads  ->  /app/uploads  ->  zyger_uploads (persistent volume)
```

- **Only `nginx` publishes a host port** (port 80, configurable via `NGINX_PORT`).
- PostgreSQL, backend, and frontend are on the internal `zyger-staging-net` network and are **NOT exposed** to the host.

---

## 2. Routing

| Path                       | Target                                       |
|----------------------------|----------------------------------------------|
| `/`                        | Frontend SPA (with SPA fallback)             |
| `/assets/`                 | Frontend static hashed assets (cached 1y)    |
| `/api/*`                   | Spring Boot backend (preserves `/api` prefix)|
| `/actuator/health`         | Backend health (monitoring)                  |
| `/actuator/health/readiness` | Backend readiness                          |
| `/actuator/*` (anything else)| `403 Forbidden`                             |

---

## 3. Prerequisites

- Docker Engine (with Docker Compose v2)
- Port `80` free on the host (or set `NGINX_PORT` to another port, e.g. `8080`)
- To build images: no local Java/Node required (builds run inside Docker)

Check tooling:

```bash
docker --version
docker compose version
```

---

## 4. Required Environment Variables

Copy the template and fill in real values:

```bash
cp .env.staging.example .env.staging
```

| Variable             | Required | Purpose                                            |
|----------------------|----------|----------------------------------------------------|
| `POSTGRES_DB`        | Yes      | Database name                                      |
| `POSTGRES_USER`      | Yes      | Database user                                      |
| `POSTGRES_PASSWORD`  | Yes      | Database password (STRONG)                         |
| `SPRING_PROFILES_ACTIVE` | Yes  | Must be `staging`                                  |
| `JWT_SECRET`         | Yes      | JWT signing secret (>=256-bit random)              |
| `HIDDEN_ADMIN_PASSWORD` | Yes | Password for the hidden `ZygerAdmin` fallback account (STRONG) |
| `CORS_ALLOWED_ORIGINS` | Yes    | Exact frontend origin(s), comma-separated, no `*`  |
| `NGINX_PORT`         | No       | Host port for the public entry (default `80`)      |
| `JWT_EXPIRATION_MS`  | No       | Token lifetime (default 30 days)                   |
| `PASSWORD_MIN_LENGTH`| No       | Min password length (default 8)                    |
| `MAX_LOGIN_ATTEMPTS` | No       | Lockout threshold (default 5)                      |
| `LOCKOUT_MINUTES`    | No       | Lockout duration (default 15)                      |
| `TZ`                 | No       | Timezone (default `Asia/Kolkata`)                  |
| `SMTP_*` / `MAIL_FROM` | No    | Email notifications (leave blank if unused)        |

Generate secrets:

```bash
# JWT secret (>=256 bits):
openssl rand -base64 48

# Database password (use a strong one):
openssl rand -base64 24
```

> **Never commit a real `.env.staging`.** It is gitignored.

---

## 5. Initial Server Setup

```bash
# 1. Copy the environment template
cp .env.staging.example .env.staging

# 2. Edit with real secrets
nano .env.staging
#    - POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
#    - JWT_SECRET = openssl rand -base64 48
#    - CORS_ALLOWED_ORIGINS = http://localhost  (or your staging domain)
#    - NGINX_PORT (default 80)

# 3. Deploy (builds images, starts stack, waits for health)
./scripts/deploy-staging.sh
```

---

## 6. First Deployment

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
```

Or use the wrapper (recommended — validates env, waits for health):

```bash
./scripts/deploy-staging.sh
```

---

## 7. Normal Update

```bash
./scripts/deploy-staging.sh
```

Or manually:

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
docker compose -f docker-compose.staging.yml --env-file .env.staging ps
```

---

## 8. Status & Health

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging ps
./scripts/health-check.sh
```

---

## 9. Logs

```bash
# All services, follow
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f

# Backend only (watch Flyway migrations / startup)
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f backend

# Nginx
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f nginx
```

---

## 10. Stop / Restart

```bash
# Stop (containers) — data is SAFE, volumes persist
docker compose -f docker-compose.staging.yml --env-file .env.staging down

# Stop AND remove containers (still keeps volumes)
docker compose -f docker-compose.staging.yml --env-file .env.staging down

# Restart a single service
docker compose -f docker-compose.staging.yml --env-file .env.staging restart backend
```

> **⚠️ NEVER run `docker compose down -v` casually.** The `-v` flag **deletes** the named volumes (`pg_staging_data`, `zyger_uploads`), permanently destroying all staging data and uploads.

---

## 11. Database Backup

```bash
./scripts/backup-staging.sh [backup-dir]
```

- Produces a timestamped, gzipped custom-format dump:
  `backups/zyger_erp_YYYYMMDD_HHMMSS.dump.gz`
- Runs `pg_dump` inside the PostgreSQL container (it is not exposed to the host).
- No password is printed or stored in the script.
- Backups older than `BACKUP_RETENTION_DAYS` days are auto-pruned **only if** that
  variable is set (default: keep forever).

Cron example (daily 01:30):

```cron
30 1 * * * cd /path/to/project && ./scripts/backup-staging.sh /var/backups/zyger 2>>/var/log/zyger-backup.log
```

---

## 12. Database Restore

```bash
./scripts/restore-staging.sh backups/zyger_erp_YYYYMMDD_HHMMSS.dump.gz
```

- Requires an explicit backup filename.
- **DESTRUCTIVE**: replaces all current staging data.
- Prints a warning and requires you to type `RESTORE` before proceeding.
- If your existing database has newer data you need, back it up **first**:

```bash
./scripts/backup-staging.sh   # run BEFORE restoring
```

> **Migration rollback limitation:** This restore replaces schema **and** data to match
> the backup. It does **not** auto-rollback individual Flyway migrations. If an update
> introduced new migrations that are already applied, restoring an older dump restores
> the older schema/data, but the Flyway history is also restored from that dump, which
> is consistent for the restored point in time. Always test restores in a throwaway
> environment first.

---

## 13. File / Upload Backup

Uploads live in the `zyger_uploads` named volume, mounted at `/app/uploads` in the
backend. Back them up with:

```bash
docker run --rm -v zyger-staging-uploads:/source -v "$PWD/backups/uploads":/target \
  alpine sh -c "cd /source && tar czf /target/zyger_uploads_$(date +%Y%m%d_%H%M%S).tar.gz ."
```

Restore (after stopping the backend):

```bash
docker run --rm -v zyger-staging-uploads:/target -v "$PWD/backups/uploads":/source \
  alpine sh -c "cd /source && tar xzf /target/zyger_uploads_*.tar.gz -C /target"
```

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| PostgreSQL not healthy | Container still starting / resource limits | `docker compose -f docker-compose.staging.yml logs postgres`; verify volume is writable |
| Backend cannot connect to DB | DB_URL wrong or DB not ready | Compose uses `jdbc:postgresql://postgres:5432/<db>`; check `docker compose logs backend` |
| Flyway validation failure | Schema mismatch vs migrations | Do **not** disable Flyway. Fix migrations or restore a good backup; inspect `logs backend` |
| Nginx 502 Bad Gateway | Backend not up yet | Wait for backend healthy; `docker compose logs -f backend` |
| Frontend API errors | CORS misconfigured | Ensure `CORS_ALLOWED_ORIGINS` exactly matches the browser origin (e.g. `http://localhost`) |
| JWT secret missing/weak | `JWT_SECRET` unset or placeholder | Set a >=256-bit random `JWT_SECRET`; restart backend |
| Upload permission errors | Volume ownership differs from `appuser` | `docker compose exec backend ls -ld /app/uploads`; ensure user `1000`/app can write |
| Port 80 already in use | Another service on host :80 | Set `NGINX_PORT=8080` in `.env.staging` and redeploy |

---

## 15. HTTPS / TLS (Future)

HTTPS is **not** enabled by default. `nginx` currently listens on port 80.

To add TLS later:
1. Configure a domain pointing to the server.
2. Obtain a certificate (e.g. Let's Encrypt via certbot).
3. Add a `listen 443 ssl` server block in `nginx/nginx.conf`, referencing the cert/key.
4. Add an HTTP→HTTPS redirect (301) for port 80.
5. Set `X-Forwarded-Proto` handling (already forwarded by nginx; backend runs with
   `server.forward-headers-strategy=framework` in staging).

Do not claim HTTPS is active until the certificate is installed and validated.

---

## 16. Security Notes

- Only nginx is exposed to the host (port 80). PostgreSQL and backend are internal.
- Database and backend credentials come from environment variables — never in images.
- CORS is restricted to explicit staging origins (no `*`).
- Actuator exposes only `health`/`info`; all other actuator paths return 403.
- The application runs as a non-root user inside containers.
- `ProdSafetyCheck` and all production security logic are unchanged.
- No demo user is seeded in staging (seeding is `dev`-profile only).

---

## 17. Production Differences

Staging mirrors production, but for production:

- Terminate TLS at nginx (port 443) and redirect HTTP→HTTPS.
- Use a real domain and a managed/Let's Encrypt certificate.
- Harden secrets further (e.g. a secret manager, not a plaintext `.env`).
- Consider a managed PostgreSQL or replica for availability.
- Add centralized log shipping and monitoring (Actuator `/actuator/health` for readiness).
- Restrict nginx to known client IPs where appropriate.
