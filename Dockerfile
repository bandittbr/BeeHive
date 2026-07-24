# BeeHive Worker — imagem completa com kernel + plugins.
# Baseada no Playwright (Chromium + libs de sistema).
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

# git, ffmpeg, python, yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg python3 python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && pip3 install --no-cache-dir yt-dlp

# pnpm
RUN npm install -g pnpm@latest

# Primeiro copia só os manifests para aproveitar cache de camadas
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
COPY plugins/*/package.json plugins/

RUN pnpm install --no-frozen-lockfile

# Agora copia o código fonte
COPY . .

# Compila o worker (para typecheck, mas runtime usa tsx)
RUN pnpm --filter @beehive/worker run build || true

ENV NODE_ENV=production
ENV PORT=4000
ENV WORKSPACE_DIR=/app/workspace
EXPOSE 4000

# Usa tsx em vez de node dist/ porque o kernel e packages usam moduleResolution bundler
CMD ["pnpm", "--filter", "@beehive/worker", "run", "start"]