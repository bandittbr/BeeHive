import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';
import { Badge, EmptyState } from '@/components/ui';
import './AreaPage.css';

interface AreaPageProps {
  icon: IconName;
  title: string;
  description: string;
  state: string;
  children?: ReactNode;
}

/**
 * Página inicial genérica de uma Área.
 *
 * Toda Área (exceto a Conversa, que tem tela própria) usa este molde:
 * cabeçalho com ícone, título, descrição e estado; e um corpo que, por
 * padrão, mostra um estado vazio "preparado para evolução". `children`
 * permite que uma Área específica enriqueça o corpo.
 */
export function AreaPage({ icon, title, description, state, children }: AreaPageProps) {
  return (
    <div className="area-page">
      <header className="area-page__header">
        <span className="area-page__icon" aria-hidden>
          <Icon name={icon} size={24} />
        </span>
        <div className="area-page__heading">
          <div className="area-page__title-row">
            <h1 className="area-page__title">{title}</h1>
            <Badge tone="accent" dot>
              {state}
            </Badge>
          </div>
          <p className="area-page__description">{description}</p>
        </div>
      </header>

      <div className="area-page__body">
        {children ?? (
          <EmptyState
            icon={icon}
            title="Em breve"
            description="Esta Área está preparada para evolução. Suas funcionalidades chegam em sprints futuros."
          />
        )}
      </div>
    </div>
  );
}
