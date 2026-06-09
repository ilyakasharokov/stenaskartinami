# AWS Secrets Manager — JSON templates

Copy the example files and fill in values (or use the filled `*.json` from .env — those are gitignored):

```bash
cp docs/aws-secrets/db.example.json docs/aws-secrets/db.json
cp docs/aws-secrets/api.example.json docs/aws-secrets/api.json
cp docs/aws-secrets/front.example.json docs/aws-secrets/front.json
# Edit db.json, api.json, front.json with real values
```

Then create secrets in AWS:

```bash
# 1. Database (Aurora) — set host to your Aurora cluster endpoint
aws secretsmanager create-secret \
  --name stenaskartinami/db \
  --description "Aurora PostgreSQL credentials" \
  --secret-string file://docs/aws-secrets/db.json

# 2. API (Strapi)
aws secretsmanager create-secret \
  --name stenaskartinami/api \
  --description "Strapi APP_KEYS, JWT, etc." \
  --secret-string file://docs/aws-secrets/api.json

# 3. Front (optional, OAuth)
aws secretsmanager create-secret \
  --name stenaskartinami/front \
  --description "Next.js / NextAuth OAuth credentials" \
  --secret-string file://docs/aws-secrets/front.json
```

**ECS task definition:** reference keys with `valueFrom` and the secret ARN. For JSON secrets use the key name, e.g.:

- `valueFrom`: `arn:aws:secretsmanager:REGION:ACCOUNT:secret:stenaskartinami/db` → then in container use `host`, `username`, `password`, `port`, `dbname` as separate env vars with `valueFrom` like `...secret:stenaskartinami/db:username::` (syntax depends on your region; see [Referencing AWS Secrets Manager secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)).

**Do not commit real values.** Either edit the JSON files only locally and don’t commit, or copy to `db.local.json` / `api.local.json` / `front.local.json` (these are in `.gitignore`) and run:

```bash
aws secretsmanager create-secret --name stenaskartinami/db --secret-string file://docs/aws-secrets/db.local.json
```
