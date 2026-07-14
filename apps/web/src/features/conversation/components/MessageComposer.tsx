import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Icon } from '@/components/common/Icon';
import { projectFiles, type LocalFile } from '@/services/files/projectFiles';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isResponding: boolean;
  onStop: () => void;
  /** Callback quando o usuário seleciona arquivos para anexar */
  onAttachFiles?: (files: LocalFile[]) => void;
  /** Callback quando o usuário seleciona um comando */
  onCommand?: (command: string) => void;
  /** Callback quando o usuário seleciona um agente */
  onAgent?: (agent: string) => void;
}

const COMMANDS = [
  { id: 'terminal', label: 'Terminal', icon: 'command' as const, description: 'Executar comando no terminal' },
  { id: 'git', label: 'Git', icon: 'box' as const, description: 'Operações git' },
  { id: 'browser', label: 'Browser', icon: 'globe' as const, description: 'Navegar na web' },
  { id: 'read', label: 'Ler arquivo', icon: 'folder' as const, description: 'Ler conteúdo de arquivo' },
  { id: 'write', label: 'Escrever arquivo', icon: 'edit' as const, description: 'Criar/editar arquivo' },
  { id: 'search', label: 'Buscar', icon: 'search' as const, description: 'Buscar no projeto' },
];

const AGENTS = [
  { id: 'coder', label: 'Coder', icon: 'code' as const, description: 'Programador Full Stack' },
  { id: 'reviewer', label: 'Reviewer', icon: 'eye' as const, description: 'Revisão de código' },
  { id: 'debugger', label: 'Debugger', icon: 'bolt' as const, description: 'Encontrar e corrigir bugs' },
  { id: 'devops', label: 'DevOps', icon: 'rocket' as const, description: 'Deploy e infraestrutura' },
  { id: 'designer', label: 'Designer', icon: 'brush' as const, description: 'UI/UX Design' },
  { id: 'analyst', label: 'Analyst', icon: 'search' as const, description: 'Análise de dados' },
];

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  isResponding,
  onStop,
  onAttachFiles,
  onCommand,
  onAgent,
}: MessageComposerProps) {
  const [showAttach, setShowAttach] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [projectFilesList, setProjectFilesList] = useState<LocalFile[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<LocalFile[]>([]);

  const attachRef = useRef<HTMLDivElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);

  // Carrega arquivos do projeto ao abrir o menu de anexar
  useEffect(() => {
    if (showAttach) {
      (async () => {
        try {
          await projectFiles.init();
          const projects = await projectFiles.listProjects();
          if (projects.length > 0) {
            const files = await projectFiles.readProjectFiles(projects[0].id);
            setProjectFilesList(files.filter(f => !f.isDirectory));
          }
        } catch {
          setProjectFilesList([]);
        }
      })();
    }
  }, [showAttach]);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setShowAttach(false);
      }
      if (commandsRef.current && !commandsRef.current.contains(e.target as Node)) {
        setShowCommands(false);
      }
      if (agentsRef.current && !agentsRef.current.contains(e.target as Node)) {
        setShowAgents(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isResponding) onSubmit();
    }
  };

  const handleAttachFile = (file: LocalFile) => {
    if (!attachedFiles.find(f => f.path === file.path)) {
      setAttachedFiles(prev => [...prev, file]);
      onAttachFiles?.([...attachedFiles, file]);
    }
    setShowAttach(false);
  };

  const handleRemoveAttached = (path: string) => {
    setAttachedFiles(prev => prev.filter(f => f.path !== path));
  };

  const handleCommand = (cmd: typeof COMMANDS[0]) => {
    onCommand?.(cmd.id);
    setShowCommands(false);
  };

  const handleAgent = (agent: typeof AGENTS[0]) => {
    onAgent?.(agent.id);
    setShowAgents(false);
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isResponding) onSubmit();
      }}
    >
      {/* Arquivos anexados */}
      {attachedFiles.length > 0 && (
        <div className="composer__attached">
          {attachedFiles.map(file => (
            <span key={file.path} className="composer__attached-file">
              {file.path}
              <button
                type="button"
                className="composer__attached-remove"
                onClick={() => handleRemoveAttached(file.path)}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
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
          {/* Botão Anexar */}
          <div ref={attachRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="composer__tool"
              onClick={() => {
                setShowAttach(!showAttach);
                setShowCommands(false);
                setShowAgents(false);
              }}
            >
              <Icon name="plus" size={18} />
              <span>Anexar</span>
            </button>
            {showAttach && (
              <div className="composer__dropdown">
                <div className="composer__dropdown-header">Arquivos do Projeto</div>
                {projectFilesList.length === 0 ? (
                  <div className="composer__dropdown-empty">Nenhum projeto aberto</div>
                ) : (
                  projectFilesList.map(file => (
                    <button
                      key={file.path}
                      type="button"
                      className="composer__dropdown-item"
                      onClick={() => handleAttachFile(file)}
                    >
                      <Icon name="folder" size={14} />
                      <span>{file.path}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Botão Comandos */}
          <div ref={commandsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="composer__tool"
              onClick={() => {
                setShowCommands(!showCommands);
                setShowAttach(false);
                setShowAgents(false);
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

          {/* Botão Agentes */}
          <div ref={agentsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="composer__tool"
              onClick={() => {
                setShowAgents(!showAgents);
                setShowAttach(false);
                setShowCommands(false);
              }}
            >
              <Icon name="agents" size={18} />
              <span>Agentes</span>
            </button>
            {showAgents && (
              <div className="composer__dropdown">
                <div className="composer__dropdown-header">Agentes IA</div>
                {AGENTS.map(agent => (
                  <button
                    key={agent.id}
                    type="button"
                    className="composer__dropdown-item"
                    onClick={() => handleAgent(agent)}
                  >
                    <Icon name={agent.icon} size={14} />
                    <div>
                      <div className="composer__dropdown-item-label">{agent.label}</div>
                      <div className="composer__dropdown-item-desc">{agent.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              disabled={value.trim().length === 0}
            >
              <Icon name="send" size={18} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
