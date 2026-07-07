import { Icon } from '@/components/common/Icon';
import { ACTION_CARDS } from '@/data/conversationContent';

/**
 * Cartões de ação rápida da tela de boas-vindas.
 * Reproduzem o conceito aprovado. São visuais: não disparam ações no Sprint 1.
 */
export function ActionCards() {
  return (
    <div className="action-cards">
      {ACTION_CARDS.map((card) => (
        <button
          key={card.id}
          type="button"
          className="action-card"
          data-tone={card.tone}
          // Sem comportamento ainda — apenas visual (Sprint 1).
        >
          <span className="action-card__icon">
            <Icon name={card.icon} size={22} />
          </span>
          <span className="action-card__title">{card.title}</span>
          <span className="action-card__desc">{card.description}</span>
        </button>
      ))}
    </div>
  );
}
