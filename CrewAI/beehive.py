import os
from crewai import Agent, Task, Crew, Process

# 1. CHAVE DA OPENROUTER (use variável de ambiente)
# OPENROUTER_API_KEY definida em .env ou variável de ambiente do sistema
_ = os.environ.get("OPENROUTER_API_KEY", "") or print("⚠ OPENROUTER_API_KEY não definida")

# 2. A VARIÁVEL MESTRA
nicho_atual = "Inteligência Artificial para Negócios"

# 3. OS AGENTES (Configurados para OpenRouter/Llama 3.1 8B Gratuito)
pesquisador = Agent(
    role='Analista de Tendências',
    goal=f'Descobrir temas sobre {nicho_atual}',
    backstory='Você é um estrategista de conteúdo focado em dados e tendências.',
    verbose=True,
    allow_delegation=False,
    llm='openrouter/meta-llama/llama-3.1-8b-instruct'
)

estrategista = Agent(
    role='Diretor de Conteúdo e Copywriting',
    goal=f'Criar material de altíssimo impacto e engajamento para o público de {nicho_atual}',
    backstory='Você é um camaleão do marketing. Consegue adaptar seu tom de voz para vender e engajar em qualquer setor.',
    verbose=True,
    allow_delegation=False,
    llm='openrouter/meta-llama/llama-3.1-8b-instruct'
)

# 4. AS TAREFAS
tarefa_pesquisa = Task(
    description=f'Faça uma análise rápida do mercado de {nicho_atual} e liste 2 temas que estão em alta para criação de conteúdo hoje.',
    expected_output='Lista com 2 temas quentes e uma frase explicando por que estão bombando.',
    agent=pesquisador
)

tarefa_criacao = Task(
    description=f'Com base na pesquisa, escolha o melhor tema e crie um post completo para redes sociais. O post deve conter: 1. Prompt descritivo de imagem/vídeo para uma IA de design gerar; 2. Uma legenda altamente magnética; 3. Hashtags estratégicas.',
    expected_output='Roteiro Visual (Prompt) + Legenda pronta para copiar e colar + Hashtags.',
    agent=estrategista
)

# 5. EXECUTANDO A FÁBRICA
equipe_beehive = Crew(
    agents=[pesquisador, estrategista],
    tasks=[tarefa_pesquisa, tarefa_criacao],
    verbose=True,
    process=Process.sequential
)

print(f"Iniciando a inteligência para o nicho: {nicho_atual}...\n")
resultado = equipe_beehive.kickoff()

print("\n\n==================================================")
print("🎯 PRODUTO FINAL PRONTO PARA AUTOMAÇÃO:")
print("==================================================\n")
print(resultado)