FROM node:20-alpine AS base
# Sharp a Prisma potřebují na Alpine glibc kompatibilitu.
# (Původně tu bylo `apk add --no-libc-compat libc6-compat` – neplatný přepínač, build padal.)
RUN apk add --no-cache libc6-compat openssl

# Stahování stovek balíků z kontejneru padalo na ECONNRESET. Rozhodující je
# `maxsockets` – npm ve výchozím stavu otevírá 15 souběžných spojení a přes
# Docker NAT je část z nich shozena. Se třemi spojeními projde build spolehlivě,
# jen o něco pomaleji. Retry hodnoty jsou pojistka na zbylé výpadky.
ENV npm_config_maxsockets=3
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000

# ---------- 1. Všechny závislosti (vč. dev) pro build ----------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
# Schválně `npm install`, ne `npm ci`.
# package-lock.json vzniká na Windows a neobsahuje platformní balíky pro Linux
# (@img/sharp-linuxmusl-x64 a spol.), takže `npm ci` tady spadne na "lock není
# v souladu s package.json". `npm install` lock respektuje a chybějící platformní
# varianty doplní. Pro plně deterministický build by se lock musel generovat
# uvnitř téhle image.
RUN npm install --no-audit --no-fund

# ---------- 2. Build: Prisma client + Next.js + worker ----------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `npm run build` = prisma generate + next build + tsc workeru do dist/
RUN npm run build

# ---------- 3. Produkční závislosti (bez dev) ----------
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install --omit=dev --no-audit --no-fund && npx prisma generate

# ---------- 4. Runtime image (společný pro `web` i `worker`) ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Písmo pro PDF faktury. Standardní fonty v PDF neumí českou diakritiku,
# bez tohohle by na dokladu byly místo ř/š/ž otazníky.
COPY --from=builder --chown=nextjs:nodejs /app/assets ./assets
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# Plné produkční node_modules – standalone si nese jen to, co si Next vytrasoval
# pro web; worker navíc potřebuje sharp, pg-boss a Prisma CLI na `migrate deploy`.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Sdílené úložiště fotek: storage/tmp = originály čekající na zpracování,
# public/uploads = hotové WebP varianty. Obojí je v compose namountované jako volume.
RUN mkdir -p public/uploads storage/tmp storage/faktury \
 && chown -R nextjs:nodejs public/uploads storage

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# `web` použije tenhle výchozí příkaz, `worker` si ho v compose přepíše.
CMD ["node", "server.js"]
