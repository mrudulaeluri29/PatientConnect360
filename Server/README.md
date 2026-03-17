# Server

This directory contains the backend for PatientConnect360 (Express + Prisma).

## Admin account setup

The application does **not** expose a public signup route for administrators.  An
admin user must be created manually.  Two mechanisms are provided:

1. **Seed script** – take a look at `src/scripts/createAdmin.ts`.  Run it with
   the appropriate environment variables set:

   ```powershell
   cd Server
   setx ADMIN_EMAIL "admin@example.com"
   setx ADMIN_USERNAME "admin"
   setx ADMIN_PASSWORD "SuperSecret123"
   npm run create-admin       # script is defined in package.json
   ```

   You can also pass `ADMIN_OVERWRITE=true` to reset an existing user.

2. **Automatic fallback** – the login endpoint (`POST /api/auth/login`) now
   checks whether there are any `ADMIN` users.  If none are found it will
   automatically create a development admin using the same `ADMIN_*` env
   variables (or fallbacks: `admin@local` / `admin` / `admin123`).  The
   credentials are logged to the console and, on the first login attempt, are
   returned in the JSON response for convenience.

   > **Note:** this behaviour is intended for local development only.  In a
   > production deployment you should always create an admin explicitly via the
   > seed script and **never** use predictable passwords.

## Logging in

- The frontends (mobile/web) call `/api/auth/login` with `emailOrUsername` and
  `password`.
- After a successful login the server issues an HTTP-only cookie named
  `auth` containing a JWT.  Users with the `ADMIN` role have access to the
  admin UI.

### Default development credentials

If you have not created an admin yet and the automatic fallback ran, the first
successful login will be possible with one of the following pairs (choose the
one matching your environment variables):

| Env var | Default value |
|---------|---------------|
| `ADMIN_EMAIL` | `admin@local` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `admin123` |

You can always override these by setting the corresponding environment
variables and rerunning the seed script.
