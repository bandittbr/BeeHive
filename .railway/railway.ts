import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const worker = service("BeeHive", {
    source: github("bandittbr/BeeHive"),
    build: "pnpm install",
    start: "pnpm --filter @beehive/worker run start",
    healthcheckPath: "/health",
    port: 4000,
  });

  return project("BeeHive", {
    resources: [worker],
  });
});
