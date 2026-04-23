import { PrismaClient } from '@prisma/client';

async function runMigrations(): Promise<void> {
  console.log('[migrate] Starting database migrations...');

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('[migrate] Connected to database');

    // Prisma migrate deploy é executado via CLI, não via client
    // Este script serve como wrapper para o Cloud Run Job
    const { execSync } = await import('child_process');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env },
    });

    console.log('[migrate] Migrations completed successfully');
  } catch (error) {
    console.error('[migrate] Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigrations().catch((err: unknown) => {
  console.error('[migrate] Fatal error:', err);
  process.exit(1);
});
