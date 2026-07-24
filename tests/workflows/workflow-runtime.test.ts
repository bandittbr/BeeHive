// Workflow Runtime E2E test
// Usa apenas chat.generate (stub) para nao precisar de Playwright

import { Kernel } from "../../kernel/Kernel";
import { WorkflowBuilder } from "@beehive/sdk";

async function main() {
  console.log("  Workflow Runtime E2E Test");
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  // Register a simple workflow: chat.generate only
  const wf = WorkflowBuilder.create("hello-wf", "Hello Workflow")
    .onManual()
    .step("greet", "chat.generate", { message: "{{input.name}}" }, "response")
    .addOutput("result", "{{response.response}}")
    .build();

  kernel.workflows.register(wf as any);
  console.log("  Registered: hello-wf");

  const instance = await kernel.workflows.start("hello-wf", { name: "Mundo" });
  console.log("  Instance: " + instance.id);
  console.log("  Status: " + instance.status);

  if (instance.stepResults) {
    for (const [key, val] of Object.entries(instance.stepResults)) {
      console.log("    " + key + ": " + JSON.stringify(val).slice(0, 100));
    }
  }

  const duration = (instance.completedAt || Date.now()) - instance.startedAt;
  console.log("  Duration: " + duration + "ms");

  // Assert
  const ok = instance.status === "completed";
  console.log();
  console.log(ok ? "  \u2713 Workflow Runtime: OK" : "  \u2717 Workflow Runtime: FAILED");

  const list = kernel.workflows.listDefinitions();
  console.log("  Definitions registered: " + list.length);
  console.log("  First: " + list[0].id);

  if (!ok) process.exit(1);
}

main().catch(console.error);
