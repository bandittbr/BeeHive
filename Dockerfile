FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg python3 python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter @beehive/worker run build || true

EXPOSE 3000

CMD ["pnpm", "--filter", "@beehive/worker", "run", "start"]