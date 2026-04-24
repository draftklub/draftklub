# ═══════════════════════════════════════
# Stage 1: deps
# ═══════════════════════════════════════
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/sport-strategies/package.json ./packages/sport-strategies/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @draftklub/api...

# ═══════════════════════════════════════
# Stage 2: builder
# ═══════════════════════════════════════
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

RUN pnpm --filter @draftklub/sport-strategies build
RUN cd apps/api && pnpm prisma generate
RUN cd apps/api && pnpm build

# ═══════════════════════════════════════
# Stage 3: runner
# ═══════════════════════════════════════
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copia root node_modules (inclui .pnpm store com cliente Prisma gerado)
# e apps/api/node_modules (symlinks para o pnpm store)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder --chown=nestjs:nodejs /app/packages/sport-strategies/package.json ./packages/sport-strategies/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/sport-strategies/dist ./packages/sport-strategies/dist

WORKDIR /app/apps/api

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
