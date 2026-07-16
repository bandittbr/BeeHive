import { Kernel } from "../kernel/Kernel";
import { ArtifactBuilder } from "@beehive/sdk";

async function main() {
  const url = process.argv[2] || "https://example.com";
  console.log();
  console.log("  ====================================");
  console.log("   BeeHive Demo: Browser + Chat");
  console.log("  ====================================");
  console.log("   URL: " + url);
  console.log();

  const kernel = new Kernel();
  const report = await kernel.boot();

  console.log("   Kernel booted (" + report.kernel.duration + "ms)");
  console.log("   Plugins: " + report.plugins.map((p: any) => p.id).join(", "));
  console.log();

  const events: any[] = [];
  kernel.events.subscribe("*", (event: any) => {
    events.push(event);
    console.log("   [event] " + event.type);
  });

  const ctx = {
    correlationId: "demo-" + Date.now().toString(36),
    logger: kernel.logger as any,
    events: kernel.events as any,
  };

  // Step 1: Navigate
  console.log();
  console.log("   >> 1. browser.navigate");
  const navResult = await kernel.capabilities.resolve("browser.navigate")
    .execute({ url }, ctx);
  console.log("       Title: " + navResult.outputs.title);

  // Step 2: Scrape
  console.log("   >> 2. browser.scrape");
  const scrapeResult = await kernel.capabilities.resolve("browser.scrape")
    .execute({ url }, ctx);
  const markdown = scrapeResult.outputs.markdown as string;
  console.log("       Content: " + markdown.slice(0, 100) + "... (" + markdown.length + " chars)");

  // Step 3: Summarize
  console.log("   >> 3. chat.generate (resumo)");
  const chatResult = await kernel.capabilities.resolve("chat.generate")
    .execute({ message: "Resuma este conteudo em 3 paragrafos:\n\n" + markdown.slice(0, 3000) }, ctx);
  const summary = chatResult.outputs.response as string;
  console.log("       Summary: " + summary.slice(0, 200) + "...");

  // Step 4: Create final Artifact
  console.log("   >> 4. Artifact(Markdown)");
  const finalArtifact = ArtifactBuilder.create("markdown", "demo")
    .withData("# Resumo: " + url + "\n\n" + summary)
    .withMetadata({ source: url, originalLength: markdown.length })
    .build();
  console.log("       Artifact: " + finalArtifact.id + " (" + finalArtifact.type + ")");

  console.log();
  console.log("  ====================================");
  console.log("   Demo complete");
  console.log("   Events published: " + events.length);
  console.log("  ====================================");
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
