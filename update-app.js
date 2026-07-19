const fs = require('fs');

const filePath = 'E:\\BeeHive\\apps\\control-center\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
content = content.replace(
`import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, FolderKanban, Settings, Bot, Workflow,
  BarChart3, FileText, Image, Video, Music, Scissors, Link2, Clapperboard,
  Globe, Package, Layers, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, XCircle, Send, Paperclip,
  Download, ChevronRight, Loader2, Plus, X,
  Home, Network, Search, ChevronDown, FilePlus, BrainCircuit,
  SlidersHorizontal, Paperclip as PaperclipIcon,
  Target, AlertTriangle, Rocket, Calendar, DollarSign, Code, Zap, Brain, GitBranch, Megaphone, BookOpen, Instagram, Music as MusicIcon, Video as VideoIcon, Image as ImageIcon,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive } from './services/beehiveApi';
import type { Project, Agent, Workflow as WorkflowType, Artifact, BizAccount, BizType, SocialAccount } from './types';
import './App.css';`,
`import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, FolderKanban, Settings, Bot, Workflow,
  BarChart3, FileText, Image, Video, Music, Scissors, Link2, Clapperboard,
  Globe, Package, Layers, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, XCircle, Send, Paperclip,
  Download, ChevronRight, Loader2, Plus, X,
  Home, Network, Search, ChevronDown, FilePlus, BrainCircuit,
  SlidersHorizontal, Paperclip as PaperclipIcon,
  Target, AlertTriangle, Rocket, Calendar, DollarSign, Code, Zap, Brain, GitBranch, Megaphone, BookOpen, Instagram, Music as MusicIcon, Video as VideoIcon, Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive } from './services/beehiveApi';
import { createExecutionService, UnifiedExecutionService, ExecutionConfig, ExecutionResult } from './services/execution.service';
import type { Project, Agent, Workflow as WorkflowType, Artifact, BizAccount, BizType, SocialAccount } from './types';
import './App.css;`
);

// 2. Replace ProjectCowork component
const oldCowork = `function ProjectCowork({ project }: { project: Project }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CoworkMessage[]>([
    { id: '1', type: 'assistant', content: \`🤖 **Cowork ativo no projeto \${project.name}**\n\nO BeeHive pode agora:\n• **Executar comandos bash** — digite \`$ ls\` ou \`$ npm run build\`\n• **Ler/Escrever arquivos** — use \`@arquivo.txt\` para ler ou \`@arquivo.txt:conteúdo\` para escrever\n• **Navegar na web** — \`$ browse https://site.com\`\n• **Controlar o computador** — automação via Playwright\n\nDigite um comando ou descreva o que precisa.\`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [cwd, setCwd] = useState('~/projects/' + project.name.toLowerCase().replace(/\\s+/g, '-'));
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    // Show command
    setMessages(prev => [...prev, { id: String(Date.now()), type: 'command', content: \`$ \${trimmed}\`, time: now(), meta: { command: trimmed, cwd } }]);
    setExecuting(true);

    // Simulate execution (in real app, this would call backend)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    // Mock output based on command
    let output = '';
    if (trimmed.startsWith('ls')) {
      output = \`package.json\nsrc/\npublic/\nREADME.md\ndist/\nnode_modules/\`;
    } else if (trimmed.startsWith('cat ') || trimmed.startsWith('type ')) {
      const file = trimmed.split(' ')[1];
      output = \`// \${file}\n{\n  "name": "\${project.name}",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build"\n  }\n}\`;
    } else if (trimmed.startsWith('npm ') || trimmed.startsWith('yarn ') || trimmed.startsWith('pnpm ')) {
      output = \`> \${trimmed}\n\n✔ Dependencies installed\n✔ Build completed in 2.3s\n\ndist/index.html  0.45 kB\ndist/assets/index.css  12.3 kB\ndist/assets/index.js   45.7 kB\`;
    } else if (trimmed.startsWith('git ')) {
      output = \`On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean\`;
    } else if (trimmed.startsWith('browse ') || trimmed.startsWith('open ')) {
      const url = trimmed.split(' ')[1];
      output = \`🌐 Navegando para: \${url}\n✔ Página carregada\n📄 Título: "Exemplo de Site"\n🔗 Links encontrados: 12\`;
    } else if (trimmed === 'pwd') {
      output = cwd;
    } else if (trimmed.startsWith('cd ')) {
      const dir = trimmed.slice(3).trim();
      if (dir === '..') {
        setCwd(prev => prev.split('/').slice(0, -1).join('/') || '~');
      } else if (dir.startsWith('/')) {
        setCwd(dir);
      } else {
        setCwd(prev => prev + '/' + dir);
      }
      output = \`Diretório alterado para: \${cwd}/\${dir}\`;
    } else {
      output = \`Comando executado: \${trimmed}\n\n[Simulação] Em produção, isso executaria no shell real via backend BeeHive.\`;
    }

    setMessages(prev => [...prev, { id: String(Date.now() + 1), type: 'output', content: output, time: now(), meta: { exitCode: 0, cwd } }]);
    setExecuting(false);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || executing) return;
    
    setMessages(prev => [...prev, { id: String(Date.now()), type: 'user', content: trimmed, time: now() }]);
    setInput('');
    
    // Check if it's a command (starts with $ or is a known command)
    if (trimmed.startsWith('$ ') || trimmed.match(/^(ls|cd|cat|npm|git|pwd|browse|open|mkdir|rm|cp|mv|touch|echo|grep|find)/)) {
      executeCommand(trimmed.replace(/^\\$\\s*/, ''));
    } else {
      // Natural language - AI processes
      setExecuting(true);
      setMessages(prev => [...prev, { id: String(Date.now() + 1), type: 'assistant', content: '🤔 Analisando sua solicitação...', time: now() }]);
      
      // Call AI
      const reply = await askBeeHive(\`[Projeto: \${project.name}] \${trimmed}\`);
      
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== '🤔 Analisando sua solicitação...');
        return [...filtered, { id: String(Date.now() + 2), type: 'assistant', content: reply, time: now() }];
      });
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!executing) handleSend();
    }
    if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      setHistoryIndex(i => Math.min(i + 1, history.length - 1));
      setInput(history[Math.min(historyIndex + 1, history.length - 1)] || '');
    }
    if (e.key === 'ArrowDown' && historyIndex > -1) {
      e.preventDefault();
      setHistoryIndex(i => i - 1);
      setInput(historyIndex > 0 ? history[historyIndex - 1] : '');
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete for commands
      const cmds = ['ls', 'cd', 'cat', 'npm', 'git', 'pwd', 'browse', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'echo'];
      const match = cmds.find(c => c.startsWith(input.split(' ').pop() || ''));
      if (match) setInput(input.split(' ').slice(0, -1).join(' ') + (input.includes(' ') ? ' ' : '') + match + ' ');
    }
  };`

const newCowork = `function ProjectCowork({ project }: { project: Project }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CoworkMessage[]>([
    { id: '1', type: 'assistant', content: \`🤖 **Cowork ativo no projeto \${project.name}**\n\nO BeeHive pode agora:\n• **Executar comandos bash** — digite \\\`$ ls\` ou \`$ npm run build\\\`\n• **Ler/Escrever arquivos** — use \`@arquivo.txt\` para ler ou \`@arquivo.txt:conteúdo\` para escrever\n• **Navegar na web** — \\\`$ browse https://site.com\\\`\n• **Controlar o computador** — automação via Playwright\n\nDigite um comando ou descreva o que precisa.\`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [cwd, setCwd] = useState('~/projects/' + project.name.toLowerCase().replace(/\\s+/g, '-'));
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Execution service
  const executionServiceRef = useRef<UnifiedExecutionService | null>(null);
  
  useEffect(() => {
    executionServiceRef.current = createExecutionService({
      cwd: process.cwd(),
      env: { ...process.env, BEEHIVE_PROJECT: project.name },
    });
    
    // Listen for execution events
    executionServiceRef.current.on('data', (event: any) => {
      if (event.type === 'stdout' || event.type === 'stderr') {
        // Could stream output in real-time here
      }
    });
    
    return () => {
      executionServiceRef.current?.getLocalService().killAll();
    };
  }, [project.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    // Show command
    setMessages(prev => [...prev, { id: String(Date.now()), type: 'command', content: \`$ \${trimmed}\`, time: now(), meta: { command: trimmed, cwd } }]);
    setExecuting(true);

    try {
      // Execute via unified service (tries MCP first, falls back to local)
      const service = executionServiceRef.current!;
      const result = await service.execute(trimmed, { cwd, env: { ...process.env, BEEHIVE_PROJECT: project.name } });
      
      let output = result.stdout;
      if (result.stderr) output += '\\n' + result.stderr;
      
      // Handle cd command specially
      if (trimmed.startsWith('cd ')) {
        const dir = trimmed.slice(3).trim();
        if (dir === '..') {
          setCwd(prev => prev.split('/').slice(0, -1).join('/') || '~');
        } else if (dir.startsWith('/')) {
          setCwd(dir);
        } else {
          setCwd(prev => prev + '/' + dir);
        }
      }
      
      setMessages(prev => [...prev, { 
        id: String(Date.now() + 1), 
        type: 'output', 
        content: output || '[sem saída]', 
        time: now(), 
        meta: { exitCode: result.exitCode, cwd } 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: String(Date.now() + 1), 
        type: 'output', 
        content: \`Erro: \${error instanceof Error ? error.message : String(error)}\`, 
        time: now(),
        meta: { exitCode: -1, cwd } 
      }]);
    } finally {
      setExecuting(false);
    }
  };`

content = content.replace(oldCowork, newCowork);

// 3. Fix imports - add Trash2 to imports
content = content.replace(
`import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, FolderKanban, Settings, Bot, Workflow,
  BarChart3, FileText, Image, Video, Music, Scissors, Link2, Clapperboard,
  Globe, Package, Layers, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, XCircle, Send, Paperclip,
  Download, ChevronRight, Loader2, Plus, X,
  Home, Network, Search, ChevronDown, FilePlus, BrainCircuit,
  SlidersHorizontal, Paperclip as PaperclipIcon,
  Target, AlertTriangle, Rocket, Calendar, DollarSign, Code, Zap, Brain, GitBranch, Megaphone, BookOpen, Instagram, Music as MusicIcon, Video as VideoIcon, Image as ImageIcon,
} from 'lucide-react';`,
`import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, FolderKanban, Settings, Bot, Workflow,
  BarChart3, FileText, Image, Video, Music, Scissors, Link2, Clapperboard,
  Globe, Package, Layers, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, XCircle, Send, Paperclip,
  Download, ChevronRight, Loader2, Plus, X,
  Home, Network, Search, ChevronDown, FilePlus, BrainCircuit,
  SlidersHorizontal, Paperclip as PaperclipIcon,
  Target, AlertTriangle, Rocket, Calendar, DollarSign, Code, Zap, Brain, GitBranch, Megaphone, BookOpen, Instagram, Music as MusicIcon, Video as VideoIcon, Image as ImageIcon,
  Trash2,
} from 'lucide-react';`);

// 4. Fix imports
content = content.replace(
`import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, FolderKanban, Settings, Bot, Workflow,
  BarChart3, FileText, Image, Video, Music, Scissors, Link2, Clapperboard,
  Globe, Package, Layers, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, XCircle, Send, Paperclip,
  Download, ChevronRight, Loader2, Plus, X,
  Home, Network, Search, ChevronDown, FilePlus, BrainCircuit,
  SlidersHorizontal, Paperclip as PaperclipIcon,
  Target, AlertTriangle, Rocket, Calendar, DollarSign, Code, Zap, Brain, GitBranch, Megaphone, BookOpen, Instagram, Music as MusicIcon, Video as VideoIcon, Image as ImageIcon,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive } from './services/beehiveApi';
import type { Project, Agent, Workflow as WorkflowType, Artifact, BizAccount, BizType, SocialAccount } from './types';
import './App.css';`,
`import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, FolderKanban, Settings, Bot, Workflow,
  BarChart3, FileText, Image, Video, Music, Scissors, Link2, Clapperboard,
  Globe, Package, Layers, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, XCircle, Send, Paperclip,
  Download, ChevronRight, Loader2, Plus, X,
  Home, Network, Search, ChevronDown, FilePlus, BrainCircuit,
  SlidersHorizontal, Paperclip as PaperclipIcon,
  Target, AlertTriangle, Rocket, Calendar, DollarSign, Code, Zap, Brain, GitBranch, Megaphone, BookOpen, Instagram, Music as MusicIcon, Video as VideoIcon, Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive } from './services/beehiveApi';
import { createExecutionService, UnifiedExecutionService, ExecutionConfig, ExecutionResult } from './services/execution.service';
import type { Project, Agent, Workflow as WorkflowType, Artifact, BizAccount, BizType, SocialAccount } from './types';
import './App.css';`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');