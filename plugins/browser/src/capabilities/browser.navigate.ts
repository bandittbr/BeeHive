import { Capability, ArtifactBuilder, EventBuilder } from "@beehive/sdk";
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from "@beehive/sdk";
import { PlaywrightAdapter } from "../playwright.adapter";

const adapter = new PlaywrightAdapter();

export class BrowserNavigate extends Capability {
  readonly id = "browser.navigate";
  readonly name = "Navegar";
  readonly description = "Navega para uma URL e retorna titulo e URL final";
  readonly inputs: CapabilityInput[] = [
    { name: "url", type: "string", description: "URL para navegar", required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: "title", type: "string", description: "Titulo da pagina" },
    { name: "url", type: "string", description: "URL final apos redirects" },
  ];

  async readiness(): Promise<import('@beehive/sdk').CapabilityReadiness> {
    const health = await adapter.healthCheck();
    if (!health.chromium) {
      return { status: 'unavailable', reason: 'Chromium nao instalado', fix: 'pnpm browser:setup' };
    }
    return { status: 'ready' };
  }

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const url = params.url as string;
    ctx.logger.info("BrowserNavigate: " + url);

    const page = await adapter.newPage();
    const start = Date.now();
    await page.goto(url, { waitUntil: "networkidle" });
    const title = await page.title();
    const finalUrl = page.url();
    await page.close();

    const result = { title, url: finalUrl, loadTimeMs: Date.now() - start };
    const artifact = ArtifactBuilder.create("json", this.id).withData(result).build();

    const event = EventBuilder.create("browser:navigated", this.id)
      .withPayload({ url: finalUrl, title, artifactId: artifact.id })
      .build();
    ctx.events.publish(event);

    return {
      success: true,
      outputs: { title, url: finalUrl },
      metrics: { duration: Date.now() - start },
    };
  }
}
