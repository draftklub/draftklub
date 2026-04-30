import type { $Enums } from '@prisma/client';
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
  { email: 'comissao@tennis-carioca.com', name: 'Comissão Tênis', role: 'SPORT_COMMISSION' },
  { email: 'staff@tennis-carioca.com', name: 'Staff Quadra', role: 'SPORT_STAFF' },
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
      plan: 'trial',
      status: 'trial',
      onboardingSource: 'sales_led',
      contact: {
        create: {
          city: 'Rio de Janeiro',
          state: 'RJ',
          country: 'BR',
          timezone: 'America/Sao_Paulo',
          email: 'contato@tenniscarioca.com.br',
          phone: '+5521999990000',
        },
      },
      billing: {
        create: {
          trialEndsAt,
        },
      },
      config: {
        create: {
          bookingPolicy: 'members_only',
          accessMode: 'members_only',
          bookingModes: ['direct', 'staff_approval'],
          cancellationMode: 'with_deadline',
          cancellationWindowHours: 24,
          agendaVisibility: 'public',
          openingHour: 7,
          closingHour: 22,
          openDays: '1,2,3,4,5,6,7',
          extensionMode: 'player',
          guestsAddedBy: 'both',
          tournamentBookingConflictMode: 'staff_decides',
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
      config: {
        update: {
          bookingPolicy: 'members_only',
          accessMode: 'members_only',
          bookingModes: ['direct', 'staff_approval'],
          cancellationMode: 'with_deadline',
          cancellationWindowHours: 24,
          agendaVisibility: 'public',
          openingHour: 7,
          closingHour: 22,
          openDays: '1,2,3,4,5,6,7',
          maxRecurrenceMonths: 3,
          extensionMode: 'player',
          guestsAddedBy: 'both',
          tournamentBookingConflictMode: 'staff_decides',
        },
      },
    },
  });
  console.log('Klub created');

  console.log('Creating spaces...');
  const spaces = [
    { name: 'Quadra 1', sportCode: 'tennis', surface: 'clay', indoor: false, hasLighting: true },
    { name: 'Quadra 2', sportCode: 'tennis', surface: 'clay', indoor: false, hasLighting: true },
    {
      name: 'Quadra 3',
      sportCode: 'squash',
      surface: 'synthetic',
      indoor: true,
      hasLighting: true,
    },
  ];

  const HOUR_BANDS_TENNIS = [
    {
      type: 'off_peak',
      startHour: 6,
      endHour: 12,
      daysOfWeek: [1, 2, 3, 4, 5],
      durationByMatchType: { singles: 60, doubles: 90 },
    },
    {
      type: 'regular',
      startHour: 12,
      endHour: 17,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      durationByMatchType: { singles: 60, doubles: 90 },
    },
    {
      type: 'prime',
      startHour: 17,
      endHour: 22,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      durationByMatchType: { singles: 60 },
    },
  ];

  for (let i = 0; i < spaces.length; i++) {
    const space = spaces[i];
    if (!space) continue;
    const hourBands = space.sportCode === 'tennis' ? HOUR_BANDS_TENNIS : [];
    const allowedMatchTypes = space.sportCode === 'squash' ? ['singles'] : ['singles', 'doubles'];
    await prisma.space.upsert({
      where: { id: `00000000-0000-0000-0001-${i.toString().padStart(12, '0')}` },
      create: {
        id: `00000000-0000-0000-0001-${i.toString().padStart(12, '0')}`,
        klubId: KLUB_ID,
        name: space.name,
        type: 'court',
        sportCode: space.sportCode,
        surface: space.surface as $Enums.SpaceSurface,
        indoor: space.indoor,
        hasLighting: space.hasLighting,
        maxPlayers: space.sportCode === 'squash' ? 2 : 4,
        status: 'active',
        slotGranularityMinutes: 30,
        hourBands,
        allowedMatchTypes,
      },
      update: { name: space.name, hourBands, allowedMatchTypes },
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

    console.log(`${userData.email} (${userData.role})`);
  }

  console.log('Creating tennis enrollments for players (W2.3)...');
  const tennisProfileForEnrollment = await prisma.klubSportProfile.findUnique({
    where: { klubId_sportCode: { klubId: KLUB_ID, sportCode: 'tennis' } },
  });
  const adminTennisCarioca = await prisma.user.findUnique({
    where: { email: 'admin@tennis-carioca.com' },
  });
  if (tennisProfileForEnrollment) {
    const playerEmails = [
      'joao@player.com',
      'pedro@player.com',
      'lucas@player.com',
      'maria@player.com',
      'ana@player.com',
    ];
    const approvedById = adminTennisCarioca?.id ?? null;

    for (const email of playerEmails) {
      const player = await prisma.user.findUnique({ where: { email } });
      if (!player) continue;
      await prisma.playerSportEnrollment.upsert({
        where: {
          userId_klubSportProfileId: {
            userId: player.id,
            klubSportProfileId: tennisProfileForEnrollment.id,
          },
        },
        create: {
          userId: player.id,
          klubSportProfileId: tennisProfileForEnrollment.id,
          status: 'active',
          approvedById,
          approvedAt: new Date(),
        },
        update: {
          status: 'active',
          approvedById,
          approvedAt: new Date(),
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
          cancelledAt: null,
          cancelledById: null,
        },
      });
    }
    console.log(`  ${playerEmails.length} players enrolled (active) on tennis`);
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
        gender: 'male',
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

    console.log('Creating points schema + tournament...');
    const POINTS_SCHEMA_ID = '00000000-0000-0000-0003-000000000001';
    const pointsSchema = await prisma.rankingPointsSchema.upsert({
      where: { id: POINTS_SCHEMA_ID },
      create: {
        id: POINTS_SCHEMA_ID,
        klubSportId: tennisProfile.id,
        name: 'Pontuação Padrão',
        description: 'Pontuação padrão para torneios regulares',
        points: {
          champion: 100,
          runner_up: 70,
          semi_final: 40,
          quarter_final: 20,
          round_of_16: 10,
          first_round: 3,
          participation: 1,
        },
      },
      update: {},
    });
    console.log('Points schema created');

    const TOURNAMENT_ID = '00000000-0000-0000-0004-000000000001';
    const now = new Date();
    const regOpen = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const regClose = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const drawDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const mainStart = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const mainEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    await prisma.tournament.upsert({
      where: { id: TOURNAMENT_ID },
      create: {
        id: TOURNAMENT_ID,
        klubSportId: tennisProfile.id,
        rankingId: rankingOpen.id,
        name: 'Torneio Piloto Tennis Club Carioca',
        description: 'Primeiro torneio do Tennis Club Carioca',
        format: 'knockout',
        hasPrequalifiers: false,
        registrationApproval: 'auto',
        registrationOpensAt: regOpen,
        registrationClosesAt: regClose,
        drawDate: drawDate,
        mainStartDate: mainStart,
        mainEndDate: mainEnd,
        status: 'draft',
        categories: {
          create: [
            {
              name: 'A',
              order: 0,
              minRatingExpected: 1200,
              maxRatingExpected: 9999,
              pointsSchemaId: pointsSchema.id,
            },
            {
              name: 'B',
              order: 1,
              minRatingExpected: 900,
              maxRatingExpected: 1199,
              pointsSchemaId: pointsSchema.id,
            },
            {
              name: 'C',
              order: 2,
              minRatingExpected: 0,
              maxRatingExpected: 899,
              pointsSchemaId: pointsSchema.id,
            },
          ],
        },
      },
      update: {},
    });
    console.log('Tournament created');

    const PREQUALIFIER_TOURNAMENT_ID = '00000000-0000-0000-0004-000000000002';
    await prisma.tournament.upsert({
      where: { id: PREQUALIFIER_TOURNAMENT_ID },
      create: {
        id: PREQUALIFIER_TOURNAMENT_ID,
        klubSportId: tennisProfile.id,
        rankingId: rankingOpen.id,
        name: 'Torneio com Pré-Classificatórios',
        description: 'Torneio piloto com pré-classificatórios entre categorias',
        format: 'knockout',
        hasPrequalifiers: true,
        prequalifierBordersPerFrontier: 1,
        registrationApproval: 'auto',
        resultReportingMode: 'committee_only',
        registrationOpensAt: now,
        registrationClosesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        drawDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        prequalifierStartDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
        prequalifierEndDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        mainStartDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
        mainEndDate: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
        status: 'draft',
        categories: {
          create: [
            {
              name: 'A',
              order: 0,
              minRatingExpected: 1000,
              maxRatingExpected: 9999,
              pointsSchemaId: pointsSchema.id,
            },
            {
              name: 'B',
              order: 1,
              minRatingExpected: 0,
              maxRatingExpected: 999,
              pointsSchemaId: pointsSchema.id,
            },
          ],
        },
      },
      update: {},
    });
    console.log('Prequalifier tournament created');
  }

  console.log('Creating sample bookings...');
  const court1 = await prisma.space.findFirst({
    where: { klubId: KLUB_ID, sportCode: 'tennis' },
    orderBy: { name: 'asc' },
  });
  const joao = await prisma.user.findUnique({ where: { email: 'joao@player.com' } });
  const pedro = await prisma.user.findUnique({ where: { email: 'pedro@player.com' } });

  if (court1 && joao && pedro) {
    const tomorrow = new Date(Date.now() + 24 * 3_600_000);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const BOOKING_ID_1 = '00000000-0000-0000-0005-000000000001';
    await prisma.booking.upsert({
      where: { id: BOOKING_ID_1 },
      create: {
        id: BOOKING_ID_1,
        klubId: KLUB_ID,
        spaceId: court1.id,
        startsAt: tomorrow,
        endsAt: new Date(tomorrow.getTime() + 60 * 60_000),
        matchType: 'singles',
        bookingType: 'player_match',
        creationMode: 'direct',
        status: 'confirmed',
        primaryPlayerId: joao.id,
        otherPlayers: [{ userId: pedro.id, name: 'Pedro Costa' }],
        createdById: joao.id,
        approvedById: joao.id,
        approvedAt: new Date(),
      },
      update: {},
    });
    console.log('Sample bookings created');

    const SERIES_ID = '00000000-0000-0000-0006-000000000001';
    const seriesStart = new Date(Date.now() + 48 * 3_600_000);
    seriesStart.setUTCHours(0, 0, 0, 0);
    const seriesEnd = new Date(seriesStart.getTime() + 28 * 24 * 3_600_000);
    await prisma.bookingSeries.upsert({
      where: { id: SERIES_ID },
      create: {
        id: SERIES_ID,
        klubId: KLUB_ID,
        spaceId: court1.id,
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [2, 4],
        startsOn: seriesStart,
        endsOn: seriesEnd,
        durationMinutes: 60,
        startHour: 19,
        startMinute: 0,
        bookingType: 'player_match',
        primaryPlayerId: joao.id,
        otherPlayers: [{ userId: pedro.id, name: 'Pedro Costa' }],
        createdById: joao.id,
      },
      update: {},
    });
    console.log('Sample booking series created');

    // ─── Guest user de exemplo + booking com guest ───────────
    const GUEST_ID = '00000000-0000-0001-0001-000000000099';
    const guest = await prisma.user.upsert({
      where: { id: GUEST_ID },
      create: {
        id: GUEST_ID,
        email: 'guest.example@external.com',
        fullName: 'Carlos Silva (guest)',
        kind: 'guest',
        documentNumber: '12345678900',
        documentType: 'cpf',
        firebaseUid: null,
      },
      update: {},
    });

    const GUEST_BOOKING_ID = '00000000-0000-0000-0005-000000000003';
    const guestBookingDate = new Date(Date.now() + 3 * 24 * 3_600_000);
    guestBookingDate.setUTCHours(13, 0, 0, 0);
    await prisma.booking.upsert({
      where: { id: GUEST_BOOKING_ID },
      create: {
        id: GUEST_BOOKING_ID,
        klubId: KLUB_ID,
        spaceId: court1.id,
        startsAt: guestBookingDate,
        endsAt: new Date(guestBookingDate.getTime() + 60 * 60_000),
        matchType: 'singles',
        bookingType: 'player_match',
        creationMode: 'direct',
        status: 'confirmed',
        primaryPlayerId: joao.id,
        otherPlayers: [{ userId: guest.id, name: guest.fullName }],
        responsibleMemberId: joao.id,
        notes: 'Singles com convidado externo',
        createdById: joao.id,
        approvedById: joao.id,
        approvedAt: new Date(),
      },
      update: {},
    });
    console.log('Guest user + booking with guest created');
  }

  const court2 = await prisma.space.findFirst({
    where: { klubId: KLUB_ID, sportCode: 'tennis', name: { contains: '2' } },
  });
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@tennis-carioca.com' },
  });
  if (court2 && adminUser) {
    const BLOCK_ID = '00000000-0000-0000-0005-000000000002';
    const blockStart = new Date(Date.now() + 48 * 3_600_000);
    blockStart.setUTCHours(14, 0, 0, 0);
    const blockEnd = new Date(blockStart.getTime() + 4 * 3_600_000);
    await prisma.booking.upsert({
      where: { id: BLOCK_ID },
      create: {
        id: BLOCK_ID,
        klubId: KLUB_ID,
        spaceId: court2.id,
        startsAt: blockStart,
        endsAt: blockEnd,
        bookingType: 'maintenance',
        creationMode: 'staff_assisted',
        status: 'confirmed',
        primaryPlayerId: null,
        otherPlayers: [],
        notes: 'Troca de piso (seed)',
        createdById: adminUser.id,
        approvedById: adminUser.id,
        approvedAt: new Date(),
      },
      update: {},
    });
    console.log('Sample maintenance block created');
  }

  // ─── Feature gates ─────────────────────────────────────────────────────
  console.log('Seeding feature gates...');

  const FEATURES = [
    // ── Core (always-free, always on) ──────────────────────────────────
    {
      id: 'basic_reservations',
      displayName: 'Reservas',
      description: 'Criação e gestão de reservas de quadra',
      tier: 'free',
      enabled: true,
    },
    {
      id: 'tournament_view',
      displayName: 'Visualização de torneios',
      description: 'Ver torneios inscritos, schedules e resultados',
      tier: 'free',
      enabled: true,
    },
    {
      id: 'rankings_view',
      displayName: 'Rankings',
      description: 'Consultar rankings e pontuações de modalidades',
      tier: 'free',
      enabled: true,
    },
    {
      id: 'membership_request',
      displayName: 'Solicitação de entrada em Klub',
      description: 'Solicitar entrada em Klubs privados',
      tier: 'free',
      enabled: true,
    },
    // ── Premium features ────────────────────────────────────────────────
    {
      id: 'advanced_stats',
      displayName: 'Estatísticas avançadas',
      description: 'Métricas detalhadas de desempenho por jogador',
      tier: 'premium',
      enabled: true,
    },
    {
      id: 'ai_match_suggestions',
      displayName: 'Sugestões de partida por IA',
      description: 'Recomendações automáticas baseadas em histórico',
      tier: 'premium',
      enabled: true,
    },
    {
      id: 'booking_extensions',
      displayName: 'Extensão de reserva',
      description: 'Solicitar extensão de tempo de quadra pelo jogador',
      tier: 'premium',
      enabled: true,
    },
    {
      id: 'tournament_creation',
      displayName: 'Criação de torneios',
      description: 'Criar e gerenciar torneios pelo Klub Admin',
      tier: 'premium',
      enabled: true,
    },
  ] as const;

  for (const f of FEATURES) {
    await prisma.feature.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        displayName: f.displayName,
        description: f.description,
        tier: f.tier,
        enabled: f.enabled,
        rolloutPct: 100,
      },
      update: {
        displayName: f.displayName,
        description: f.description,
      },
    });
  }
  console.log(`Feature gates seeded (${FEATURES.length} features)`);

  console.log('Seed completed!');
  console.log('');
  console.log('Credentials (password: DraftKlub@Seed2026!):');
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(20)} ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
