import { AppLayout } from '@/components/layout/AppLayout';
import { AreaScreen, AREA_IDS } from '@/app/areas';
import { useHashRoute } from '@/app/router/useHashRoute';
import { useTheme } from '@/theme/useTheme';
import { ConversationServiceProvider } from '@/services/conversation/ConversationServiceContext';
import { runtimeConversationService } from '@/services/conversation/runtimeConversationService';
import { ConversationStoreProvider } from '@/features/conversation/ConversationStore';

/**
 * Raiz da aplicação.
 *
 * Mantém o estado de tema e de navegação (via roteamento por hash) e monta o
 * layout com a Área ativa. O `ConversationServiceProvider` injeta o serviço de
 * conversa sem que a interface precise mudar.
 */
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { id, navigate } = useHashRoute(AREA_IDS, 'conversa');

  return (
    <ConversationServiceProvider service={runtimeConversationService}>
      <ConversationStoreProvider>
        <AppLayout
          activeArea={id}
          onSelectArea={navigate}
          theme={theme}
          onToggleTheme={toggleTheme}
        >
          <AreaScreen id={id} />
        </AppLayout>
      </ConversationStoreProvider>
    </ConversationServiceProvider>
  );
}
