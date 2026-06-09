# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo with two independent apps:

- **`front/`** — Next.js 12 / React 17 frontend
- **`api-v5/`** — Strapi 5 CMS backend (Node ≥20)
- **`api/`** — legacy Strapi version, no longer actively used

Infrastructure: Docker Compose runs Postgres 16 locally. Production uses Docker Compose with nginx reverse proxy and AWS S3 for file uploads.

## Development

### Prerequisites

Start Postgres first (required by `api-v5`):

```bash
docker compose up -d postgres
```

### API (Strapi)

```bash
cd api-v5
npm install
npm run dev        # starts on port 1337
npm run build      # build admin panel
```

Requires `api-v5/.env.local` — see `.env.local` in the repo root for the local template. Key vars: `DATABASE_HOST=postgres`, `DATABASE_CLIENT=postgres`.

### Frontend (Next.js)

```bash
cd front
npm install
npm run dev        # starts on port 3000 (with Node inspector enabled)
npm run build
npm start
```

Requires `front/.env`. For local dev: `NEXT_PUBLIC_API_URL=http://localhost:1337/api`.

## Key patterns

### Strapi API responses

Strapi 5 returns `{ data: { id, attributes: {...} } }`. All API calls go through `front/utils/strapi.js`:

- `fetchStrapi(url, options)` — fetches and normalizes the response
- `normalizeStrapiResponse(payload)` — flattens `{ id, attributes }` into plain objects

Always use these helpers when fetching from Strapi; don't manually unwrap `.data.attributes`.

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

### Auth

`next-auth` v3 with OAuth providers (Google, Facebook, VK, Instagram). Wrapped via `<Provider>` in `front/pages/_app.js`. OAuth credentials come from `front/.env`.

## Production deployment

Production runs via `docker-compose.prod.yml`. Deploy with:

```bash
./scripts/deploy.sh         # full rebuild
./scripts/deploy-update.sh  # faster, no full rebuild
```

File uploads use `@strapi/provider-upload-aws-s3`. Required env vars in `api-v5/.env`: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.

See `DEPLOY.md` for the full production setup guide including nginx SSL configuration.
