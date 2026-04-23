import { execSync } from 'child_process';

function runMigrations(): void {
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

runMigrations();
