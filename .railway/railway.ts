import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  // Volume persistente para dados do worker que precisam sobreviver a deploys:
  // - Sessão WhatsApp (.wwebjs_auth/)
  // - Leads (.beehive-leads.json)
  // - Modelos Virtuais (.beehive-modelos.json + fotos/ logs)
  // - Status WhatsApp (.beehive-whatsapp-status.json)
  // - QR Code cache (.beehive-qr-cache.png)
  const workspaceData = volume("workspace-data", {
    region: "europe-west4-drams3a", // mesma região do service
    sizeMB: 1024, // 1 GB — ajustável depois
  });

  const worker = service("BeeHive", {
    source: github("bandittbr/BeeHive", { branch: "master" }),
    build: "pnpm install",
    start: "pnpm --filter @beehive/worker run start",
    healthcheckPath: "/health",
    port: 4000,
    volumeMounts: {
      "/app/apps/worker/workspace": workspaceData,
    },
    env: {
      // Preserva todas as variáveis já configuradas no Railway
      AUTH_JWT_SECRET: preserve(),
      ENCRYPTION_KEY: preserve(),
      GROQ_API_KEY: preserve(),
      OPENCODE_ZEN_API_KEY: preserve(),
      SUPABASE_SERVICE_KEY: preserve(),
      SUPABASE_URL: preserve(),
      VERCEL_TOKEN: preserve(),
      WORKER_PUBLIC_URL: preserve(),
      WORKER_TOKEN: preserve(),
    },
  });

  return project("BeeHive", {
    resources: [worker, workspaceData],
  });
});
