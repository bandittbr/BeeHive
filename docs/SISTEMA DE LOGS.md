
---

## 📚 Sistema de Logs (obrigatório)

Tudo será registrado manualmente ou automaticamente em:

- logs/daily → atividades do dia
- logs/decisions → decisões arquiteturais
- logs/errors → falhas e bugs
- logs/experiments → testes de ferramentas

Isso será usado futuramente pelo Claude ou outro LLM para reconstruir contexto completo do sistema.

---

## 🔧 O que será feito nesta fase inicial

### Fase 1 — Preparação do ambiente
- instalar Ollama
- baixar modelos locais
- configurar ambiente de execução

### Fase 2 — Ferramentas de execução
- instalar Aider
- instalar Open Interpreter
- testar execução básica de comandos

### Fase 3 — Automação de navegador
- instalar Playwright
- testar automação simples (abrir sites, interagir)

### Fase 4 — Orquestração
- configurar LangGraph ou CrewAI
- criar primeiro fluxo simples de agente

### Fase 5 — Memória
- definir sistema inicial de logs
- criar INDEX.md do sistema

---

## 🧠 Regra principal desta fase

Nada precisa estar perfeito.

O objetivo é:

> Fazer o sistema funcionar primeiro, organizar depois.

---

## 🚀 Resultado esperado desta fase

Ao final desta etapa teremos:

- um sistema local funcional de agentes
- capacidade de automação básica
- execução de código via IA
- memória inicial estruturada
- base real do BeeHive em funcionamento

---

## 🧭 Próximo passo

Após essa fase:

- será criada a primeira versão do Kernel do BeeHive
- será definido sistema de plugins
- será unificado o fluxo dos agentes
- será substituído o “combo” por arquitetura própria

---

## 🐝 Status

Fase atual: **BOOTSTRAP DO SISTEMA LOCAL**
Dependência de Claude: **NÃO**
Dependência de internet: **mínima (apenas instalação)**


EVOLUÇÃO:

## 🧠 Distribuição de Inteligência (Ollama Layer)

O BeeHive não usa um único modelo.

Ele usa uma arquitetura multi-modelo:

### 🧠 Orquestrador (decisão)
- qwen3:8b
- llama3.1:8b

Função:
- planejar tarefas
- quebrar problemas
- decidir fluxo de execução

---

### 💻 Especialista em código
- qwen2.5-coder:7b

Função:
- escrever código
- refatorar projetos
- interagir com Aider / OpenInterpreter

---

### ⚡ Modelos rápidos (agents leves)
- llama3.2:3b
- qwen2.5:3b

Função:
- tarefas simples
- triagem
- respostas rápidas

---