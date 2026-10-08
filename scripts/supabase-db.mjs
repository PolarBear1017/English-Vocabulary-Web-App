import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const projectRef = 'qucyaothykoxwluaezwh';
const action = process.argv[2];

if (!['plan', 'push'].includes(action) || process.argv.length !== 3) {
  console.error('Usage: npm run db:plan or npm run db:push');
  process.exit(1);
}

try {
  const linkedRef = readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim();
  if (linkedRef !== projectRef) throw new Error('Linked project does not match this app. Run npm run supabase:link.');
  const migrations = readdirSync(path.join(root, 'supabase/migrations'));
  if (!migrations.some((name) => /^\d{14}_initial_schema\.sql$/.test(name)
    && readFileSync(path.join(root, 'supabase/migrations', name), 'utf8').trim().length > 0)) {
    throw new Error('No database baseline exists yet. Capture and review the remote migration history/schema first; see supabase/README.md.');
  }
} catch (error) {
  console.error(`Database command stopped: ${error.message}`);
  process.exit(1);
}

const cli = path.join(root, 'node_modules/supabase/dist/supabase.js');
const run = (args) => {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Always show pending changes before applying migrations to the linked project.
run(['db', 'push', '--linked', '--dry-run']);
if (action === 'push') run(['db', 'push', '--linked']);
