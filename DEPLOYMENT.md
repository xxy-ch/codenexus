![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in Chinese / 中文说明](DEPLOYMENT.zh-CN.md)**

# Production Deployment Guide

This guide details the production deployment, orchestration, security hardening, monitoring, and backup strategies for the **CodeNexus** Online Judge platform.

---

## 1. Production Architecture Overview

The system uses a highly secure, container-orchestrated multi-tier architecture:

```
                    +-------------------+
                    |   User Browsers   |
                    +--------+----------+
                             |
                      :80 / :443 (SSL)
                             |
                    +--------v----------+
                    |  Frontend (Nginx) |
                    |  Reverse Proxy    |
                    +--------+----------+
                             |
                    /api/ -->|   /ws -->|
                             |          |
                    +--------v----------+
                    |    API Server     |
                    |    Rust (Axum)    |
                    |    :3000          |
                    +--+-----+-----+---+
                       |     |     |
             +----------+     |     +----------+
             |                |                |
   +---------v-----+  +------v-------+  +-----v-----------+
   |  PostgreSQL   |  |    Redis      |  |  Judge Worker   |
   |  :5432        |  |  :6379        |  |  (Linux sandbox)|
   +---------------+  +--------------+  +-----------------+
```

### Port Mapping Policies

| Public Host Port | Internal Container Port | Service | Protocol | Network Scope |
|------------------|-------------------------|---------|----------|---------------|
| `80` / `443` | `80` | Frontend Nginx | TCP | Public Internet |
| None | `3000` | Axum API Server | TCP | Bridge Network Only |
| None | `5432` | PostgreSQL DB | TCP | Bridge Network Only |
| None | `6379` | Redis Broker | TCP | Bridge Network Only |

---

## 2. Infrastructure Requirements

### Operating Systems
- **Web App / DB Modules:** Linux, macOS, or Windows Server.
- **Judge Worker (Execution Sandbox):** **Must be deployed on a Linux Host** running a modern kernel supporting:
  - **cgroups v2** (Resource control limits)
  - **seccomp** system call filtering
  - **chroot** filesystem path isolation

### Recommended Hardware Profiles

| Deployment Scale | CPU | RAM | SSD Storage | Use Case |
|------------------|-----|-----|-------------|----------|
| **Standard** | 4 Cores | 8 GB | 50 GB | Institutional Teaching (<200 concurrent users) |
| **High Capacity**| 8 Cores | 16 GB | 100 GB | Mid-scale Competitions (<1000 concurrent users) |
| **Enterprise** | 16+ Cores| 32+ GB | 250+ GB | High-volume Public Judge |

---

## 3. Orchestrated Launch (Docker Compose)

### Environment Provisioning
Initialize local directories and copy production environment files:

```bash
git clone <repository-url> && cd Online_Judge

# Generate highly secure, random keys for JWT signing and Worker handshakes
export JWT_SECRET=$(openssl rand -base64 64)
export WORKER_SECRET=$(openssl rand -base64 32)
export APP_ENV=production
```

### Service Orchestration (`docker-compose.yml`)

The platform services boot in a strictly resolved dependency tree:
1. `postgres` (Passes internal health checks) ->
2. `redis` (Passes internal health checks) ->
3. `api` (Runs migrations, establishes socket connections) ->
4. `frontend` and `judge-worker` launch simultaneously.

Start the entire system in the background:
```bash
docker compose up -d --build
```

Verify service states:
```bash
docker compose ps
```
Ensure that all container status columns read `healthy`.

---

## 4. Production Hardening Checklist

### 1. API Security Gates
- **CORS Hardening:** In `backend/api/.env`, ensure `APP_ENV=production` is set and declare allowed origins explicitly in `CORS_ORIGINS`. Never leave as `*`.
- **Worker Verification:** Restrict the worker callback API. Ensure that both `api` and `judge-worker` utilize identical, long, random `WORKER_SECRET` values to authorize judge callbacks.

### 2. Database Controls
- **Never Expose Port 5432:** Block port 5432 on public firewall rules. Ensure it is accessible only internally over the Docker bridge network.
- **Secure Password Policies:** Replace default PostgreSQL credentials with strong generated secrets.

### 3. SSL/TLS Termination
- Nginx inside `frontend` handles frontend static files and acts as a reverse proxy.
- For SSL termination, configure an external proxy (e.g. Certbot, Traefik, or AWS ALB) in front of the Nginx container on port `80` to enforce HTTPS/WSS.
<!-- GSD:docs -->
