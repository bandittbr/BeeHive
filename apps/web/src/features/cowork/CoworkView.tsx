import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '@/components/common/Icon';
import { projectFiles, type LocalFile } from '@/services/files/projectFiles';
import { useConversations } from '@/features/conversation/ConversationStore';
import './CoworkView.css';

interface CoworkViewProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

export function CoworkView({ projectId, projectName, onBack }: CoworkViewProps) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<LocalFile | null>(null);
  const [filePanelOpen, setFilePanelOpen] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalCommand, setTerminalCommand] = useState('');
  const [messageValue, setMessageValue] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  const {
    activeMessages,
    respondingId,
    sendMessage,
    stop,
  } = useConversations();

  const isResponding = respondingId !== null;
  const hasMessages = activeMessages.length > 0;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await projectFiles.init();
        const allFiles = await projectFiles.readProjectFiles(projectId);
        setFiles(allFiles);
      } catch {
        setFiles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const buildProjectContext = useCallback(() => {
    if (files.length === 0) return '';
    const lines: string[] = [
      `## Projeto: ${projectName}`,
      `## Arquivos (${files.length}):`,
      '',
    ];
    for (const file of files) {
      if (file.isDirectory) continue;
      lines.push(`### ${file.path}`);
      if (file.content.startsWith('[Arquivo binário')) {
        lines.push(file.content);
      } else {
        lines.push('```');
        lines.push(file.content);
        lines.push('```');
      }
      lines.push('');
    }
    return lines.join('\n');
  }, [files, projectName]);

  const handleSendMessage = () => {
    const text = messageValue.trim();
    if (!text) return;
    const context = buildProjectContext();
    const fullMessage = context ? `${context}\n\n---\n\n${text}` : text;
    sendMessage(fullMessage);
    setMessageValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRunTerminal = async () => {
    if (!terminalCommand.trim()) return;
    const cmd = terminalCommand.trim();
    setTerminalCommand('');
    setTerminalOutput(prev => [...prev, `$ ${cmd}`]);

    try {
      const { API_BASE } = await import('@/lib/api');
      const res = await fetch(`${API_BASE}/runtime/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'terminal.execute',
          payload: { command: cmd },
        }),
      });
      const data = await res.json();
      if (data.result?.stdout) {
        setTerminalOutput(prev => [...prev, data.result.stdout]);
      }
      if (data.result?.stderr) {
        setTerminalOutput(prev => [...prev, `STDERR: ${data.result.stderr}`]);
      }
      if (data.error) {
        setTerminalOutput(prev => [...prev, `ERRO: ${data.error}`]);
      }
    } catch (err: any) {
      setTerminalOutput(prev => [...prev, `ERRO: ${err.message}`]);
    }
  };

  const fileTree = files.filter(f => !f.isDirectory);

  return (
    <div className="cowork">
      {filePanelOpen && (
        <div className="cowork__files">
          <div className="cowork__files-header">
            <Icon name="folder" size={16} />
            <span>{projectName}</span>
            <button className="cowork__panel-close" onClick={() => setFilePanelOpen(false)}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <div className="cowork__files-list">
            {loading ? (
              <div className="cowork__files-loading">Carregando...</div>
            ) : fileTree.length === 0 ? (
              <div className="cowork__files-empty">Nenhum arquivo</div>
            ) : (
              fileTree.map((file) => (
                <button
                  key={file.path}
                  className={`cowork__file-item ${selectedFile?.path === file.path ? 'cowork__file-item--active' : ''}`}
                  onClick={() => setSelectedFile(file)}
                >
                  <Icon name="folder" size={14} />
                  <span>{file.path}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="cowork__main">
        <div className="cowork__header">
          {!filePanelOpen && (
            <button className="cowork__toggle-panel" onClick={() => setFilePanelOpen(true)}>
              <Icon name="folder" size={16} />
            </button>
          )}
          <button className="cowork__back" onClick={onBack}>
            <Icon name="arrow-right" size={16} />
            <span>Voltar</span>
          </button>
          <div className="cowork__title">
            <Icon name="sparkles" size={16} />
            <span>Cowork — {projectName}</span>
          </div>
          <div className="cowork__header-actions">
            <button
              className={`cowork__toggle-terminal ${terminalOpen ? 'cowork__toggle-terminal--active' : ''}`}
              onClick={() => setTerminalOpen(!terminalOpen)}
            >
              <Icon name="command" size={16} />
              <span>Terminal</span>
            </button>
          </div>
        </div>

        <div className="cowork__content">
          <div className="cowork__chat">
            <div className="cowork__messages">
              {hasMessages ? (
                <div className="cowork__thread">
                  {activeMessages.map((msg) => (
                    <div key={msg.id} className={`message message--${msg.role}`}>
                      <div className="message__head">
                        <span className="message__role">
                          {msg.role === 'user' ? 'Voce' : 'BigPickle'}
                        </span>
                      </div>
                      <div className="message__body">
                        <div className="message__text">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cowork__welcome">
                  <Icon name="sparkles" size={32} />
                  <h3>Cowork com BigPickle</h3>
                  <p>Prompt sobre o projeto <strong>{projectName}</strong></p>
                  <p className="cowork__welcome-hint">
                    A IA pode ver seus arquivos, rodar comandos, editar codigo e mais.
                  </p>
                </div>
              )}
            </div>
            <div className="cowork__composer">
              <div className="composer">
                <textarea
                  className="composer__input"
                  placeholder="Descreva o que quer fazer no projeto..."
                  rows={1}
                  value={messageValue}
                  onChange={(e) => setMessageValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="composer__toolbar">
                  <div className="composer__tools">
                    <button type="button" className="composer__tool" onClick={() => setFilePanelOpen(!filePanelOpen)}>
                      <Icon name="folder" size={18} />
                      <span>Arquivos</span>
                    </button>
                    <button type="button" className="composer__tool" onClick={() => setTerminalOpen(!terminalOpen)}>
                      <Icon name="command" size={18} />
                      <span>Terminal</span>
                    </button>
                  </div>
                  <div className="composer__send-group">
                    {isResponding ? (
                      <button
                        type="button"
                        className="composer__send composer__send--stop"
                        onClick={stop}
                      >
                        <Icon name="stop" size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="composer__send"
                        disabled={messageValue.trim().length === 0}
                        onClick={handleSendMessage}
                      >
                        <Icon name="send" size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {terminalOpen && (
            <div className="cowork__terminal">
              <div className="cowork__terminal-header">
                <Icon name="command" size={14} />
                <span>Terminal</span>
                <button onClick={() => setTerminalOutput([])}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
              <div className="cowork__terminal-output" ref={terminalRef}>
                {terminalOutput.length === 0 ? (
                  <div className="cowork__terminal-empty">Nenhum comando executado</div>
                ) : (
                  terminalOutput.map((line, i) => (
                    <div key={i} className={`cowork__terminal-line ${line.startsWith('$') ? 'cowork__terminal-line--cmd' : ''}`}>
                      {line}
                    </div>
                  ))
                )}
              </div>
              <div className="cowork__terminal-input">
                <span className="cowork__terminal-prompt">$</span>
                <input
                  value={terminalCommand}
                  onChange={(e) => setTerminalCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunTerminal()}
                  placeholder="Digite um comando..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="cowork__preview">
          <div className="cowork__preview-header">
            <Icon name="folder" size={14} />
            <span>{selectedFile.path}</span>
            <button onClick={() => setSelectedFile(null)}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <pre className="cowork__preview-content">
            {selectedFile.content}
          </pre>
        </div>
      )}
    </div>
  );
}
