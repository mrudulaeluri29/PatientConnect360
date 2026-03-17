# Scripts Setup Guide

This guide explains how teammates can configure local backend environment variables using:

- `scripts/set_env.ps1`

It is written for Windows + PowerShell.

## 1) Before you start

- Clone the repository.
- Open a terminal in the project root:
  - `D:\PatientConnect360\Repo\PatientConnect360`
- Make sure Node.js and npm are installed.

Optional but recommended:
- Keep your backend credentials ready (database URL, admin account values).
- Keep Twilio credentials ready only if you want OTP/email verification flows.

## 2) Run the setup script

From the repo root, run:

```powershell
.\scripts\set_env.ps1
```

If PowerShell blocks script execution, run this once in the same terminal and retry:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

## 3) What the script creates

The script creates or overwrites:

- `Server/.env`

It also attempts to apply restrictive file permissions (ACLs) so only your user can access the file.

## 4) Prompt-by-prompt instructions

Use this section while answering each prompt.

### Core fields (recommended for everyone)

- `DATABASE_URL`
  - Required for backend DB connection.
  - Azure PostgreSQL Flexible Server format:
  - `postgresql://<username>:<password>@pc360-db-2026.postgres.database.azure.com:5432/<database>?schema=public&sslmode=require`
- `PORT`
  - Usually keep default: `4000`
- `NODE_ENV`
  - Use `development` for local setup.
- `JWT_SECRET`
  - Choose auto-generate when prompted (`Y`) unless your team gave you a fixed value.

### Twilio fields (optional)

Leave blank if you do not need OTP/email features locally.

- `TWILIO_ACCOUNT_SID` (starts with `AC`)
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID` (starts with `VA`)

If blank:
- Backend still starts normally.
- OTP-based signup/password reset endpoints will not function.

### Legacy email fields (optional)

These are included for compatibility and can be blank if unused:

- `SENDGRID_API_KEY`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME` (defaults to `MediHealth`)
- `COOKIE_NAME` (defaults to `auth`)

### Admin fields (recommended)

Used by admin seeding/default admin behavior:

- `ADMIN_EMAIL` (default `admin@example.com`)
- `ADMIN_USERNAME` (default `admin`)
- `ADMIN_PASSWORD`
  - Hidden input.
  - If left blank, script uses `AdminPass!2026` (change this after first run).
- `ADMIN_OVERWRITE` (default `false`)
- `ADMIN_DISPLAY_NAME` (default `Platform Admin`)
- `ADMIN_PHONE` (optional)
- `ADMIN_SUPER` (default `true`)

## 5) Example minimum local setup

If you only want the app running without OTP/email flows:

- Set `DATABASE_URL`, `PORT`, `NODE_ENV`, `JWT_SECRET`
- Set `ADMIN_*` values
- Leave `TWILIO_*`, `SENDGRID_API_KEY`, and `SMTP_*` blank

## 6) Start the backend after setup

From `Server/`:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

If using a fresh local DB and your team prefers development migrations, use:

```powershell
npx prisma migrate dev
```

## 7) Verify health endpoints

Once server is running:

- API health: `http://localhost:4000/health`
- DB ping: `http://localhost:4000/db/ping`

Expected:
- Health returns `ok: true`
- DB ping returns `db: "ok"`

## 8) Security notes

- Never commit `Server/.env`.
- Do not share secrets in chat, screenshots, or commits.
- Rotate credentials if accidentally exposed.

