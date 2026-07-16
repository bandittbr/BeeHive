// WorkflowBuilder tests

import { WorkflowBuilder } from "@beehive/sdk";

function assert(name: string, ok: boolean) {
  if (ok) console.log("  \u2713 " + name);
  else { console.log("  \u2717 " + name); process.exit(1); }
}

// Test 1: Create basic workflow
const wf = WorkflowBuilder.create("test", "Test")
  .onManual()
  .step("s1", "browser.scrape", { url: "{{input.url}}" }, "page")
  .step("s2", "chat.generate", { message: "{{page.markdown}}" }, "summary")
  .addOutput("result", "{{summary.response}}")
  .build();

assert("creates workflow", wf.id === "test");
assert("has 2 steps", wf.steps.length === 2);
assert("first step is scrape", (wf.steps[0] as any).capability === "browser.scrape");
assert("second step is chat", (wf.steps[1] as any).capability === "chat.generate");
assert("has output", wf.outputs?.result === "{{summary.response}}");
assert("trigger is manual", wf.triggers[0].type === "manual");

// Test 2: Condition
const wf2 = WorkflowBuilder.create("test2", "With Condition")
  .onManual()
  .condition("c1", "{{input.lang}} === 'pt'", [
    { id: "pt", type: "capability", capability: "chat.generate", input: { message: "Fale em portugues" }, output: "res" } as any,
  ], [
    { id: "en", type: "capability", capability: "chat.generate", input: { message: "Speak in english" }, output: "res" } as any,
  ])
  .build();

assert("condition created", wf2.steps[0].type === "condition");
const condStep = wf2.steps[0] as any;
assert("then has 1 step", condStep.then.length === 1);
assert("else has 1 step", condStep.else.length === 1);

// Test 3: Foreach
const wf3 = WorkflowBuilder.create("test3", "With Loop")
  .onManual()
  .foreach("loop", "{{input.urls}}", [
    { id: "scrape", type: "capability", capability: "browser.scrape", input: { url: "{{item}}" }, output: "page" } as any,
  ])
  .build();

assert("foreach created", wf3.steps[0].type === "foreach");
const foreachStep = wf3.steps[0] as any;
assert("foreach items", foreachStep.items === "{{input.urls}}");
assert("foreach has step", foreachStep.steps.length === 1);

// Test 4: Parallel
const wf4 = WorkflowBuilder.create("test4", "With Parallel")
  .onManual()
  .parallel("p1", [
    [{ id: "a", type: "capability", capability: "browser.scrape", input: { url: "{{input.url}}" } } as any],
    [{ id: "b", type: "capability", capability: "browser.screenshot", input: { url: "{{input.url}}" } } as any],
  ])
  .build();

assert("parallel created", wf4.steps[0].type === "parallel");
const parallelStep = wf4.steps[0] as any;
assert("parallel has 2 branches", parallelStep.parallel.length === 2);

// Test 5: YAML output
const yaml = WorkflowBuilder.create("yaml-test", "YAML Test")
  .onManual()
  .step("s1", "browser.scrape", { url: "{{input.url}}" }, "page")
  .build()
  .id;

assert("yaml-test created", yaml === "yaml-test");

// Test 6: Cron trigger
const wf6 = WorkflowBuilder.create("scheduled", "Scheduled")
  .onCron("0 8 * * 1")
  .step("s1", "chat.generate", { message: "hello" })
  .build();

assert("cron trigger", wf6.triggers[0].type === "schedule");
assert("cron expression", (wf6.triggers[0] as any).cron === "0 8 * * 1");

console.log();
console.log("  All WorkflowBuilder tests passed!");
