import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'draftklub-dev' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const SEED_PASSWORD = 'DraftKlub@Seed2026!';

const USERS = [
  { email: 'admin@tennis-carioca.com', name: 'Admin Tennis Carioca', role: 'KLUB_ADMIN' },
  { email: 'comissao@tennis-carioca.com', name: 'Comissão Tênis', role: 'SPORTS_COMMITTEE' },
  { email: 'prof.carlos@tennis-carioca.com', name: 'Prof. Carlos', role: 'TEACHER' },
  { email: 'joao@player.com', name: 'João Silva', role: 'PLAYER' },
  { email: 'maria@player.com', name: 'Maria Santos', role: 'PLAYER' },
  { email: 'pedro@player.com', name: 'Pedro Costa', role: 'PLAYER' },
  { email: 'ana@player.com', name: 'Ana Lima', role: 'PLAYER' },
  { email: 'lucas@player.com', name: 'Lucas Ferreira', role: 'PLAYER' },
];

async function createFirebaseUser(email: string, displayName: string): Promise<string> {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    return existing.uid;
  } catch {
    const created = await admin.auth().createUser({
      email,
      password: SEED_PASSWORD,
      displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function main(): Promise<void> {
  console.log('Starting seed...');

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  console.log('Creating Klub...');
  await prisma.klub.upsert({
    where: { id: KLUB_ID },
    create: {
      id: KLUB_ID,
      name: 'Tennis Club Carioca',
      slug: 'tennis-club-carioca',
      type: 'sports_club',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'BR',
      timezone: 'America/Sao_Paulo',
      email: 'contato@tenniscarioca.com.br',
      phone: '+5521999990000',
      plan: 'trial',
      status: 'trial',
      trialEndsAt,
      onboardingSource: 'sales_led',
      config: {
        create: {
          bookingPolicy: 'members_only',
          cancellationWindowHours: 24,
          openingHour: 7,
          closingHour: 22,
          openDays: '1,2,3,4,5,6,7',
        },
      },
      sportProfiles: {
        createMany: {
          data: [
            { sportCode: 'tennis', status: 'active', defaultRatingEngine: 'elo' },
            { sportCode: 'squash', status: 'active', defaultRatingEngine: 'win_loss' },
          ],
          skipDuplicates: true,
        },
      },
      sportInterests: {
        create: { sportName: 'padel' },
      },
    },
    update: {
      name: 'Tennis Club Carioca',
    },
  });
  console.log('Klub created');

  console.log('Creating spaces...');
  const spaces = [
    { name: 'Quadra 1', sportCode: 'tennis', surface: 'clay', indoor: false, hasLighting: true },
    { name: 'Quadra 2', sportCode: 'tennis', surface: 'clay', indoor: false, hasLighting: true },
    { name: 'Quadra 3', sportCode: 'squash', surface: 'synthetic', indoor: true, hasLighting: true },
  ];

  for (let i = 0; i < spaces.length; i++) {
    const space = spaces[i];
    if (!space) continue;
    await prisma.space.upsert({
      where: { id: `00000000-0000-0000-0001-${i.toString().padStart(12, '0')}` },
      create: {
        id: `00000000-0000-0000-0001-${i.toString().padStart(12, '0')}`,
        klubId: KLUB_ID,
        name: space.name,
        type: 'court',
        sportCode: space.sportCode,
        surface: space.surface,
        indoor: space.indoor,
        hasLighting: space.hasLighting,
        maxPlayers: space.sportCode === 'squash' ? 2 : 4,
        status: 'active',
      },
      update: { name: space.name },
    });
  }
  console.log('Spaces created');

  console.log('Creating users...');

  const testUser = await prisma.user.findUnique({ where: { email: 'test@draftklub.com' } });
  if (testUser) {
    await prisma.membership.upsert({
      where: { userId_klubId: { userId: testUser.id, klubId: KLUB_ID } },
      create: { userId: testUser.id, klubId: KLUB_ID, type: 'member', status: 'active' },
      update: {},
    });
    console.log('test@draftklub.com linked to Klub');
  }

  for (const userData of USERS) {
    const firebaseUid = await createFirebaseUser(userData.email, userData.name);

    const user = await prisma.user.upsert({
      where: { firebaseUid },
      create: {
        firebaseUid,
        email: userData.email,
        fullName: userData.name,
      },
      update: { fullName: userData.name },
    });

    await prisma.membership.upsert({
      where: { userId_klubId: { userId: user.id, klubId: KLUB_ID } },
      create: { userId: user.id, klubId: KLUB_ID, type: 'member', status: 'active' },
      update: {},
    });

    if (userData.role !== 'PLAYER') {
      const existingRole = await prisma.roleAssignment.findFirst({
        where: { userId: user.id, scopeKlubId: KLUB_ID, role: userData.role },
      });

      if (!existingRole) {
        await prisma.roleAssignment.create({
          data: {
            userId: user.id,
            role: userData.role,
            scopeKlubId: KLUB_ID,
            scopeSportId: null,
          },
        });
      }
    }

    console.log(`${userData.email} (${userData.role})`);
  }

  console.log('Creating rankings...');
  const tennisProfile = await prisma.klubSportProfile.findUnique({
    where: { klubId_sportCode: { klubId: KLUB_ID, sportCode: 'tennis' } },
  });

  if (tennisProfile) {
    const RANKING_OPEN_ID = '00000000-0000-0000-0002-000000000001';
    const RANKING_MASC_ID = '00000000-0000-0000-0002-000000000002';

    const rankingOpen = await prisma.klubSportRanking.upsert({
      where: { id: RANKING_OPEN_ID },
      create: {
        id: RANKING_OPEN_ID,
        klubSportId: tennisProfile.id,
        name: 'Ranking Open',
        type: 'singles',
        gender: null,
        ratingEngine: 'elo',
        ratingConfig: { kFactor: 32, kFactorHigh: 16, kThreshold: 1400, initialRating: 1000 },
        initialRating: 1000,
      },
      update: {},
    });

    const rankingMasc = await prisma.klubSportRanking.upsert({
      where: { id: RANKING_MASC_ID },
      create: {
        id: RANKING_MASC_ID,
        klubSportId: tennisProfile.id,
        name: 'Ranking Masculino Simples',
        type: 'singles',
        gender: 'M',
        ratingEngine: 'elo',
        ratingConfig: { kFactor: 32, kFactorHigh: 16, kThreshold: 1400, initialRating: 1000 },
        initialRating: 1000,
      },
      update: {},
    });

    console.log('Tennis rankings created');

    const malePlayerEmails = ['joao@player.com', 'pedro@player.com', 'lucas@player.com'];
    for (const email of malePlayerEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) continue;

      await prisma.playerRankingEntry.upsert({
        where: { rankingId_userId: { rankingId: rankingOpen.id, userId: user.id } },
        create: {
          rankingId: rankingOpen.id,
          userId: user.id,
          rating: 1000,
          ratingSource: 'initial',
        },
        update: {},
      });

      await prisma.playerRankingEntry.upsert({
        where: { rankingId_userId: { rankingId: rankingMasc.id, userId: user.id } },
        create: {
          rankingId: rankingMasc.id,
          userId: user.id,
          rating: 1000,
          ratingSource: 'initial',
        },
        update: {},
      });
    }

    const femalePlayerEmails = ['maria@player.com', 'ana@player.com'];
    for (const email of femalePlayerEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) continue;
      await prisma.playerRankingEntry.upsert({
        where: { rankingId_userId: { rankingId: rankingOpen.id, userId: user.id } },
        create: {
          rankingId: rankingOpen.id,
          userId: user.id,
          rating: 1000,
          ratingSource: 'initial',
        },
        update: {},
      });
    }

    console.log('Players enrolled in rankings');
  }

  console.log('Seed completed!');
  console.log('');
  console.log('Credentials (password: DraftKlub@Seed2026!):');
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(20)} ${u.email}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
