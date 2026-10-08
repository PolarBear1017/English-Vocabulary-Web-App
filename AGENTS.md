# Project workflow

The frontend is in `vocab-app/`. Install the root and frontend dependencies with `npm ci` in each directory. Run the frontend tests with `npm --prefix vocab-app test -- --run` and build with `npm run build`.

## Supabase changes

Read `supabase/README.md` before database or Edge Function work. The configured cloud project is `qucyaothykoxwluaezwh`. Check the actual CLI login/link and migration history rather than assuming the machine is still configured from the documentation.

Database schema, SQL function/RPC and RLS changes belong in timestamped `supabase/migrations/*.sql` files. The old files under `supabase/sql/` and `vocab-app/migration_*.sql` are references that may already have run; do not move them into pending migrations or execute them to establish a baseline.

Finish baseline capture and history reconciliation before the first database push. Test SQL changes in a development/local database when available. Use `npm run db:plan` to show pending migrations and `npm run db:push` to apply them when the user's task authorizes changes to the target environment. A dry run lists migrations; it is not a SQL execution test. Do not use a remote database reset for routine setup or migrations.

Use `npm run functions:deploy` for the `ai-dictionary` Edge Function when deployment is in the task's scope. Frontend changes, migrations and Edge Functions have separate deployment steps. Preserve the handler's user-token validation before cache or Groq access, including support for valid anonymous Auth sessions.

Credentials belong in the CLI's credential store or ignored local environment files. Never commit or print account access tokens, database passwords, service-role keys or secret API keys. The frontend Publishable key does not grant schema-management or deployment access.
