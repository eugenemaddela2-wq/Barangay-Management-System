# Barangay Management System (BMS)

This repository contains a simple Barangay Management System with a Node.js/Express backend and static frontend pages.

Important: This project uses PostgreSQL as the database. The `db/init.sql` contains the schema.

## What I added
- `server.js` — Express API with routes for users, residents, officials, events, complaints, and documents.
- `public/js/script.js` — Client-side API helper used by page scripts.
- Admin UI at `public/admin/admin.html` and `public/admin/admin.js`.
- Server-side input validation using `express-validator` for auth and all CRUD endpoints.
- JWT-based auth (login/register), token refresh endpoint (`/api/auth/refresh`).
- `render.yaml` — sample Render service definition (replace secrets in dashboard).

## Run locally
1. Install dependencies

```powershell
npm install
```

2. Set environment variables (PowerShell example):

```powershell
$env:DATABASE_URL = 'postgresql://<user>:<pass>@<host>:5432/<dbname>'
$env:JWT_SECRET = 'a-strong-secret'
node server.js
```

3. Open http://localhost:3000 in your browser.

Notes:
- Do not commit real credentials to the repository. Use environment variables or your hosting provider's secret store.
- The server serves the static frontend from `public/`.

## Deploy to Render (example)
The repository includes a `render.yaml` that can be used to create a Render web service. **Do not** put real secrets in the file — set them via the Render dashboard.

Steps (high level):
1. Push this repo to GitHub.
2. On Render, create a new Web Service and connect the GitHub repo.
3. Use the build command: `npm install` and start command: `node server.js`.
4. Add environment variables in the Render dashboard:
   - `DATABASE_URL` — Postgres connection string (from your Render Postgres service or external DB).
   - `JWT_SECRET` — a strong secret string.
5. If you use Render's managed Postgres, you can attach it and use `fromDatabase` in `render.yaml`.

Example `render.yaml` keys (already included):
- `DATABASE_URL` — set from your DB service or secret.
- `JWT_SECRET` — set as secret in Render dashboard.

## Security notes
- Passwords are hashed using bcrypt.
- JWTs are used for session; client uses localStorage for simplicity. For production, use secure, HTTP-only cookies.
- Input validation is performed server-side using `express-validator`.
- CORS is enabled for development; lock allowed origins in production.

## Next steps you may want
- Migrate client token storage from `localStorage` to secure cookies.
- Add rate limiting and request logging.
- Harden error messages in production (avoid leaking internal details).

If you want, I can prepare a more detailed Render deployment guide or a `Procfile`/CI configuration.
