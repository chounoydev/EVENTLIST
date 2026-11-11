# Eventlist API

TypeScript/Express API for the Eventlist Vue app. PostgreSQL is the only database used by the API. Schema migrations are versioned in `migrations/` and use the isolated `eventlist` schema. pgAdmin is an optional desktop client for creating and inspecting the PostgreSQL database; it is not part of the API runtime.

## Local setup

1. Install Node.js 22 or later and PostgreSQL.
2. In pgAdmin, register your local PostgreSQL server and create a database named `eventlist`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to that PostgreSQL instance. For a standard local setup, use `postgres://postgres:YOUR_PASSWORD@localhost:5432/eventlist?sslmode=disable`. Never commit real passwords or connection strings.
4. Install dependencies, apply the schema, create the portal owner, and start the API:

```sh
npm ci
npm run build
npm run migrate
npm run owner:create
npm start
```

Set a strong `OWNER_PASSWORD` in the ignored local `.env` before creating the initial owner. The owner password must have at least 12 characters, no more than 72 UTF-8 bytes, upper- and lowercase letters, a number, and a symbol. Passwords are limited to 72 UTF-8 bytes because the API uses bcrypt. `owner:create` creates the configured owner if missing; on later runs it ensures the account has the owner role without changing its password, disabling it, revoking its sessions, or deactivating other owners.

For local development, run `npm run dev`. The Vue app's default API URL remains `http://127.0.0.1:8000/api`.

## Deploy the API to Render

The root `render.yaml` configures this TypeScript API as a Render web service. In Render, create a Blueprint from this repository and provide the prompted environment variables:

- `DATABASE_URL`: Neon pooled connection string for API requests.
- `DATABASE_URL_UNPOOLED`: Neon direct connection string for migrations.
- `CORS_ALLOWED_ORIGINS`: the deployed frontend's origin, without a path (for example, `https://your-app.vercel.app`).
- `OWNER_EMAIL`: the Blueprint configures `johndegamo45@gmail.com` as the portal owner.
- `OWNER_NAME`: optional display name for a newly created owner.
- `OWNER_PASSWORD`: a strong password used only when the owner account is first created. Store it as a Render secret; it is not reset on service restarts.

Render builds the API and runs the idempotent database migration and owner bootstrap when the service starts. Set `CORS_ALLOWED_ORIGINS` to the exact deployed Vercel origin; add any Preview origin you need to use. The website and Android APK both use the frontend's `VITE_API_URL`, configured in `project/.env.production`, so they connect to the same API and PostgreSQL database. After deployment, verify `https://<your-render-service>.onrender.com/api/health` returns `{"status":"ok"}`. If Render assigns a different service URL, update `VITE_API_URL` in the Vercel Production and Preview environments and `project/.env.production`, then redeploy the website and rebuild the APK. The same API URL can be used as the base URL in Postman; Postman tests the API but does not host it.

The free Render service may sleep when idle, so its first request after inactivity can take longer. Local uploads are not persistent across service replacement unless persistent storage is configured.

## PostgreSQL and pgAdmin

The migrations create tables and event-location coordinate columns in the dedicated `eventlist` PostgreSQL schema, leaving any existing `public`-schema tables untouched. They do not import or delete data from the legacy SQLite file. Use pgAdmin to connect to the same PostgreSQL host, port, username, and password in `DATABASE_URL`; select the `eventlist` database and inspect the `eventlist` schema.

Run the migration before starting the API. Set `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `OWNER_EMAIL`, `PUBLIC_API_URL`, `APP_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS`, and SMTP settings in your environment. The API listens on the configured `PORT` and serves uploaded images from `/storage`.

Event cover uploads are written under `UPLOAD_DIR` (default `./uploads`). Configure persistent storage at that path in production if images must survive container replacement.

Password reset uses one-time, hashed, 60-minute tokens sent by SMTP. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. If email delivery is not configured, the endpoint responds with an explicit service-configuration error instead of changing a password based only on an email address.

## API

- `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/user`
- `POST /api/forgot-password`, `POST /api/reset-password`
- `GET /api/public/events`, `GET /api/public/slides`
- Admin event CRUD at `/api/events`
- Admin homepage slide CRUD at `/api/admin/slides`
- Owner-only administrator management at `/api/admin/admins`
- `GET /api/health`

Bearer tokens are random, stored only as SHA-256 hashes, and expire after 30 days. Passwords are bcrypt-hashed. Admin-only and owner-only endpoints enforce role and account status on the server.

## Verification

```sh
npm test
npm run build
```
