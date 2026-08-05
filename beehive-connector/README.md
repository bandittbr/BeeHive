# BeeHive Connector

Conector separado do gerador local. Não usa a pasta E:\aiyoutubeshorts.

Variáveis:
- BEEHIVE_WORKER_URL: URL pública do worker
- BEEHIVE_CONNECTOR_TOKEN: token configurado no Railway
- YTDLP_PATH: caminho opcional do yt-dlp

O conector baixa o vídeo usando a sessão local do navegador e envia o arquivo ao armazenamento do BeeHive. O processamento de cortes acontece no worker/nuvem.
