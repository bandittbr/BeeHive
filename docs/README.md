# 🐝 BeeHive — Documentação de Fundação

Este diretório contém a documentação oficial do Projeto BeeHive, organizada para durar muitos anos.

A documentação segue um princípio central: **separar o que é permanente do que é mutável.**

- A **Constituição** (`00`) guarda apenas o que dificilmente muda: identidade, filosofia, princípios e conceitos.
- Os demais documentos guardam decisões que **vão evoluir** com o tempo (arquitetura, tecnologia, roadmap, áreas).

> ⚖️ **Regra de precedência:** em qualquer conflito, a Constituição prevalece sobre os documentos técnicos, e a **visão do Product Owner prevalece sobre qualquer decisão da IA**.

---

## Índice

| # | Documento | Natureza | Conteúdo |
|---|-----------|----------|----------|
| 00 | [BeeHive_Constitution](00_BeeHive_Constitution.md) | 🔒 Permanente | O que é, missão, visão, filosofia, objetivos, princípios, conceitos, glossário, estrutura conceitual |
| 01 | [Architecture](01_Architecture.md) | 🔁 Evolutivo | Camadas do sistema, desacoplamento, catálogo completo das Áreas |
| 02 | [Technology_Stack](02_Technology_Stack.md) | 🔁 Volátil | Linguagens, frameworks, bancos, provedores de IA, libs, hospedagem, APIs, ferramentas |
| 03 | [Roadmap](03_Roadmap.md) | 🔁 Evolutivo | Estratégia em 4 fases e marcos incrementais |
| 04 | [Conversation](04_Conversation.md) | 🔁 Evolutivo | A interface principal (núcleo) |
| 05 | [Business](05_Business.md) | 🔁 Evolutivo | Criação e administração de negócios digitais |
| 06 | [Agents](06_Agents.md) | 🔁 Evolutivo | Sistema de agentes, estados, controle e segurança |
| 07 | [Dashboard](07_Dashboard.md) | 🔁 Evolutivo | Visão geral e navegação das Áreas |
| 08 | [Projects](08_Projects.md) | 🔁 Evolutivo | O Projeto como unidade central |
| 09 | [Data_Model](09_Data_Model.md) | 🔁 Evolutivo | Entidades conceituais e relações |
| 10 | [Development](10_Development.md) | 🔁 Evolutivo | Área de criação de projetos (de arquivos a sistemas) |
| 11 | [Legal](11_Legal.md) | 🔁 Evolutivo | Área Jurídica e exigências de fontes confiáveis |
| 12 | [Risks_and_Constraints](12_Risks_and_Constraints.md) | 🔁 Evolutivo | Riscos técnicos, limites de plataformas e restrições reais |

🔒 = não deve mudar sem decisão deliberada do Product Owner.
🔁 = esperado que evolua continuamente.

---

## Por que esta estrutura

A estrutura proposta originalmente foi seguida quase integralmente. Três ajustes foram feitos (justificados):

1. **Adição deste `README.md`** como índice de navegação — facilita encontrar e versionar cada documento.
2. **Adição de `12_Risks_and_Constraints.md`** — os riscos técnicos e limites de plataforma do documento original não cabiam na Constituição (são mutáveis) nem eram puramente jurídicos. Ganharam um documento próprio.
3. **As Áreas menores** (Mídia, Design, Conhecimento, Central, Configurações) estão catalogadas em `01_Architecture.md`. Ganharão documentos dedicados (`13+`) à medida que amadurecerem, evitando criar arquivos vazios agora.

Nenhuma ideia do documento original foi removida — apenas reorganizada entre os documentos acima.
