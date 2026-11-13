# SkillTrack

SkillTrack is a student skill portfolio and faculty review application. Students can submit skills with links to evidence, track decisions, and resubmit rejected work. Faculty can review only submissions from students in their own department.

## Requirements

- Node.js 20.19+ or 22.12+
- PostgreSQL (Neon is supported)
- npm

## Configure PostgreSQL

Create a PostgreSQL database and set its connection string in `server/.env`. For Neon, use the pooled connection string for the running API and a direct connection if Prisma migrations require it.

```powershell
cd server
Copy-Item .env.example .env -Force
```

Set `DATABASE_URL` and a private, random `JWT_SECRET` of at least 32 characters in `server/.env`. The `.env` file is ignored by Git and must never be committed. Public registration creates student accounts only; faculty accounts must be provisioned by the administrator (the seed script creates a local demo faculty account). This prevents clients from choosing a faculty role or department.

## Install dependencies

```powershell
cd client
npm install
cd ..\server
npm install
npm run db:generate
```

### Existing database created manually

If the database already has the four SkillTrack tables and enums, do not run `migrate dev` before baselining. The checked-in `server/prisma/migrations/0_baseline/migration.sql` describes the existing schema, including the review-status check constraint. It is for new databases and must not be executed against a database where these objects already exist.

The Prisma model should match the existing database before you record a baseline. To verify that, run from `server`:

```powershell
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

For this project, the expected result is `-- This is an empty migration.` (Prisma does not introspect/check the custom `chk_review_status` constraint, so verify that constraint separately if your database was created manually).

After backing up and reviewing the baseline SQL, and confirming the live diff is empty, the following command records the baseline as already applied:

```powershell
npx prisma migrate resolve --applied 0_baseline
```

This adds a row to Prisma's `_prisma_migrations` history table; it does not execute the baseline SQL or modify the four application tables. Do not use this command unless the existing schema has been verified to match the baseline. Then initialize the demo data and use `npm run db:migrate` for future schema changes:

```powershell
npm run seed
```

### New, empty database

For a brand-new empty database, create and apply the initial migration, then seed it:

```powershell
npm run db:migrate
npm run seed
```

The seed command creates the department list and demo accounts:

- Student: `student1@skilltrack.com` / `student123`
- Faculty: `faculty@skilltrack.com` / `faculty123`

These are development-only credentials; replace or remove them before deployment. The seed script refuses to run when `NODE_ENV=production`.

## Run locally

Open two terminals from the project directory:

```powershell
cd server
npm run dev
```

```powershell
cd client
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). Configure `CLIENT_ORIGIN` in `server/.env` if the frontend uses a different origin. The API health check is at `http://localhost:5000/api/health`.

## Verification

```powershell
cd client
npm run lint
npm run build
cd ..\server
npx prisma validate
```

## Access controls

The API derives identities and roles from verified JWTs and reloads the user from the database. Student skill reads and edits are scoped to the authenticated student. Faculty lists, department statistics, skill details, and review transactions are scoped to the authenticated faculty member's database-assigned department. Department IDs and roles from request bodies are not used to grant access.

Faculty review decisions and review history are written transactionally. A rejected skill can be edited only by its owner; resubmission returns it to `PENDING` while retaining prior review records.
