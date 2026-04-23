import { execSync } from 'child_process';

async function runMigrations(): Promise<void> {
  console.log('[migrate] Starting database migrations...');

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env },
    });

    console.log('[migrate] Migrations completed successfully');
  } catch (error) {
    console.error('[migrate] Migration failed:', error);
    process.exit(1);
  }
}

runMigrations().catch((err: unknown) => {
  console.error('[migrate] Fatal error:', err);
  process.exit(1);
});
