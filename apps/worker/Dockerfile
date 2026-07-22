# BeeHive Cowork Nuvem — imagem do worker.
# Baseada na imagem oficial do Playwright (já traz Chromium + libs do sistema),
# então o executor de browser funciona sem passos extras.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

# git (executor git), ffmpeg (cortes/montagem) e yt-dlp (baixar vídeos)
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg python3 python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && pip3 install --no-cache-dir yt-dlp

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
  && npm install --no-save typescript@5.7.3 tsx@4.19.2

COPY tsconfig.json ./
COPY src ./src

# compila para dist/
RUN npx tsc -p tsconfig.json

ENV NODE_ENV=production
ENV PORT=4000
ENV WORKSPACE_DIR=/app/workspace
EXPOSE 4000

CMD ["node", "dist/index.js"]
