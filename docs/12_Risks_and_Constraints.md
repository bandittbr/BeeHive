# 12 — Riscos e Restrições

> **Natureza:** evolutiva. Reúne os limites do mundo real que moldam *a ordem certa de construir* e *o que exige supervisão humana*. Honra o Princípio P15 (honestidade técnica).

---

## 1. "Grátis 24/7 com IA pesada" não existe sem uma máquina ligada
Inteligência local precisa de hardware ligado; serverless gratuito não hospeda esse tipo de processamento contínuo. Por isso o "viver sozinho" só chega de verdade na Fase 3 (servidor). Antes disso, a autonomia depende do PC do administrador.

## 2. Redes sociais têm regras rígidas
As APIs oficiais existem, mas impõem limites severos (valores de referência jun/2026):
- **Instagram:** acesso só a contas business/creator autorizadas; aprovação de app pode ser recusada; limites de mensagens e de publicação.
- **TikTok:** aprovação manual do app leva semanas; faixa de ~15–25 posts/dia; tokens de curta duração; é **proibido** adicionar marca d'água ou texto promocional via app; contas com padrões idênticos (mesmo IP, mesmos horários) são sinalizadas.
- **Conteúdo de IA exige disclosure.** Automação "invisível" pode levar a banimento. O caminho sustentável é **automação supervisionada e dentro das regras**.

## 3. Vídeo de qualidade exige GPU
Geração local de reels com boa qualidade pede placa com VRAM adequada. Sem isso, é lenta ou limitada. Alternativa parcial: serviços de mídia com cota gratuita na nuvem.

## 4. Marketplaces e afiliados têm ciclos próprios
Cada marketplace (ex.: Shopee, TikTok Shop) e cada programa de afiliados tem aprovação, comissão e regras distintas. Cada um é uma integração com seu próprio ciclo. Vender "sozinho" é meta de longo prazo, não de MVP.

## 5. Jurídico exige fontes confiáveis e atualizadas
Legislação e jurisprudência mudam; há risco real de alucinação. O sistema precisa citar fontes e nunca inventar. Detalhes em `11_Legal.md`.

---

> **Conclusão:** nenhum desses pontos inviabiliza o BeeHive. Eles definem a sequência de construção e os pontos onde a supervisão humana é obrigatória (Princípios P9–P11).
