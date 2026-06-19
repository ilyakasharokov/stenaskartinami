# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo with two independent apps:

- **`front/`** — Next.js 15 / React 18 frontend
- **`api-v5/`** — Strapi 5 CMS backend (Node ≥20)
- **`api/`** — legacy Strapi version, no longer actively used

Infrastructure: Docker Compose runs Postgres 16 + Meilisearch locally. Production uses Docker Compose with nginx reverse proxy and AWS S3 for file uploads.

## Development

### Prerequisites

Start Postgres and Meilisearch first:

```bash
docker compose up -d postgres meilisearch
```

### API (Strapi)

```bash
cd api-v5
npm install
npm run dev        # starts on port 1337
npm run build      # build admin panel
```

Requires `api-v5/.env.local`. Key vars: `DATABASE_HOST=postgres`, `DATABASE_CLIENT=postgres`, `MEILISEARCH_HOST=http://localhost:7700`.

### Frontend (Next.js)

```bash
cd front
npm install
npm run dev        # starts on port 3000 (with Node inspector enabled)
npm run build
npm start
```

Requires `front/.env`. For local dev: `NEXT_PUBLIC_API_URL=http://localhost:1337/api`.

**Dev auto-login**: Set `DEV_AUTO_EMAIL`, `DEV_AUTO_PASSWORD`, and `NEXT_PUBLIC_DEV_AUTO_LOGIN=true` in `front/.env` to bypass OAuth and auto-authenticate against Strapi on every page load.

## Key patterns

### Strapi API responses

Strapi 5 returns `{ data: { id, attributes: {...} } }`. All API calls go through `front/utils/strapi.js`:

- `fetchStrapi(url, options)` — fetches and normalizes the response
- `normalizeStrapiResponse(payload)` — flattens `{ id, attributes }` into plain objects

Always use these helpers when fetching from Strapi; don't manually unwrap `.data.attributes`.

### Query string builder

`front/utils/serialize.js` exports `serialize(obj)` which builds Strapi v5-compatible query strings. It handles pagination (`_start`/`_limit` → `pagination[page]`/`pagination[pageSize]`), filters, sorting, populate, and the `q` text-search param. Pass it directly to `API_HOST + '/arts' + serialize({...})`.

### Server-side cache

`front/utils/server-cache.js` exports `cachedFetch(key, ttlSeconds, fetcher)` — an in-process TTL cache for SSR. Use it in `getServerSideProps` to avoid hammering Strapi on every request. Cache keys follow the convention `page:resource` (e.g. `'home:arts'`, `'catalog:styles'`).

### Image URLs

Use `imageUrlBuilder` from `front/utils/img-url-builder.js` for all Strapi media URLs. It handles:
- Relative paths (`/uploads/...`) — prepends the public API base
- Internal Docker hostnames (`http://api-v5:1337/uploads/...`) — rewrites to the public host

### API host resolution

`front/constants/constants.js` exports `API_HOST` which switches between:
- **Browser**: `NEXT_PUBLIC_API_URL`
- **Server-side (SSR/getServerSideProps)**: `STRAPI_SERVER_URL` (Docker internal, e.g. `http://api-v5:1337/api`) or falls back to `NEXT_PUBLIC_API_URL`

When adding new `getServerSideProps` calls, use `API_HOST` from constants — do not hardcode URLs.

### Content types

Strapi content types in `api-v5/src/api/`: `art`, `artist`, `city`, `form`, `marquee`, `medium`, `slide`, `style`, `subject`, `wall`.

### URL pattern

Art pages use slug + id: `/art/{slug}--{id}`. Artist pages follow the same pattern: `/artists/{slug}--{id}`.

### Auth

`next-auth` v4 with multiple providers configured in `front/lib/authOptions.js`:
- **Credentials**: phone OTP, email OTP, Telegram, email+password (legacy)
- **OAuth**: Google, VK (custom provider — registers/logs in to Strapi on first sign-in)

Auth callback stores the Strapi JWT in the next-auth session token. For server-side auth in API routes, use `getSession` from `front/lib/getSession.js` (not `getServerSession` directly) — it also handles the dev auto-login bypass.

### Meilisearch

Meilisearch (port 7700) is indexed by the `strapi-plugin-meilisearch` plugin. The frontend never calls Meilisearch directly — it goes through the Next.js proxy at `front/pages/api/meili-proxy.js`, which forwards search requests and injects the server-side API key. Set `MEILISEARCH_INTERNAL_HOST` for server-to-server calls and `NEXT_PUBLIC_MEILISEARCH_HOST` for the public endpoint.

### AI features

`front/pages/api/ai/analyze-art.js` — analyzes an artwork image using Yandex Cloud AI (Qwen model via `YC_API_KEY` + `YC_FOLDER_ID`) and returns suggested styles, subjects, mediums, and description. Rate-limited to 5 calls per user per day via in-process map.

`front/pages/api/ai/generate-interior.js` — generates an interior visualization. Same rate limit pattern.

## Environments

**Local** (`localhost:3000`) — Docker Compose on the developer's machine. Rebuild after code changes:
```bash
docker compose up -d --build front
```

**Production** (`stenaskartinami.com`) — remote server `root@82.146.48.155`, project at `/opt/stenaskartinami`. Deploy:
```bash
ssh root@82.146.48.155 "cd /opt/stenaskartinami && git pull origin develop && docker compose -f docker-compose.prod.yml up -d --build front"
```
Always push to git before deploying so the server can pull. When the user says "задеплой на прод" / "на прод" — this is the remote server. When they say "локально" / "пересобери локальный" — this is `docker compose up -d --build front` on the local machine.

File uploads use `@strapi/provider-upload-aws-s3`. Required env vars in `api-v5/.env`: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.

`NEXT_PUBLIC_*` vars must be passed as Docker build args (not just runtime env) because Next.js bakes them at build time. See `docker-compose.prod.yml` for the `args:` section.

See `DEPLOY.md` for the full production setup guide including nginx SSL configuration.
