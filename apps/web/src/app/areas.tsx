import type { IconName } from '@/components/common/Icon';
import { AreaPage } from '@/components/area/AreaPage';
import { ConversationView } from '@/features/conversation/ConversationView';
import { SettingsView } from '@/features/settings/SettingsView';
import { BusinessView } from '@/features/business/BusinessView';
import { Alert } from '@/components/ui';

/**
 * Registro central das Áreas do BeeHive — fonte única de verdade.
 *
 * Daqui derivam tanto o menu lateral quanto o roteamento. Adicionar uma nova
 * Área no futuro é acrescentar uma entrada aqui (extensibilidade, P5/P8).
 *
 * No Sprint 2, apenas a Conversa tem tela própria; as demais usam a página
 * genérica `AreaPage`, com título, descrição, estado e espaço para evoluir.
 */
export interface AreaMeta {
  id: string;
  label: string;
  icon: IconName;
  title: string;
  description: string;
  state: string;
}

export const AREA_META: AreaMeta[] = [
  {
    id: 'conversa',
    label: 'Conversa',
    icon: 'chat',
    title: 'Conversa',
    description: 'A interface principal do BeeHive. Peça qualquer coisa em linguagem natural.',
    state: 'Ativo',
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'briefcase',
    title: 'Business',
    description: 'Crie e administre negócios digitais, tratados como Projetos.',
    state: 'Planejado',
  },
  {
    id: 'juridico',
    label: 'Jurídico',
    icon: 'scale',
    title: 'Jurídico',
    description: 'Consulte legislação, jurisprudência e doutrina; redija peças.',
    state: 'Planejado',
  },
  {
    id: 'desenvolvimento',
    label: 'Desenvolvimento',
    icon: 'code',
    title: 'Desenvolvimento',
    description: 'Crie projetos — de um arquivo simples a um sistema inteiro.',
    state: 'Planejado',
  },
  {
    id: 'design',
    label: 'Design',
    icon: 'brush',
    title: 'Design',
    description: 'Identidade visual, marca e peças gráficas.',
    state: 'Planejado',
  },
  {
    id: 'midia',
    label: 'Mídia',
    icon: 'media',
    title: 'Mídia',
    description: 'Geração de imagens, vídeos e áudio.',
    state: 'Planejado',
  },
  {
    id: 'conhecimento',
    label: 'Conhecimento',
    icon: 'book',
    title: 'Conhecimento',
    description: 'A base de referência consultável do sistema.',
    state: 'Planejado',
  },
  {
    id: 'agentes',
    label: 'Agentes',
    icon: 'agents',
    title: 'Agentes',
    description: 'Catálogo e controle dos executores especializados.',
    state: 'Planejado',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'grid',
    title: 'Dashboard',
    description: 'Visão geral de Projetos, métricas e saúde do sistema.',
    state: 'Planejado',
  },
  {
    id: 'central',
    label: 'Central',
    icon: 'bell',
    title: 'Central',
    description: 'Notificações, fila de aprovações e exceções.',
    state: 'Planejado',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: 'gear',
    title: 'Configurações',
    description: 'Preferências, integrações e segurança.',
    state: 'Planejado',
  },
];

export const AREA_IDS: readonly string[] = AREA_META.map((area) => area.id);

const DEFAULT_AREA = AREA_META[0];

/** Renderiza a tela da Área ativa a partir do seu id. */
export function AreaScreen({ id }: { id: string }) {
  if (id === 'conversa') return <ConversationView />;
  if (id === 'configuracoes') return <SettingsView />;
  if (id === 'business') return <BusinessView />;

  const meta = AREA_META.find((area) => area.id === id) ?? DEFAULT_AREA;

  // A Central demonstra o uso de um Alert no corpo da Área.
  const body =
    meta.id === 'central' ? (
      <Alert variant="info" title="Tudo em dia">
        Nenhuma aprovação pendente no momento.
      </Alert>
    ) : undefined;

  return (
    <AreaPage
      icon={meta.icon}
      title={meta.title}
      description={meta.description}
      state={meta.state}
    >
      {body}
    </AreaPage>
  );
}
