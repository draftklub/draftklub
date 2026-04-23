# ═══════════════════════════════════════
# Stage 1: deps
# ═══════════════════════════════════════
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

COPY package.json pnpm-workspace.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile --filter @draftklub/worker...

# ═══════════════════════════════════════
# Stage 2: builder
# ═══════════════════════════════════════
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY . .

RUN cd apps/worker && pnpm build

# ═══════════════════════════════════════
# Stage 3: runner
# ═══════════════════════════════════════
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/worker/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/worker/node_modules ./node_modules

USER nestjs

CMD ["node", "dist/worker"]
