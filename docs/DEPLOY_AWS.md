# AWS Deployment: stenaskartinami

Deployment on AWS with **CloudFront + S3** (static/uploads), **ALB + ECS Fargate** (API + Front), **Aurora PostgreSQL** (Multi-AZ), **Secrets Manager**, optional **ElastiCache**, and **Observability**.

---

## Architecture Overview

```
                    Internet
                        │
                        ▼
                 ┌──────────────┐
                 │  CloudFront  │  (HTTPS, cache static + uploads)
                 └──────┬───────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐   ┌─────────────┐   ┌─────────┐
   │ S3      │   │ ALB         │   │ S3      │
   │ (static │   │ (API +      │   │ (Strapi │
   │  Next)  │   │  Front)     │   │ uploads)│
   └────┬────┘   └──────┬──────┘   └────┬────┘
        │               │               │
        │         ┌─────┴─────┐         │
        │         │ ECS       │         │
        │         │ Fargate   │         │
        │         │ ┌─────┐   │         │
        │         │ │Front│   │         │
        │         │ │Next │   │         │
        │         │ └──┬──┘   │         │
        │         │ ┌──┴──┐   │         │
        │         │ │API  │   │         │
        │         │ │Strapi│──┼─────────┘ (upload to S3)
        │         │ └──┬──┘   │
        │         └────┼──────┘
        │              │
        │              ▼
        │         ┌─────────────┐     ┌──────────────────┐
        │         │ Aurora      │     │ Secrets Manager   │
        │         │ PostgreSQL  │     │ (DB, API keys)    │
        │         │ (Multi-AZ)  │     └──────────────────┘
        │         └─────────────┘
        │
        │         ┌─────────────┐     ┌──────────────────┐
        │         │ ElastiCache │     │ CloudWatch        │
        │         │ (optional)  │     │ (logs, metrics)  │
        │         └─────────────┘     └──────────────────┘
```

**Components:**

| Component | Role |
|-----------|------|
| **CloudFront** | HTTPS, cache static assets and S3 uploads, single entry point |
| **S3** | Static Next.js assets (if using static export) and/or Strapi uploads |
| **ALB** | Routes `/api/*` → API (Strapi), `/` → Front (Next.js) |
| **ECS Fargate** | Runs API (Strapi) and Front (Next.js) tasks |
| **Aurora PostgreSQL** | Multi-AZ database (replaces Docker Postgres) |
| **Secrets Manager** | DB credentials, Strapi APP_KEYS, JWT secrets |
| **ElastiCache** (optional) | Redis for session/cache |
| **Observability** | CloudWatch Logs/Metrics, ECS Container Insights, optional X-Ray |

---

## Prerequisites

- AWS CLI configured (`aws configure`)
- Docker (for building images)
- ECR repositories for `api-v5` and `front`
- Domain (e.g. stenaskartinami.com) for Route 53 / certificate

---

## 1. Secrets Manager

Create secrets so ECS tasks pull credentials at runtime (no env files in images).

### 1.1 Database secret

```bash
aws secretsmanager create-secret \
  --name stenaskartinami/db \
  --description "Aurora PostgreSQL credentials" \
  --secret-string '{
    "username": "stenaskartinami_admin",
    "password": "CHANGE_ME_STRONG_PASSWORD",
    "host": "your-aurora-cluster.cluster-xxx.region.rds.amazonaws.com",
    "port": 5432,
    "dbname": "stenaskartinami"
  }'
```

### 1.2 API (Strapi) secrets

```bash
aws secretsmanager create-secret \
  --name stenaskartinami/api \
  --description "Strapi APP_KEYS, JWT, etc." \
  --secret-string '{
    "APP_KEYS": "key1,key2,key3,key4",
    "API_TOKEN_SALT": "your_salt",
    "ADMIN_JWT_SECRET": "your_admin_jwt_secret",
    "JWT_SECRET": "your_jwt_secret",
    "TRANSFER_TOKEN_SALT": "your_transfer_salt",
    "ENCRYPTION_KEY": "your_encryption_key"
  }'
```

Reference these in the ECS task definition (see section 5).

---

## 2. Aurora PostgreSQL (Multi-AZ)

### 2.1 Create Aurora PostgreSQL cluster

- Engine: Aurora PostgreSQL (compatible with PostgreSQL 15.x or 16.x)
- Capacity: Serverless v2 or provisioned (e.g. db.t4g.medium)
- Multi-AZ: Yes (one writer, one reader in another AZ)
- VPC: Your application VPC (private subnets for DB)
- Security group: Allow inbound 5432 from ECS security group only
- Initial database name: `stenaskartinami`
- Master username/password: store in Secrets Manager (or use the secret created above and align username/password)

### 2.2 Get endpoint

After creation, note the **cluster endpoint** (writer). Put it in Secrets Manager `stenaskartinami/db` as `host`, or pass via ECS env.

---

## 3. S3 + CloudFront (static and uploads)

### 3.1 Buckets

- **Static (optional):** e.g. `stenaskartinami-static-{account-id}` — for Next.js static export or static assets.
- **Uploads:** e.g. `stenaskartinami-uploads-{account-id}` — for Strapi media (configure Strapi S3 provider).

Create buckets (private, no public access). Use bucket policies so only CloudFront (OAI) and ECS (API task role) can read/write as needed.

### 3.2 CloudFront distribution

- **Origins:**
  - ALB (e.g. `stenaskartinami-alb-xxx.eu-west-1.elb.amazonaws.com`) — default, for API + Front.
  - S3 uploads bucket (or a separate distribution for uploads) — path `/uploads/*` or subdomain.
- **Behaviors:**
  - `/api/*` → ALB (no cache or short TTL).
  - `/uploads/*` → S3 (or ALB if uploads still served by Strapi; then later switch to S3).
  - Default `/*` → ALB (Next.js).
- **SSL:** ACM certificate (e.g. `*.stenaskartinami.com`).
- **Alternate domain:** `stenaskartinami.com`, `api.stenaskartinami.com` (or single domain with path-based routing).

### 3.3 Strapi uploads to S3

Configure Strapi to use S3 for uploads so ECS tasks don’t need persistent volumes.

- Install provider: `@strapi/provider-upload-aws-s3`.
- In `api-v5/config/plugins.ts` (or env), set:
  - S3 bucket, region, and credentials via IAM role (no keys in code).
- Point frontend image base URL to CloudFront URL for uploads (e.g. `https://uploads.stenaskartinami.com` or `https://d111111.cloudfront.net`).

---

## 4. ECR (container images)

### 4.1 Create repositories

```bash
aws ecr create-repository --repository-name stenaskartinami-api
aws ecr create-repository --repository-name stenaskartinami-front
```

### 4.2 Build and push

```bash
# From repo root
AWS_REGION=eu-west-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# API
docker build -t stenaskartinami-api ./api-v5
docker tag stenaskartinami-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-api:latest
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-api:latest

# Front
docker build -t stenaskartinami-front ./front
docker tag stenaskartinami-front:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-front:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-front:latest
```

Use the same region and account in all steps.

---

## 5. ECS Fargate (API + Front)

### 5.1 Cluster and VPC

- Create ECS cluster: `stenaskartinami`.
- Use a VPC with public subnets (for ALB) and private subnets (for Fargate). NAT gateway in public subnet so Fargate can pull images and reach Aurora/Secrets Manager.

### 5.2 Task execution role

- Trust policy: `ecs-tasks.amazonaws.com`.
- Permissions: pull ECR, write CloudWatch Logs, read Secrets Manager (`stenaskartinami/db`, `stenaskartinami/api`).

### 5.3 Task role (optional, for API)

- Permissions: S3 PutObject/GetObject for uploads bucket (if Strapi writes to S3 directly).

### 5.4 Task definitions (outline)

**API (Strapi) task:**

- Image: `{account}.dkr.ecr.{region}.amazonaws.com/stenaskartinami-api:latest`
- CPU/Memory: e.g. 512 / 1024.
- Port: 1337.
- Environment (or inject from Secrets):
  - `NODE_ENV=production`
  - `HOST=0.0.0.0`
  - `PORT=1337`
  - `DATABASE_CLIENT=postgres`
  - `DATABASE_HOST` → from Secrets Manager (or env from Secrets)
  - `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` → from `stenaskartinami/db`
  - `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, etc. → from `stenaskartinami/api`
- Secrets: use `valueFrom` pointing to Secrets Manager ARN and key.
- Logging: awslogs driver, group `/ecs/stenaskartinami-api`.
- Optional: mount EFS for uploads if not using S3 yet (not recommended long-term; prefer S3).

**Front (Next.js) task:**

- Image: `{account}.dkr.ecr.{region}.amazonaws.com/stenaskartinami-front:latest`
- CPU/Memory: e.g. 256 / 512.
- Port: 3000.
- Environment:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL=https://api.stenaskartinami.com/api` (or your CloudFront/ALB API URL)
  - `STRAPI_SERVER_URL=http://localhost:1337/api` — **no**: use internal ALB hostname or service discovery so Front task can call API. Prefer **AWS Cloud Map** or internal ALB: e.g. `STRAPI_SERVER_URL=http://stenaskartinami-alb-internal:80/api` or `http://api.stenaskartinami.local/api` (service discovery).
- Logging: awslogs, group `/ecs/stenaskartinami-front`.

Use **Secrets Manager integration** in the task definition for sensitive env vars (see AWS docs “Injecting sensitive data into your containers”).

### 5.5 Services and ALB

- **API service:** Fargate, desired count 1 (or 2 for HA). Target group on port 1337. Health check: HTTP `/_health` or Strapi’s health path on 1337.
- **Front service:** Fargate, desired count 1 (or 2). Target group on port 3000. Health check: HTTP `/` on 3000.

**ALB:**

- Listener 443 (HTTPS, ACM cert).
- Rules:
  - `Host = api.stenaskartinami.com` or `Path = /api*` → API target group.
  - Default → Front target group.
- Security group: allow 443 from 0.0.0.0/0 (and optionally CloudFront only if you put CloudFront in front).

### 5.6 Front → API connectivity

- Option A: **Internal ALB** with two listeners (same ALB or internal ALB) and private DNS; set `STRAPI_SERVER_URL` to internal API URL.
- Option B: **Service discovery** (AWS Cloud Map): create namespace `stenaskartinami.local`, service `api`; Front task gets `http://api.stenaskartinami.local:1337/api`.
- Option C: **Same ALB, path-based:** Front and API on same ALB; Front task calls ALB hostname with path `/api` (use ALB DNS name and path, avoid circular dependency; usually internal ALB or service discovery is cleaner).

Recommended: internal ALB or service discovery for `STRAPI_SERVER_URL` so Front never uses public hostname for server-side calls.

---

## 6. ElastiCache (optional)

- Use if you add Redis for session store or cache (e.g. Strapi or Next.js cache).
- Create Redis cluster (e.g. cache.t4g.micro) in same VPC, private subnets.
- Security group: allow 6379 from ECS security group.
- In API/Front env: `REDIS_URL=redis://elasticache-endpoint:6379`.

---

## 7. Observability

- **CloudWatch Logs:** ECS task definitions use `awslogs`; create log groups `/ecs/stenaskartinami-api`, `/ecs/stenaskartinami-front`.
- **Container Insights:** Enable on the ECS cluster for CPU/memory and task metrics.
- **Alarms:** Create alarms on ECS service CPU/memory, ALB 5xx, Aurora connections.
- **X-Ray (optional):** Add X-Ray daemon sidecar or use AWS Distro for OpenTelemetry for tracing.

---

## 8. DNS and SSL

- **Route 53:** Create A (alias) for `stenaskartinami.com` and `api.stenaskartinami.com` → CloudFront distribution (or ALB if no CloudFront).
- **ACM:** Request certificate for `*.stenaskartinami.com` and `stenaskartinami.com` in the same region as ALB (or in us-east-1 for CloudFront).

---

## 9. Migration from current setup

1. **Database:** Dump from current Postgres, restore to Aurora (pg_restore). Update Secrets Manager with Aurora endpoint and credentials.
2. **Uploads:** Sync existing `api-v5/public/uploads` to S3 uploads bucket; then switch Strapi to S3 provider.
3. **Env:** Remove `.env` from images; use Secrets Manager + non-sensitive env in task definitions.
4. **Front:** Set `NEXT_PUBLIC_API_URL` to public API URL (e.g. `https://api.stenaskartinami.com/api`). Set `STRAPI_SERVER_URL` to internal API URL for server-side fetches.

---

## 10. Summary checklist

- [ ] Secrets Manager: `stenaskartinami/db`, `stenaskartinami/api`
- [ ] Aurora PostgreSQL Multi-AZ, security group, DB name
- [ ] S3: uploads bucket (and optional static); Strapi S3 provider
- [ ] CloudFront: origins ALB + S3; behaviors; ACM cert; domain
- [ ] ECR: api + front images built and pushed
- [ ] ECS: cluster, task definitions (with Secrets), API and Front services, task execution role (and task role for S3)
- [ ] ALB: listeners, target groups, rules (API vs Front)
- [ ] Front ↔ API: internal URL via service discovery or internal ALB
- [ ] Route 53 + ACM
- [ ] Observability: log groups, Container Insights, alarms
- [ ] ElastiCache (optional)

---

---

## 11. ECS task definition (snippet)

**API task — container definition (env from Secrets Manager):**

```json
{
  "name": "api",
  "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/stenaskartinami-api:latest",
  "portMappings": [{ "containerPort": 1337 }],
  "secrets": [
    { "name": "DATABASE_HOST", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:stenaskartinami/db:host::" },
    { "name": "DATABASE_USERNAME", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:stenaskartinami/db:username::" },
    { "name": "DATABASE_PASSWORD", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:stenaskartinami/db:password::" },
    { "name": "APP_KEYS", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:stenaskartinami/api:APP_KEYS::" }
  ],
  "environment": [
    { "name": "NODE_ENV", "value": "production" },
    { "name": "HOST", "value": "0.0.0.0" },
    { "name": "PORT", "value": "1337" },
    { "name": "DATABASE_CLIENT", "value": "postgres" },
    { "name": "DATABASE_PORT", "value": "5432" },
    { "name": "DATABASE_NAME", "value": "stenaskartinami" }
  ],
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/stenaskartinami-api",
      "awslogs-region": "REGION"
    }
  }
}
```

**Front task — container definition:**

```json
{
  "name": "front",
  "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/stenaskartinami-front:latest",
  "portMappings": [{ "containerPort": 3000 }],
  "environment": [
    { "name": "NODE_ENV", "value": "production" },
    { "name": "NEXT_PUBLIC_API_URL", "value": "https://api.stenaskartinami.com/api" },
    { "name": "STRAPI_SERVER_URL", "value": "http://API_INTERNAL_HOST:1337/api" }
  ],
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/stenaskartinami-front",
      "awslogs-region": "REGION"
    }
  }
}
```

Replace `ACCOUNT`, `REGION`, and `API_INTERNAL_HOST` (internal ALB or service discovery URL). Secrets Manager JSON keys must match the keys in your secret (e.g. `host`, `username`, `password`); use `valueFrom` with `:key::` syntax for JSON secrets.

---

## 12. Build and push script (ECR)

Save as `scripts/aws-push.sh` and run from repo root:

```bash
#!/usr/bin/env bash
set -e
AWS_REGION=${AWS_REGION:-eu-west-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_API=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-api
ECR_FRONT=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-front

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t $ECR_API:latest ./api-v5
docker push $ECR_API:latest

docker build -t $ECR_FRONT:latest ./front
docker push $ECR_FRONT:latest

echo "Pushed API and Front to ECR."
```

---

For **Infrastructure as Code**, use **Terraform** or **AWS CDK** for VPC, ECS, ALB, Aurora, S3, CloudFront, Secrets Manager. A `terraform/` or `cdk/` skeleton can be added next.
