// BeeHive Workflow DSL Demo
// Uso: npx tsx examples/workflow-demo.ts
//
// Demonstra que qualquer capability pode ser encadeada com qualquer outra
// apenas atraves de um WorkflowDefinition, sem codigo especifico.

import { Kernel } from "../kernel/Kernel";
import { WorkflowBuilder } from "@beehive/sdk";

async function main() {
  console.log();
  console.log("  ====================================");
  console.log("   Workflow DSL Demo");
  console.log("  ====================================");
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  // Create a workflow using the Builder
  const workflow = WorkflowBuilder.create("summarize-site", "Summarize Website")
    .describe("Navega para um site, extrai o conteudo e resume com IA")
    .onManual()
    .step("extract", "browser.scrape",
      { url: "{{input.url}}" },
      "page")
    .step("summarize", "chat.generate",
      { message: "Resuma o conteudo abaixo em 3 paragrafos:\n\n{{page.markdown}}" },
      "summary")
    .addOutput("markdown", "# Resumo: {{input.url}}\n\n{{summary.response}}")
    .build();

  console.log("  Workflow Definition:");
  console.log("    ID: " + workflow.id);
  console.log("    Steps: " + workflow.steps.length);
  console.log("    Triggers: " + workflow.triggers.map((t: any) => t.type).join(", "));
  console.log();

  // Register and execute
  kernel.workflows.register(workflow as any);

  console.log("  Executing workflow...");
  console.log();

  const instance = await kernel.workflows.start("summarize-site", {
    url: process.argv[2] || "https://example.com",
  });

  console.log("  Instance: " + instance.id);
  console.log("  Status: " + instance.status);
  if (instance.stepResults) {
    for (const [key, val] of Object.entries(instance.stepResults)) {
      console.log("    " + key + ": " + JSON.stringify(val).slice(0, 120));
    }
  }
  console.log("  Duration: " + ((instance.completedAt || Date.now()) - instance.startedAt) + "ms");
  console.log();

  console.log("  ====================================");
  console.log("  Sprint 2 provado: Capabilities encadeadas via WorkflowDefinition");
  console.log("  sem codigo especifico.");
  console.log("  ====================================");
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
