# Supabase development workflow

Target project: `qucyaothykoxwluaezwh`.
Run commands from the repository root. The CLI version is pinned in package.json and package-lock.json.

## Current setup status

- CLI and project commands are installed.
- Cloud account login and project linking are complete on this Windows user account.
- Remote migration history was inspected on 2026-10-08: it has no existing migrations.
- Docker Desktop 4.94.0 is installed for this Windows user. The Docker CLI is available, but the container engine is not running because WSL setup is incomplete.
- Capturing the schema baseline is pending WSL setup and a working Docker engine. The WSL administrator installation was cancelled at the Windows authorization step on 2026-10-08.
- Existing SQL files are historical references, not pending migrations.

The Publishable key in `vocab-app/.env.local` is for the frontend. It cannot deploy functions or manage the database schema. Do not put account access tokens, database passwords or service-role/secret keys in frontend files or Git.

## One-time setup

```powershell
npm ci
npm run supabase:login
npm run supabase:link
npm run db:migrations
```

Finish login in the official Supabase browser flow. Let the CLI store credentials in its native credential storage. If the CLI asks for a database password, enter it interactively in the local terminal, not in chat or command arguments.

Before the first database push, inspect the remote migration history. If it already has migrations, fetch and review them with `npm run supabase -- migration fetch --linked`. Capture the remaining current schema with `npm run db:pull -- initial_schema` and review the generated SQL and history update. Standard `db pull` needs a working Docker daemon.

### Windows setup still pending

Docker Desktop is installed under `%LOCALAPPDATA%\Programs\DockerDesktop`. WSL installation needs Windows administrator authorization. Finish the official WSL installation from an administrator terminal:

```powershell
wsl --install --no-distribution
wsl --version
```

Restart Windows if the installer asks for it, then start Docker Desktop. Reopen the development app/terminal so the new Docker PATH is inherited. Verify `docker info` reports a working server before running the baseline import. If it still reports a WSL or virtualization problem, inspect the actual Docker error before changing Windows features or BIOS settings.

The failed baseline attempt left an empty SQL file; that file was removed. No baseline SQL has been applied and no cloud tables or existing data have been changed by this setup.

Do not reapply the files in `supabase/sql/` or the old `vocab-app/migration_*.sql` files to initialize migrations. Do not use remote `db reset` to establish a baseline.

Confirm the baseline reflects existing tables, SQL functions, policies and relevant customizations to managed schemas. When the baseline is recorded as applied, `npm run db:plan` should show no pending baseline changes. Only then start new changes. Update the setup status above after verification.

## Database changes

```powershell
npm run db:new -- add_word_notes
# Edit the new timestamped SQL file under supabase/migrations/.
npm run db:plan
npm run db:push
```

`db:plan` is a dry run: it shows pending files but does not validate that their SQL will execute successfully. Test changes on a development database/local Supabase before applying them to live data. `db:push` checks the linked project, requires a baseline migration, shows the dry run first, then applies pending migrations and records their history.

SQL functions/RPCs, table changes and RLS policies belong in migration files. Keep published migration files unchanged; make corrections in a new migration.

## Edge Functions

Edit `supabase/functions/ai-dictionary/`, run appropriate tests, then:

```powershell
npm run functions:deploy
```

This uses server-side bundling (`--use-api`), so deploying the function does not need Docker. It deploys only `ai-dictionary` to the configured cloud project; it does not deploy the frontend. The function validates session JWTs via Supabase Auth, including anonymous users, before reading its cache or calling Groq. Its `verify_jwt = false` setting delegates verification to that handler.

## Assigning work from a phone

Pair ChatGPT mobile with the desktop host separately. Keep the host awake, online and the desktop app running. Open this repository as the task project.

Example task: "Add a notes field for vocabulary. Inspect the existing schema and migrations, implement the frontend and migration, test on the development database, show the migration plan, and apply it to the named target environment."

Once account access and the baseline are configured on the host, Codex can run these commands there. Choose the target environment explicitly for database changes; deleting data or changing a live schema needs the corresponding task authorization. GitHub push alone does not deploy database migrations or Edge Functions.
