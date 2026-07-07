import type { IconName } from '@/components/common/Icon';

/**
 * Conteúdo estático da tela de boas-vindas da Conversa.
 * Reproduz visualmente o conceito aprovado. Nenhum item executa ação no
 * Sprint 1 — são elementos puramente visuais, preparados para receber
 * comportamento em sprints futuros.
 */

export interface ActionCard {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  tone: 'yellow' | 'purple' | 'pink' | 'blue';
}

export const ACTION_CARDS: ActionCard[] = [
  {
    id: 'novo-business',
    title: 'Criar um novo Projeto Business',
    description: 'Inicie um negócio do zero com IA',
    icon: 'briefcase',
    tone: 'yellow',
  },
  {
    id: 'doc-juridico',
    title: 'Analisar um documento jurídico',
    description: 'Envie contratos, peças ou documentos',
    icon: 'scale',
    tone: 'purple',
  },
  {
    id: 'conteudo-social',
    title: 'Criar conteúdo para redes sociais',
    description: 'Gerar posts, imagens e vídeos',
    icon: 'media',
    tone: 'pink',
  },
  {
    id: 'sistema-app',
    title: 'Desenvolver um sistema ou app',
    description: 'Transforme ideias em código',
    icon: 'code',
    tone: 'blue',
  },
];

export const QUICK_SUGGESTIONS: string[] = [
  'Criar um influencer de nicho',
  'Analisar jurisprudência',
  'Gerar vídeo para TikTok',
  'Pesquisar doutrina',
];
