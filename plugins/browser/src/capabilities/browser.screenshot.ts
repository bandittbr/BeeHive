import { Capability, ArtifactBuilder, EventBuilder } from "@beehive/sdk";
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext, CapabilityHealth } from "@beehive/sdk";
import { PlaywrightAdapter } from "../playwright.adapter";

const adapter = new PlaywrightAdapter();

export class BrowserScreenshot extends Capability {
  readonly id = "browser.screenshot";
  readonly name = "Capturar";
  readonly description = "Captura screenshot de uma URL";
  readonly inputs: CapabilityInput[] = [
    { name: "url", type: "string", description: "URL para capturar", required: true },
    { name: "fullPage", type: "boolean", description: "Capturar pagina inteira", required: false, default: false },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: "image", type: "object", description: "Imagem como artifact" },
  ];

  async health(): Promise<CapabilityHealth> {
    const start = Date.now();
    try {
      const page = await adapter.newPage();
      await page.close();
      return { status: 'healthy', latency: Date.now() - start };
    } catch (e: any) {
      return { status: 'error', latency: Date.now() - start, reason: e.message, fix: 'pnpm browser:setup' };
    }
  }

  async readiness(): Promise<import('@beehive/sdk').CapabilityReadiness> {
    const health = await adapter.healthCheck();
    if (!health.chromium) {
      return { status: 'unavailable', reason: 'Chromium nao instalado', fix: 'pnpm browser:setup' };
    }
    return { status: 'ready' };
  }

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const url = params.url as string;
    const fullPage = (params.fullPage as boolean) ?? false;
    ctx.logger.info("BrowserScreenshot: " + url);

    const page = await adapter.newPage();
    const start = Date.now();
    await page.goto(url, { waitUntil: "networkidle" });
    const screenshotBuffer = await page.screenshot({ fullPage, type: "png" });
    await page.close();

    const artifact = ArtifactBuilder.create("image", this.id)
      .withData(screenshotBuffer)
      .withMetadata({ url, format: "png", fullPage })
      .build();

    const event = EventBuilder.create("browser:screenshotted", this.id)
      .withPayload({ url, artifactId: artifact.id, size: screenshotBuffer.length })
      .build();
    ctx.events.publish(event);

    return {
      success: true,
      outputs: { image: { artifactId: artifact.id, size: screenshotBuffer.length, mimeType: "image/png" } },
      metrics: { duration: Date.now() - start },
    };
  }
}
