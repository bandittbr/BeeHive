import { Capability, ArtifactBuilder, EventBuilder } from "@beehive/sdk";
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from "@beehive/sdk";
import { PlaywrightAdapter } from "../playwright.adapter";

const adapter = new PlaywrightAdapter();

export class BrowserScrape extends Capability {
  readonly id = "browser.scrape";
  readonly name = "Extrair";
  readonly description = "Extrai conteudo de uma URL como Markdown";
  readonly inputs: CapabilityInput[] = [
    { name: "url", type: "string", description: "URL para extrair", required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: "markdown", type: "string", description: "Conteudo em Markdown" },
    { name: "title", type: "string", description: "Titulo da pagina" },
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
    ctx.logger.info("BrowserScrape: " + url);

    const page = await adapter.newPage();
    const start = Date.now();
    await page.goto(url, { waitUntil: "networkidle" });
    const title = await page.title();

    // Extrai o texto principal via Playwright, converte para Markdown simples
    const markdown = await page.evaluate(() => {
      const article = document.querySelector("article") || document.querySelector("main") || document.body;
      const clone = article.cloneNode(true) as HTMLElement;
      // Remove scripts, styles, nav, footer, aside
      clone.querySelectorAll("script, style, nav, footer, aside, header, iframe").forEach((el) => el.remove());

      function elementToMarkdown(el: Node, depth: number): string {
        let result = "";
        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text) result += text + " ";
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const elem = child as HTMLElement;
            const tag = elem.tagName.toLowerCase();
            if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
              const level = "#".repeat(parseInt(tag[1]));
              result += "\n\n" + level + " " + elementToMarkdown(elem, depth + 1).trim() + "\n\n";
            } else if (tag === "p") {
              result += "\n\n" + elementToMarkdown(elem, depth + 1).trim() + "\n\n";
            } else if (tag === "li") {
              result += "\n- " + elementToMarkdown(elem, depth + 1).trim();
            } else if (tag === "ul" || tag === "ol") {
              result += "\n" + elementToMarkdown(elem, depth + 1);
            } else if (tag === "a") {
              const href = elem.getAttribute("href");
              const text = elementToMarkdown(elem, depth + 1).trim();
              if (href && text) result += "[" + text + "](" + href + ") ";
              else if (text) result += text;
            } else if (tag === "img") {
              const alt = elem.getAttribute("alt") || "";
              const src = elem.getAttribute("src");
              if (src) result += "![" + alt + "](" + src + ") ";
            } else if (tag === "code" || tag === "pre") {
              result += "`" + elementToMarkdown(elem, depth + 1).trim() + "`";
            } else if (tag === "br") {
              result += "\n";
            } else if (tag === "strong" || tag === "b") {
              result += "**" + elementToMarkdown(elem, depth + 1).trim() + "**";
            } else if (tag === "em" || tag === "i") {
              result += "*" + elementToMarkdown(elem, depth + 1).trim() + "*";
            } else if (tag === "blockquote") {
              result += "\n> " + elementToMarkdown(elem, depth + 1).trim() + "\n";
            } else {
              result += elementToMarkdown(elem, depth + 1);
            }
          }
        }
        return result;
      }

      return elementToMarkdown(clone, 0).replace(/\n{3,}/g, "\n\n").trim();
    });

    await page.close();

    const artifact = ArtifactBuilder.create("markdown", this.id)
      .withData(markdown)
      .withMetadata({ source: url, title })
      .build();

    const event = EventBuilder.create("browser:scraped", this.id)
      .withPayload({ url, title, artifactId: artifact.id, length: markdown.length })
      .build();
    ctx.events.publish(event);

    return {
      success: true,
      outputs: { markdown, title },
      metrics: { duration: Date.now() - start },
    };
  }
}
