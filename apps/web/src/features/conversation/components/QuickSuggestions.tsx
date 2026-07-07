import { QUICK_SUGGESTIONS } from '@/data/conversationContent';

interface QuickSuggestionsProps {
  onPick: (text: string) => void;
}

/**
 * "Sugestões rápidas" — chips clicáveis. Ao clicar, a sugestão é enviada como
 * uma mensagem (envio local, sem IA).
 */
export function QuickSuggestions({ onPick }: QuickSuggestionsProps) {
  return (
    <div className="quick-suggestions">
      <span className="quick-suggestions__label">Sugestões rápidas</span>
      <div className="quick-suggestions__list">
        {QUICK_SUGGESTIONS.map((text) => (
          <button key={text} type="button" className="chip" onClick={() => onPick(text)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
