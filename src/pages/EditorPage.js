import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import LanguageSelector from '../components/LanguageSelector';
import ChatPanel from '../components/ChatPanel';
import FileExplorer from '../components/FileExplorer';
import ThemeSelector, { getSavedTheme, STORAGE_KEY } from '../components/ThemeSelector';
import { initSocket } from '../socket';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';
import { useNavigate, Navigate, useParams } from 'react-router-dom';
import { LANGUAGES } from '../components/LanguageSelector';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExtension(f) { return f.split('.').pop().toLowerCase(); }

function langLabelFromFilename(filename) {
  const ext = getExtension(filename);
  const map = { js:'JavaScript',ts:'TypeScript',py:'Python',java:'Java',c:'C',cpp:'C++',html:'HTML',css:'CSS',json:'JSON',md:'Markdown',sql:'SQL' };
  return map[ext] || 'JavaScript';
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const Ico = ({ d, d2, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>{d2 && <path d={d2}/>}
  </svg>
);

const IcoNew    = () => <Ico d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2z" d2="M9 2v4h4M8 9v4M6 11h4"/>;
const IcoRename = () => <Ico d="M11 2l3 3-8 8H3v-3L11 2z"/>;
const IcoDelete = () => <Ico d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>;
const IcoDl     = () => <Ico d="M8 2v8M5 7l3 3 3-3M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1"/>;
const IcoShare  = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/>
    <path d="M5.4 8.8l5.2 3.3M10.6 4l-5.2 3.2"/>
  </svg>
);
const IcoLeave  = () => <Ico d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6"/>;
const IcoCopy   = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>
  </svg>
);
const IcoChat   = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 10a1 1 0 0 1-1 1H5l-3 3V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7z"/>
  </svg>
);
const IcoFiles  = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M10 2v4h4"/>
  </svg>
);
const IcoClose  = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>;
const IcoChevL  = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>;
const IcoChevR  = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 3l5 5-5 5"/></svg>;

// ─── NewFileDialog ─────────────────────────────────────────────────────────

const NewFileDialog = ({ onConfirm, onCancel }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const submit = () => { const t = value.trim(); if (t) onConfirm(t); };
  return (
    <div className="nfd-overlay" onClick={onCancel}>
      <div className="nfd-box" onClick={e => e.stopPropagation()}>
        <div className="nfd-title">Create New File</div>
        <input
          ref={inputRef}
          className="nfd-input"
          placeholder="e.g. index.js, styles.css"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        />
        <div className="nfd-actions">
          <button className="nfd-btn nfd-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="nfd-btn nfd-btn--primary" onClick={submit} disabled={!value.trim()}>Create</button>
        </div>
      </div>
    </div>
  );
};

// ─── CollaboratorList ─────────────────────────────────────────────────────────

const CollaboratorList = memo(({ clients }) => {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE_LIMIT = 4;

  const hasOverflow = clients.length > VISIBLE_LIMIT;
  const visibleClients = expanded ? clients : clients.slice(0, VISIBLE_LIMIT);

  return (
    <div className="collab-list">
      {visibleClients.map(client => (
        <div key={client.socketId} className="sidebar-user-row">
          <div className="sidebar-avatar"><Client username={client.username} /></div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{client.username}</div>
            <div className="sidebar-user-online">online</div>
          </div>
        </div>
      ))}

      {hasOverflow && (
        <button
          className="collab-expand-btn"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
        >
          {expanded
            ? 'Show less'
            : `+${clients.length - VISIBLE_LIMIT} more collaborator${clients.length - VISIBLE_LIMIT > 1 ? 's' : ''}`
          }
        </button>
      )}

      {clients.length === 0 && (
        <div className="collab-empty">No collaborators yet</div>
      )}
    </div>
  );
});

// ─── SidebarContent (memoized — must live OUTSIDE EditorPage so React never
//     treats it as a new component type on re-render, which would unmount
//     CollaboratorList and cause the avatar flicker) ─────────────────────────

const SidebarContent = memo(({
  clients, shortRoomId, roomId, copyRoomId,
  language, onLanguageChange, theme, onThemeChange,
  downloadCode, leaveRoom,
}) => (
  <div className="asideInner">

    {/* Section: Room */}
    <div className="sidebar-section sidebar-section--first">
      <div className="sidebar-section-label">Room</div>
      <div className="sidebar-room-card">
        <div className="sidebar-room-id-row">
          <span className="sidebar-room-id" title={roomId}>{shortRoomId}</span>
          <button className="sidebar-copy-btn" onClick={copyRoomId} title="Copy Room ID" aria-label="Copy room ID">
            <IcoCopy />
          </button>
        </div>
      </div>
    </div>

    {/* Section: Collaborators */}
    <div className="sidebar-section">
      <div className="sidebar-section-label" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>Collaborators</span>
        <span className="sidebar-user-count">{clients.length}</span>
      </div>
      <CollaboratorList clients={clients} />
    </div>

    <div className="sidebar-divider" />

    {/* Section: Workspace */}
    <div className="sidebar-section">
      <div className="sidebar-section-label">Workspace</div>
    </div>
    <div className="languageSelectorWrap" style={{ paddingBottom: '8px' }}>
      <LanguageSelector selectedLanguage={language} onLanguageChange={onLanguageChange} />
    </div>
    <div style={{ padding: '0 12px 4px' }}>
      <ThemeSelector selectedTheme={theme} onThemeChange={onThemeChange} />
    </div>

    {/* Spacer pushes actions down */}
    <div className="sidebar-spacer" />

    <div className="sidebar-divider" />

    {/* Section: Actions */}
    <div className="sidebar-section">
      <div className="sidebar-section-label">Actions</div>
    </div>
    <div className="sidebar-controls">
      <button className="sidebar-btn sidebar-btn--accent" onClick={downloadCode}>
        <span className="sidebar-btn-icon"><IcoDl /></span>Download File
      </button>
      <button className="sidebar-btn" onClick={copyRoomId}>
        <span className="sidebar-btn-icon"><IcoShare /></span>Share Room
      </button>
    </div>

    <div className="sidebar-divider sidebar-divider--danger" />

    {/* Section: Danger Zone */}
    <div className="sidebar-controls sidebar-controls--danger">
      <button className="sidebar-btn sidebar-btn--danger sidebar-btn--leave" onClick={leaveRoom}>
        <span className="sidebar-btn-icon"><IcoLeave /></span>Leave Room
      </button>
    </div>

  </div>
));

// ─── EditorPage ───────────────────────────────────────────────────────────────

const EditorPage = () => {
  const socketRef      = useRef(null);
  const location       = useLocation();
  const { roomId }     = useParams();
  const reactNavigator = useNavigate();

  const [clients, setClients]       = useState([]);
  const [files, setFiles]           = useState({});
  const [activeFile, setActiveFile] = useState('main.js');

  const activeFileRef = useRef(activeFile);
  useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const language = files[activeFile]?.language || 'JavaScript';

  const [currentCode, setCurrentCode]   = useState('');
  const [theme, setTheme]               = useState(getSavedTheme);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatUnread, setChatUnread]     = useState(0);

  // Layout states
  const [explorerCollapsed, setExplorerCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sw-explorer-collapsed');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);
  const [newFileOpen, setNewFileOpen]   = useState(false);

  const toggleExplorer = () => {
    setExplorerCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sw-explorer-collapsed', String(next)); } catch {}
      return next;
    });
  };

  const addMessage = msg => setChatMessages(prev => [...prev, msg]);

  const loadFileIntoEditor = useCallback((filename, content) => {
    const cm = document.querySelector('.CodeMirror')?.CodeMirror;
    if (cm) {
      cm.setValue(content ?? '');
      cm.setOption('mode', (() => {
        const lang = LANGUAGES.find(l => l.label === langLabelFromFilename(filename));
        return lang?.mime || 'text/javascript';
      })());
    }
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on('connect_error', handleErrors);
      socketRef.current.on('connect_failed', handleErrors);
      function handleErrors(e) {
        console.error('socket error', e);
        toast.error('Socket connection failed, try again later.');
        reactNavigator('/');
      }
      socketRef.current.emit(ACTIONS.JOIN, { roomId, username: location.state?.username });
      socketRef.current.on(ACTIONS.JOINED, ({ clients, username }) => {
        if (username !== location.state?.username) toast.success(`${username} joined.`);
        setClients(clients);
      });
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left.`);
        setClients(prev => prev.filter(c => c.socketId !== socketId));
      });
      socketRef.current.on(ACTIONS.SYNC_FILES, ({ files: sf, activeFile: sa }) => {
        setFiles(sf); setActiveFile(sa);
        setTimeout(() => loadFileIntoEditor(sa, sf[sa]?.content ?? ''), 50);
      });
      socketRef.current.on(ACTIONS.FILE_CONTENT_CHANGE, ({ filename, content }) => {
        setFiles(prev => !prev[filename] ? prev : { ...prev, [filename]: { ...prev[filename], content } });
      });
      socketRef.current.on(ACTIONS.CREATE_FILE, ({ filename, file, activeFile: na }) => {
        setFiles(prev => ({ ...prev, [filename]: file }));
        setActiveFile(na); loadFileIntoEditor(na, file.content ?? '');
        toast.success(`${filename} created`);
      });
      socketRef.current.on(ACTIONS.DELETE_FILE, ({ filename, newActive }) => {
        setFiles(prev => { const n = { ...prev }; delete n[filename]; return n; });
        if (activeFileRef.current === filename) {
          setActiveFile(newActive);
          setTimeout(() => { const f = filesRef.current[newActive]; loadFileIntoEditor(newActive, f?.content ?? ''); }, 30);
        }
        toast(`${filename} deleted`);
      });
      socketRef.current.on(ACTIONS.RENAME_FILE, ({ oldName, newName, newLanguage }) => {
        setFiles(prev => {
          const n = { ...prev };
          if (n[oldName]) { n[newName] = { ...n[oldName], language: newLanguage }; delete n[oldName]; }
          return n;
        });
        if (activeFileRef.current === oldName) setActiveFile(newName);
        toast(`${oldName} → ${newName}`);
      });
      socketRef.current.on(ACTIONS.CHAT_MESSAGE, ({ message }) => {
        addMessage({ id: `${Date.now()}-${Math.random()}`, type: 'user', username: message.username, text: message.text, timestamp: message.timestamp, isSelf: false });
      });
      socketRef.current.on(ACTIONS.CHAT_SYSTEM, ({ text, timestamp }) => {
        addMessage({ id: `sys-${Date.now()}`, type: 'system', text, timestamp });
      });
    };
    init();
    return () => {
      [ACTIONS.JOINED,ACTIONS.DISCONNECTED,ACTIONS.SYNC_FILES,ACTIONS.FILE_CONTENT_CHANGE,
       ACTIONS.CREATE_FILE,ACTIONS.DELETE_FILE,ACTIONS.RENAME_FILE,ACTIONS.CHAT_MESSAGE,ACTIONS.CHAT_SYSTEM]
        .forEach(a => socketRef.current?.off(a));
      socketRef.current?.disconnect();
    };
  }, []); // eslint-disable-line

  // ── File ops ──────────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(filename => {
    if (filename === activeFile) return;
    const cm = document.querySelector('.CodeMirror')?.CodeMirror;
    const latestContent = cm ? cm.getValue() : (filesRef.current[activeFile]?.content ?? '');
    setFiles(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], content: latestContent } }));
    setActiveFile(filename);
    setTimeout(() => loadFileIntoEditor(filename, filesRef.current[filename]?.content ?? ''), 0);
    socketRef.current?.emit(ACTIONS.SWITCH_FILE, { roomId, filename });
  }, [activeFile, loadFileIntoEditor, roomId]);

  const handleCreateFile = useCallback(filename => {
    if (filesRef.current[filename]) { toast.error(`"${filename}" already exists.`); return; }
    socketRef.current?.emit(ACTIONS.CREATE_FILE, { roomId, filename });
    setNewFileOpen(false);
  }, [roomId]);

  const handleDeleteFile = useCallback(filename => {
    if (Object.keys(filesRef.current).length <= 1) { toast.error('Cannot delete the last file.'); return; }
    if (!window.confirm(`Delete "${filename}"?`)) return;
    socketRef.current?.emit(ACTIONS.DELETE_FILE, { roomId, filename });
  }, [roomId]);

  const handleRenameFile = useCallback((oldName, newName) => {
    if (filesRef.current[newName]) { toast.error(`"${newName}" already exists.`); return; }
    socketRef.current?.emit(ACTIONS.RENAME_FILE, { roomId, oldName, newName });
  }, [roomId]);

  const handleLanguageChange = useCallback(newLang => {
    setFiles(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], language: newLang } }));
    const cm = document.querySelector('.CodeMirror')?.CodeMirror;
    if (cm) { const l = LANGUAGES.find(l => l.label === newLang); if (l) cm.setOption('mode', l.mime); }
    toast(`Switched to ${newLang}`);
  }, [activeFile]);

  const handleThemeChange = useCallback(newTheme => {
    setTheme(newTheme);
    try { localStorage.setItem(STORAGE_KEY, newTheme.value); } catch {}
  }, []);

  const copyRoomId = useCallback(async () => {
    try { await navigator.clipboard.writeText(roomId); toast.success('Room ID copied!'); }
    catch { toast.error('Could not copy.'); }
  }, [roomId]);

  const leaveRoom = useCallback(() => reactNavigator('/'), [reactNavigator]);

  const downloadCode = useCallback(() => {
    const code = currentCode.trim();
    if (!code) { toast.error('Editor is empty.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = activeFile;
    a.click();
    toast.success(`Downloaded ${activeFile}`);
  }, [currentCode, activeFile]);


  const handleSendMessage = useCallback(text => {
    if (!socketRef.current) return;
    const message = { username: location.state?.username, text, timestamp: new Date().toISOString() };
    addMessage({ id: `local-${Date.now()}`, type: 'user', ...message, isSelf: true });
    socketRef.current.emit(ACTIONS.CHAT_MESSAGE, { roomId, message });
  }, [roomId, location.state?.username]);

  const shortRoomId = roomId ? `${roomId.slice(0,8)}…${roomId.slice(-4)}` : '';

  if (!location.state) return <Navigate to="/" />;

  const fileCount = Object.keys(files).length;



  return (
    <div className="mainWrap">

      {/* ── The main editor row: sidebar + explorer + editor + chat ───────── */}
      <div className="editor-row">

        {/* Desktop Sidebar */}
        <div className="aside">
          <div className="sidebar-logo">
            <img src="/logo_editor.png" alt="SyncWrite" />
            <div className="sidebar-brand-text">
              <span className="sidebar-logo-name">SyncWrite</span>
              <span className="sidebar-logo-sub">Collaborative IDE</span>
            </div>
          </div>
          <SidebarContent
              clients={clients}
              shortRoomId={shortRoomId}
              roomId={roomId}
              copyRoomId={copyRoomId}
              language={language}
              onLanguageChange={handleLanguageChange}
              theme={theme}
              onThemeChange={handleThemeChange}
              downloadCode={downloadCode}
              leaveRoom={leaveRoom}
            />
        </div>

        {/* File Explorer */}
        <FileExplorer
          files={files} activeFile={activeFile}
          onFileSelect={handleFileSelect} onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile} onRenameFile={handleRenameFile}
          collapsed={explorerCollapsed} onToggleCollapse={toggleExplorer}
        />

        {/* Editor Area */}
        <div className="editorOutputWrap">

          {/* Mobile topbar (hidden on desktop via CSS) */}
          <div className="mobile-topbar">
            {/* Files button — opens explorer drawer */}
            <button className="mobile-topbar-btn mobile-topbar-btn--files" onClick={() => setExplorerOpen(true)} aria-label="Open Files">
              <IcoFiles />
              <span className="mobile-topbar-btn-label">Files</span>
            </button>

            <div className="mobile-topbar-title">
              <span className="tab-ext-badge">{getExtension(activeFile).toUpperCase() || 'FILE'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{activeFile}</span>
            </div>

            <div className="mobile-topbar-actions">
              <button className="mobile-topbar-btn" onClick={() => setNewFileOpen(true)} title="New file" aria-label="New file">
                <IcoNew />
              </button>
              <button className="mobile-topbar-btn" onClick={() => setChatOpen(true)} aria-label="Chat" style={{ position: 'relative' }}>
                <IcoChat />
                {chatUnread > 0 && <span className="mobile-badge">{chatUnread}</span>}
              </button>
            </div>
          </div>

          {/* Desktop toolbar (hidden on mobile via CSS) */}
          <div className="editor-toolbar">
            <button
              className="toolbar-btn toolbar-btn--explorer-toggle"
              title={explorerCollapsed ? 'Show Explorer' : 'Hide Explorer'}
              onClick={toggleExplorer}
              aria-label={explorerCollapsed ? 'Show file explorer' : 'Hide file explorer'}
            >
              {explorerCollapsed ? <IcoChevR /> : <IcoChevL />}
            </button>

            <div className="editor-toolbar-separator" />

            <button className="toolbar-btn" title="New File (Ctrl+N)" onClick={() => setNewFileOpen(true)}>
              <span className="toolbar-btn-icon"><IcoNew /></span>New
            </button>
            <button className="toolbar-btn" title="Rename active file" onClick={() => {
              const n = window.prompt('Rename file:', activeFile);
              if (n && n.trim() && n.trim() !== activeFile) handleRenameFile(activeFile, n.trim());
            }}>
              <span className="toolbar-btn-icon"><IcoRename /></span>Rename
            </button>
            <button
              className="toolbar-btn toolbar-btn--delete"
              title="Delete active file"
              onClick={() => handleDeleteFile(activeFile)}
            >
              <span className="toolbar-btn-icon"><IcoDelete /></span>Delete
            </button>

            <div className="editor-toolbar-separator" />

            <button className="toolbar-btn" title="Download active file" onClick={downloadCode}>
              <span className="toolbar-btn-icon"><IcoDl /></span>Download
            </button>

            <div className="toolbar-right">
              <span className="toolbar-file-count">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Tab bar */}
          <div className="editorTabBar">
            <span className="editorTabActive">
              <span className="tab-ext-badge">{getExtension(activeFile).toUpperCase() || 'FILE'}</span>
              {activeFile}
            </span>
          </div>

          {/* CodeMirror */}
          <div className="editorWrap">
            <Editor
              socketRef={socketRef} roomId={roomId}
              onCodeChange={setCurrentCode} language={language}
              activeFile={activeFile} theme={theme.value}
            />
          </div>
        </div>

        {/* Desktop Chat */}
        <div className="desktop-chat">
          <ChatPanel
            messages={chatMessages} onSendMessage={handleSendMessage}
            onUnreadChange={setChatUnread} username={location.state?.username}
          />
        </div>

      </div>{/* end .editor-row */}

      {/* Status bar — full width at bottom */}
      <div className="statusBar">
        <div className="statusBar-item statusBar-connected">
          <span className="statusBar-dot" />Connected
        </div>
        <div className="statusBar-separator sb-hide-sm" />
        <div className="statusBar-item sb-hide-sm">{activeFile}</div>
        <div className="statusBar-separator" />
        <div className="statusBar-item">{language}</div>
        <div className="statusBar-separator sb-hide-sm" />
        <div className="statusBar-item sb-hide-sm">{theme.label}</div>
        <div className="statusBar-item statusBar-right sb-hide-sm">{clients.length} online</div>
        <div className="statusBar-separator sb-hide-sm" />
        <div className="statusBar-item sb-hide-sm">{shortRoomId}</div>
      </div>

      {/* ══ Mobile Drawers ════════════════════════════════════════════════ */}

      {/* Sidebar drawer (settings/room info) */}
      {sidebarOpen && (
        <div className="drawer-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="drawer drawer--left" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="sidebar-logo" style={{ border:'none', padding:'0', background:'none' }}>
                <img src="/logo_editor.png" alt="SyncWrite" />
                <div className="sidebar-brand-text">
                  <span className="sidebar-logo-name">SyncWrite</span>
                  <span className="sidebar-logo-sub">Collaborative IDE</span>
                </div>
              </div>
              <button className="drawer-close" onClick={() => setSidebarOpen(false)} aria-label="Close"><IcoClose /></button>
            </div>
            <div className="drawer-body">
              <SidebarContent
              clients={clients}
              shortRoomId={shortRoomId}
              roomId={roomId}
              copyRoomId={copyRoomId}
              language={language}
              onLanguageChange={handleLanguageChange}
              theme={theme}
              onThemeChange={handleThemeChange}
              downloadCode={downloadCode}
              leaveRoom={leaveRoom}
            />
            </div>
          </div>
        </div>
      )}

      {/* Explorer drawer — opened by Files button in mobile topbar */}
      {explorerOpen && (
        <div className="drawer-overlay" onClick={() => setExplorerOpen(false)}>
          <div className="drawer drawer--left drawer--explorer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Files</span>
              <button className="drawer-close" onClick={() => setExplorerOpen(false)} aria-label="Close"><IcoClose /></button>
            </div>
            <div className="drawer-body drawer-body--fill">
              <FileExplorer
                files={files} activeFile={activeFile}
                onFileSelect={f => { handleFileSelect(f); setExplorerOpen(false); }}
                onCreateFile={handleCreateFile}
                onDeleteFile={handleDeleteFile} onRenameFile={handleRenameFile}
                collapsed={false} onToggleCollapse={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Chat drawer */}
      {chatOpen && (
        <div className="drawer-overlay" onClick={() => setChatOpen(false)}>
          <div className="drawer drawer--right" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Chat</span>
              <button className="drawer-close" onClick={() => setChatOpen(false)} aria-label="Close"><IcoClose /></button>
            </div>
            <div className="drawer-body drawer-body--fill">
              <ChatPanel
                messages={chatMessages} onSendMessage={handleSendMessage}
                onUnreadChange={setChatUnread} username={location.state?.username}
              />
            </div>
          </div>
        </div>
      )}

      {/* New File Dialog */}
      {newFileOpen && (
        <NewFileDialog
          onConfirm={handleCreateFile}
          onCancel={() => setNewFileOpen(false)}
        />
      )}

    </div>
  );
};

export default EditorPage;

