import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Icon } from '@/components/common/Icon';
import { ModelSelector } from '@/components/ModelSelector';

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  preview?: string;
}

export interface SubmitPayload {
  text: string;
  files: AttachedFile[];
}

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (payload: SubmitPayload) => void;
  isResponding: boolean;
  onStop: () => void;
  onCommand?: (command: string) => void;
}

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
  'pdf', 'md', 'txt', 'rtf',
  'doc', 'docx', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml',
  'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
  'css', 'scss', 'less', 'html', 'htm', 'vue', 'svelte', 'astro',
  'sh', 'bash', 'zsh', 'sql', 'graphql', 'prisma',
  'env', 'gitignore', 'dockerignore', 'editorconfig',
  'Dockerfile', 'Makefile', 'README', 'LICENSE',
]);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']);

const COMMANDS = [
  { id: 'terminal', label: 'Terminal', icon: 'command' as const, description: 'Executar comando no terminal' },
  { id: 'git', label: 'Git', icon: 'box' as const, description: 'Operações git' },
  { id: 'browser', label: 'Browser', icon: 'globe' as const, description: 'Navegar na web' },
  { id: 'read', label: 'Ler arquivo', icon: 'folder' as const, description: 'Ler conteúdo de arquivo' },
  { id: 'write', label: 'Escrever arquivo', icon: 'edit' as const, description: 'Criar/editar arquivo' },
  { id: 'search', label: 'Buscar', icon: 'search' as const, description: 'Buscar no projeto' },
];

function isAllowedFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_EXTENSIONS.has(filename);
}

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

function getFileIcon(filename: string): 'camera' | 'folder' | 'edit' | 'code' {
  if (isImageFile(filename)) return 'camera';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext)) return 'code';
  if (['md', 'txt', 'pdf', 'doc', 'docx'].includes(ext)) return 'edit';
  return 'folder';
}

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  isResponding,
  onStop,
  onCommand,
}: MessageComposerProps) {
  const [showCommands, setShowCommands] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (commandsRef.current && !commandsRef.current.contains(e.target as Node)) {
        setShowCommands(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isResponding) {
        onSubmit({ text: value, files: attachedFiles });
        clearAttached();
      }
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setError(null);
    const newAttached: AttachedFile[] = [];

    for (const file of Array.from(files)) {
      if (!isAllowedFile(file.name)) {
        setError(`Arquivo não permitido: ${file.name}`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`Arquivo muito grande: ${file.name} (máx 10MB)`);
        continue;
      }

      try {
        const content = await readFileContent(file);
        const attached: AttachedFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          content,
        };

        if (isImageFile(file.name)) {
          attached.preview = URL.createObjectURL(file);
        }

        newAttached.push(attached);
      } catch {
        setError(`Erro ao ler: ${file.name}`);
      }
    }

    if (newAttached.length > 0) {
      setAttachedFiles(prev => [...prev, ...newAttached]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;

      if (isImageFile(file.name)) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleRemoveAttached = (index: number) => {
    setAttachedFiles(prev => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAttached = () => {
    for (const f of attachedFiles) {
      if (f.preview) URL.revokeObjectURL(f.preview);
    }
    setAttachedFiles([]);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleCommand = (cmd: typeof COMMANDS[0]) => {
    onCommand?.(cmd.id);
    setShowCommands(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isResponding) {
          onSubmit({ text: value, files: attachedFiles });
          clearAttached();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico,.pdf,.md,.txt,.rtf,.doc,.docx,.csv,.json,.xml,.yaml,.yml,.toml,.js,.ts,.jsx,.tsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.css,.scss,.less,.html,.htm,.vue,.svelte,.astro,.sh,.bash,.zsh,.sql,.graphql,.prisma,.env,.gitignore,.dockerignore,.editorconfig"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {attachedFiles.length > 0 && (
        <div className="composer__attached">
          {attachedFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="composer__attached-file">
              {file.preview ? (
                <img src={file.preview} alt={file.name} className="composer__attached-thumb" />
              ) : (
                <Icon name={getFileIcon(file.name)} size={14} />
              )}
              <div className="composer__attached-info">
                <span className="composer__attached-name">{file.name}</span>
                <span className="composer__attached-size">{formatSize(file.size)}</span>
              </div>
              <button
                type="button"
                className="composer__attached-remove"
                onClick={() => handleRemoveAttached(i)}
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="composer__error">
          <Icon name="warning" size={14} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <Icon name="x" size={12} />
          </button>
        </div>
      )}

      <textarea
        className="composer__input"
        placeholder="Digite sua mensagem..."
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <div className="composer__toolbar">
        <div className="composer__tools">
          <button
            type="button"
            className="composer__tool"
            onClick={handleAttachClick}
          >
            <Icon name="plus" size={18} />
            <span>Anexar</span>
          </button>

          <div ref={commandsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="composer__tool"
              onClick={() => {
                setShowCommands(!showCommands);
              }}
            >
              <Icon name="command" size={18} />
              <span>Comandos</span>
            </button>
            {showCommands && (
              <div className="composer__dropdown">
                <div className="composer__dropdown-header">Ferramentas</div>
                {COMMANDS.map(cmd => (
                  <button
                    key={cmd.id}
                    type="button"
                    className="composer__dropdown-item"
                    onClick={() => handleCommand(cmd)}
                  >
                    <Icon name={cmd.icon} size={14} />
                    <div>
                      <div className="composer__dropdown-item-label">{cmd.label}</div>
                      <div className="composer__dropdown-item-desc">{cmd.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <ModelSelector compact />
        </div>

        <div className="composer__send-group">
          <button type="button" className="composer__icon" aria-label="Falar">
            <Icon name="mic" size={18} />
          </button>
          {isResponding ? (
            <button
              type="button"
              className="composer__send composer__send--stop"
              aria-label="Parar"
              onClick={onStop}
            >
              <Icon name="stop" size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="composer__send"
              aria-label="Enviar mensagem"
              disabled={value.trim().length === 0 && attachedFiles.length === 0}
            >
              <Icon name="send" size={18} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
