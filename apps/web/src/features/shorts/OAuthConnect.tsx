import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Card, Badge, Alert } from '@/components/ui';
import { Icon, type IconName } from '@/components/common/Icon';
import { API_BASE } from '@/lib/api';

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  active: boolean;
}

interface OAuthConnectProps {
  agentId: string;
  socialAccounts: SocialAccount[];
  onConnected: () => void;
}

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube', icon: 'play' as IconName, color: '#ff0000' },
  { key: 'tiktok', label: 'TikTok', icon: 'music' as IconName, color: '#00f2ea' },
  { key: 'instagram', label: 'Instagram', icon: 'camera' as IconName, color: '#e1306c' },
];

export function OAuthConnect({ agentId, socialAccounts, onConnected }: OAuthConnectProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const handleConnect = useCallback((platform: string) => {
    setError(null);
    setConnecting(platform);

    const popup = window.open(
      `${API_BASE}/../oauth/${platform}/authorize?agentId=${agentId}`,
      `${platform}_oauth`,
      'width=600,height=700,scrollbars=yes',
    );

    const checkClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkClosed);
        setConnecting(null);
        onConnected();
      }
    }, 500);

    setTimeout(() => clearInterval(checkClosed), 120000);
  }, [agentId, onConnected]);

  const handleDisconnect = useCallback(async (socialId: string, platform: string) => {
    setError(null);
    setDisconnecting(platform);
    try {
      const res = await fetch(`${API_BASE}/shorts/agents/${agentId}/social/${socialId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setDisconnecting(null);
    }
  }, [agentId, onConnected]);

  return (
    <div className="oauth-connect">
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="oauth-connect__platforms">
        {PLATFORMS.map((platform) => {
          const account = socialAccounts.find((s) => s.platform === platform.key);
          const isConnected = !!account;
          const isConnecting = connecting === platform.key;
          const isDisconnecting = disconnecting === platform.key;

          return (
            <div
              key={platform.key}
              className={`oauth-connect__platform ${isConnected ? 'oauth-connect__platform--connected' : ''}`}
            >
              <div className="oauth-connect__platform-icon">
                <Icon name={platform.icon} size={20} />
              </div>
              <span className="oauth-connect__platform-name">{platform.label}</span>
              <span className="oauth-connect__platform-status">
                {isConnected ? 'Conectado' : 'Nao conectado'}
              </span>
              {isConnected ? (
                <Button
                  variant="ghost"
                  className="oauth-connect__btn"
                  disabled={isDisconnecting}
                  onClick={() => handleDisconnect(account!.id, platform.key)}
                >
                  {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="oauth-connect__btn"
                  disabled={isConnecting}
                  onClick={() => handleConnect(platform.key)}
                >
                  {isConnecting ? 'Conectando...' : 'Conectar'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
