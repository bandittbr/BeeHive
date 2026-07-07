import { useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './markdown.css';

/**
 * Bloco de código com botão de copiar. Lê o texto direto do <pre> renderizado,
 * evitando reprocessar os filhos do Markdown.
 */
function CodeBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard indisponível: ignora silenciosamente.
    }
  };

  return (
    <div className="md-codeblock">
      <button type="button" className="md-copy" onClick={copy}>
        {copied ? 'Copiado' : 'Copiar'}
      </button>
      <pre ref={ref}>{children}</pre>
    </div>
  );
}

/**
 * Renderiza o conteúdo de uma mensagem como Markdown (GFM).
 *
 * Seguro por padrão: o `react-markdown` não interpreta HTML cru. Links abrem em
 * nova aba com rel seguro. Funciona durante o streaming (re-renderiza a cada
 * pedaço, tolerando Markdown incompleto).
 */
export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
