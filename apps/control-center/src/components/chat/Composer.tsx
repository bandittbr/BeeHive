"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { $getRoot, $getSelection, $isRangeSelection, $createTextNode, $createParagraphNode, $isElementNode, LexicalEditor } from "lexical";
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $createCodeNode, CodeNode } from "@lexical/code";
import { $createLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $createListItemNode, $createListNode, ListItemNode, ListNode } from "@lexical/list";
import { $createHashtagNode, HashtagNode, addHashtag } from "@lexical/hashtag";
import { $createTableNode, $createTableCellNode, $createTableRowNode, TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { $createImageNode, ImageNode } from "@lexical/file";
import { $createParagraphNode, ParagraphNode } from "lexical";
import { cn } from "@/lib/utils";
import { 
  Bold, Italic, Strikethrough, Code, Type, List, ListOrdered, 
  Quote, Link, Image, Minus, Heading1, Heading2, Heading3,
  ChevronDown, X, Search, Bot, FileText, Zap, Hash, Table,
  Hashtag, AtSign
} from "lucide-react";

const initialConfig = {
  namespace: "Composer",
  theme: {
    paragraph: "composer-paragraph",
    heading: {
      h1: "composer-heading-h1",
      h2: "composer-heading-h2",
      h3: "composer-heading-h3",
    },
    list: {
      nested: {
        listitem: "composer-nested-listitem",
      },
      ol: "composer-ol",
      ul: "composer-ul",
      listitem: "composer-listitem",
    },
    link: "composer-link",
    text: {
      bold: "composer-bold",
      italic: "composer-italic",
      underline: "composer-underline",
      strikethrough: "composer-strikethrough",
      underlineStrikethrough: "composer-underline-strikethrough",
      code: "composer-code",
      highlight: "composer-highlight",
      subscript: "composer-subscript",
      superscript: "composer-superscript",
    },
    quote: "composer-quote",
    code: "composer-code-block",
    codeHighlight: {
      atrule: "composer-atrule",
      attr: "composer-attr",
      boolean: "composer-boolean",
      builtin: "composer-builtin",
      cdata: "composer-cdata",
      char: "composer-char",
      class: "composer-class",
      comment: "composer-comment",
      constant: "composer-constant",
      deleted: "composer-deleted",
      doctype: "composer-doctype",
      entity: "composer-entity",
      function: "composer-function",
      important: "composer-important",
      inserted: "composer-inserted",
      keyword: "composer-keyword",
      namespace: "composer-namespace",
      number: "composer-number",
      operator: "composer-operator",
      prolog: "composer-prolog",
      property: "composer-property",
      punctuation: "composer-punctuation",
      regex: "composer-regex",
      selector: "composer-selector",
      string: "composer-string",
      symbol: "composer-symbol",
      tag: "composer-tag",
      url: "composer-url",
    },
    table: "composer-table",
    tableCell: "composer-table-cell",
    tableCellHeader: "composer-table-cell-header",
    tableRow: "composer-table-row",
    image: "composer-image",
    hashtag: "composer-hashtag",
    horizontalRule: "composer-hr",
  },
  onError: (error: Error) => {
    console.error("Lexical error:", error);
  },
};

type ComposerProps = {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: number;
  showToolbar?: boolean;
};

const commands = [
  { id: "agent", label: "Agent", description: "Selecionar agente", icon: Bot },
  { id: "file", label: "Arquivo", description: "Anexar arquivo", icon: FileText },
  { id: "skill", label: "Skill", description: "Executar skill", icon: Zap },
];

const mentions = [
  { id: "agent-1", label: "Analista de Dados", type: "agent" },
  { id: "agent-2", label: "Gerador de Código", type: "agent" },
  { id: "agent-3", label: "Redator de Conteúdo", type: "agent" },
  { id: "file-1", label: "relatorio_q4.pdf", type: "file" },
  { id: "file-2", label: "dados_vendas.csv", type: "file" },
];

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{children}</h2>;
}

function Quote({ children }: { children: React.ReactNode }) {
  return <blockquote style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '16px', margin: '12px 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{children}</blockquote>;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', overflowX: 'auto', margin: '12px 0' }}><code>{children}</code></pre>;
}

function ListItem({ children }: { children: React.ReactNode }) {
  return <li style={{ margin: '4px 0' }}>{children}</li>;
}

function OrderedListItem({ children }: { children: React.ReactNode }) {
  return <li style={{ margin: '4px 0' }}>{children}</li>;
}

function UnorderedList({ children }: { children: React.ReactNode }) {
  return <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>{children}</ul>;
}

function OrderedList({ children }: { children: React.ReactNode }) {
  return <ol style={{ paddingLeft: '24px', margin: '8px 0' }}>{children}</ol>;
}

function LinkComponent({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: '2px' }} {...props}>{children}</a>;
}

function HashtagComponent({ children }: { children: React.ReactNode }) {
  return <span className="hashtag">{children}</span>;
}

function MentionComponent({ children }: { children: React.ReactNode }) {
  return <span className="mention">{children}</span>;
}

export function Composer({
  value = "",
  onChange,
  onSubmit,
  placeholder = "Digite sua mensagem... (Shift+Enter para nova linha, / para comandos, @ para menções)",
  disabled = false,
  maxHeight = 200,
  showToolbar = true,
}: ComposerProps) {
  const [editor, setEditor] = useState<LexicalEditor | null>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [commandPosition, setCommandPosition] = useState<{ x: number; y: number } | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState<{ x: number; y: number } | null>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<LexicalEditor | null>(null);

  const filteredCommands = commands.filter(c => 
    c.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const filteredMentions = mentions.filter(m =>
    m.label.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const content = getEditorContent();
      onSubmit?.(content);
    }

    if (event.key === "/") {
      const selection = editorRef.current?.getEditorState().read(() => $getSelection());
      if (selection && $isRangeSelection(selection) && selection.isCollapsed()) {
        const anchorNode = selection.anchor.getNode();
        const text = anchorNode.getTextContent();
        const offset = selection.anchor.offset;
        if (text.slice(0, offset).trim() === "") {
          event.preventDefault();
          const rect = contentEditableRef.current?.getBoundingClientRect();
          if (rect) {
            setCommandPosition({ x: rect.left, y: rect.bottom });
            setShowCommandMenu(true);
            setCommandSearch("");
          }
        }
      }
    }

    if (event.key === "@") {
      const selection = editorRef.current?.getEditorState().read(() => $getSelection());
      if (selection && $isRangeSelection(selection) && selection.isCollapsed()) {
        const anchorNode = selection.anchor.getNode();
        const text = anchorNode.getTextContent();
        const offset = selection.anchor.offset;
        if (text.slice(0, offset).trim().endsWith("@") || text.slice(0, offset) === "") {
          event.preventDefault();
          const rect = contentEditableRef.current?.getBoundingClientRect();
          if (rect) {
            setMentionPosition({ x: rect.left, y: rect.bottom });
            setShowMentionMenu(true);
            setMentionSearch("");
          }
        }
      }
    }

    if (event.key === "Escape") {
      setShowCommandMenu(false);
      setShowMentionMenu(false);
    }

    if (event.key === "ArrowDown" && (showCommandMenu || showMentionMenu)) {
      event.preventDefault();
    }

    if (event.key === "ArrowUp" && (showCommandMenu || showMentionMenu)) {
      event.preventDefault();
    }
  }, [editor, onSubmit, showCommandMenu, showMentionMenu]);

  const getEditorContent = useCallback(() => {
    if (!editorRef.current) return "";
    return editorRef.current.getEditorState().read(() => {
      const root = $getRoot();
      return root.getTextContent();
    });
  }, []);

  const insertCommand = useCallback((commandId: string) => {
    editorRef.current?.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        if ($isElementNode(anchorNode)) {
          const textContent = anchorNode.getTextContent();
          const newText = textContent.replace(/^\/.*$/, "") + commandId + " ";
          anchorNode.select();
          selection.insertText(newText);
        }
      }
    });
    setShowCommandMenu(false);
  }, []);

  const insertMention = useCallback((mentionLabel: string) => {
    editorRef.current?.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        if ($isElementNode(anchorNode)) {
          const textContent = anchorNode.getTextContent();
          const newText = textContent.replace(/@[^@]*$/, "") + "@" + mentionLabel + " ";
          anchorNode.select();
          selection.insertText(newText);
        }
      }
    });
    setShowMentionMenu(false);
  }, []);

  const handleContentChange = useCallback(() => {
    if (!editorRef.current || !onChange) return;
    const content = editorRef.current.getEditorState().read(() => {
      const root = $getRoot();
      return root.getTextContent();
    });
    onChange(content);
  }, [onChange]);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      editorRef.current.update(() => {
        const root = $getRoot();
        const currentText = root.getTextContent();
        if (currentText !== value) {
          root.clear();
          const paragraph = $createParagraphNode();
          const textNode = $createTextNode(value);
          paragraph.append(textNode);
          root.append(paragraph);
        }
      });
    }
  }, [value]);

  return (
    <div className="composer" style={{ maxHeight }}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="composer-wrapper">
          {showToolbar && (
            <div className="composer-toolbar" role="toolbar" aria-label="Formatação">
              <div className="toolbar-group">
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.dispatchCommand(TOGGLE_LINK_COMMAND, "https://")}
                  title="Link"
                  disabled={disabled}
                ><Link size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.dispatchCommand("FORMAT_TEXT", "bold")}
                  title="Negrito (Ctrl+B)"
                  disabled={disabled}
                ><Bold size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.dispatchCommand("FORMAT_TEXT", "italic")}
                  title="Itálico (Ctrl+I)"
                  disabled={disabled}
                ><Italic size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.dispatchCommand("FORMAT_TEXT", "strikethrough")}
                  title="Tachado"
                  disabled={disabled}
                ><Strikethrough size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.dispatchCommand("FORMAT_TEXT", "code")}
                  title="Código inline"
                  disabled={disabled}
                ><Code size={14} /></button>
              </div>
              <div className="toolbar-divider" />
              <div className="toolbar-group">
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const paragraph = $createParagraphNode();
                      selection.insertNodes([paragraph]);
                    }
                  })}
                  title="Parágrafo"
                  disabled={disabled}
                ><Type size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const heading = $createHeadingNode("h1");
                      selection.insertNodes([heading]);
                    }
                  })}
                  title="Título H1"
                  disabled={disabled}
                ><Heading1 size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const heading = $createHeadingNode("h2");
                      selection.insertNodes([heading]);
                    }
                  })}
                  title="Título H2"
                  disabled={disabled}
                ><Heading2 size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const heading = $createHeadingNode("h3");
                      selection.insertNodes([heading]);
                    }
                  })}
                  title="Título H3"
                  disabled={disabled}
                ><Heading3 size={14} /></button>
              </div>
              <div className="toolbar-divider" />
              <div className="toolbar-group">
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const list = $createListNode("bullet");
                      const item = $createListItemNode();
                      list.append(item);
                      selection.insertNodes([list]);
                    }
                  })}
                  title="Lista com marcadores"
                  disabled={disabled}
                ><List size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const list = $createListNode("number");
                      const item = $createListItemNode();
                      list.append(item);
                      selection.insertNodes([list]);
                    }
                  })}
                  title="Lista numerada"
                  disabled={disabled}
                ><ListOrdered size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const quote = $createQuoteNode();
                      selection.insertNodes([quote]);
                    }
                  })}
                  title="Citação"
                  disabled={disabled}
                ><Quote size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const code = $createCodeNode();
                      selection.insertNodes([code]);
                    }
                  })}
                  title="Bloco de código"
                  disabled={disabled}
                ><Code size={14} /></button>
              </div>
              <div className="toolbar-divider" />
              <div className="toolbar-group">
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const hashtag = $createHashtagNode("#tag");
                      selection.insertNodes([hashtag]);
                    }
                  })}
                  title="Hashtag"
                  disabled={disabled}
                ><Hash size={14} /></button>
                <button 
                  type="button" 
                  className="toolbar-btn"
                  onClick={() => editorRef.current?.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const table = $createTableNode({ rows: 3, cols: 3 });
                      selection.insertNodes([table]);
                    }
                  })}
                  title="Tabela"
                  disabled={disabled}
                ><Table size={14} /></button>
              </div>
            </div>
          )}
          
          <RichTextPlugin
            contentEditable={<ContentEditable 
              ref={contentEditableRef}
              className="composer-content"
              placeholder={placeholder}
              style={{ maxHeight }}
            />}
            placeholder={<PlainTextPlugin
              contentEditable={<div className="composer-content" style={{ maxHeight }} />}
              placeholder={placeholder}
            />}
            ErrorBoundary={() => null}
          />
          
          <HistoryPlugin />
          <AutoFocusPlugin />
        </div>

        {/* Command Menu */}
        {showCommandMenu && commandPosition && (
          <div 
            className="composer-command-menu"
            style={{ left: commandPosition.x, top: commandPosition.y }}
          >
            <input
              type="text"
              className="composer-command-search"
              placeholder="Buscar comando..."
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
              autoFocus
            />
            <div className="composer-command-list">
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  className="composer-command-item"
                  onClick={() => insertCommand(cmd.id)}
                >
                  <cmd.icon className="composer-command-icon" size={16} />
                  <span className="composer-command-label">{cmd.label}</span>
                  <span className="composer-command-desc">{cmd.description}</span>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <div className="composer-command-item" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Nenhum comando encontrado
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mention Menu */}
        {showMentionMenu && mentionPosition && (
          <div 
            className="composer-mention-menu"
            style={{ left: mentionPosition.x, top: mentionPosition.y }}
          >
            <input
              type="text"
              className="composer-mention-search"
              placeholder="Buscar menção..."
              value={mentionSearch}
              onChange={(e) => setMentionSearch(e.target.value)}
              autoFocus
            />
            <div className="composer-mention-list">
              {filteredMentions.map((mention) => (
                <button
                  key={mention.id}
                  className="composer-mention-item"
                  onClick={() => insertMention(mention.label)}
                >
                  <span className="composer-mention-type">
                    {mention.type === "agent" ? <Bot size={14} /> : <FileText size={14} />}
                  </span>
                  <span className="composer-mention-label">{mention.label}</span>
                </button>
              ))}
              {filteredMentions.length === 0 && (
                <div className="composer-mention-item" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Nenhuma menção encontrada
                </div>
              )}
            </div>
          </div>
        )}
      </LexicalComposer>
    </div>
  );
}