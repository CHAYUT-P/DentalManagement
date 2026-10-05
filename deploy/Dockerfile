# Denta Kids — the website + backend as one container (Next.js standalone).
# Built on the VPS by deploy/docker-compose.yml; nothing here is secret.

FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/staff-desktop/package.json apps/staff-desktop/package.json
# only the website's packages — not the desktop app's
RUN pnpm install --frozen-lockfile --filter dentalweb

FROM deps AS build
COPY . .
# LIFF id is baked into the browser bundle at build time
ARG NEXT_PUBLIC_LIFF_ID=""
ENV NEXT_PUBLIC_LIFF_ID=$NEXT_PUBLIC_LIFF_ID \
    NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=1 \
    # the build imports server modules; nothing connects to this
    DATABASE_URL=postgres://build:build@localhost:5432/build
RUN pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
