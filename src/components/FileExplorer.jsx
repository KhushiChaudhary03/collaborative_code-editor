import React, { useState, useRef, useEffect } from 'react';
import './FileExplorer.css';

function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
}

function getFileBadge(ext) {
  const label = ext ? ext.toUpperCase() : 'FILE';
  return label.length > 4 ? label.slice(0, 4) : label;
}

// ── Single file row ────────────────────────────────────────────────────────
function FileRow({ filename, isActive, onClick, onRename, onDelete }) {
  const [renaming, setRenaming]   = useState(false);
  const [renameVal, setRenameVal] = useState(filename);
  const inputRef                  = useRef(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const commitRename = () => {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== filename) {
      onRename(filename, trimmed);
    } else {
      setRenameVal(filename);
    }
    setRenaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  commitRename();
    if (e.key === 'Escape') { setRenameVal(filename); setRenaming(false); }
  };

  return (
    <div
      className={`fe-file-row ${isActive ? 'fe-file-row--active' : ''}`}
      onClick={() => !renaming && onClick(filename)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') !renaming && onClick(filename); }}
      aria-current={isActive ? 'true' : undefined}
    >
      {!renaming && (
        <span className="fe-file-badge" title={getFileExtension(filename)}>
          {getFileBadge(getFileExtension(filename))}
        </span>
      )}

      {renaming ? (
        <input
          ref={inputRef}
          className="fe-rename-input"
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          aria-label="Rename file"
        />
      ) : (
        <span className="fe-file-name" title={filename}>{filename}</span>
      )}

      <div className="fe-file-actions" onClick={(e) => e.stopPropagation()}>
        <button className="fe-action-btn" title="Rename" aria-label={`Rename ${filename}`} onClick={() => setRenaming(true)}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
          </svg>
        </button>
        <button className="fe-action-btn fe-action-btn--delete" title="Delete" aria-label={`Delete ${filename}`} onClick={() => onDelete(filename)}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h10M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M5.5 7v5M10.5 7v5M4 4l.8 9a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9L12 4"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── FileExplorer ───────────────────────────────────────────────────────────
const FileExplorer = ({
  files, activeFile,
  onFileSelect, onCreateFile, onDeleteFile, onRenameFile,
  collapsed, onToggleCollapse,
}) => {
  const [creating, setCreating]       = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const newFileInputRef               = useRef(null);

  useEffect(() => {
    if (creating) newFileInputRef.current?.focus();
  }, [creating]);

  const handleCreateSubmit = () => {
    const trimmed = newFileName.trim();
    if (trimmed) onCreateFile(trimmed);
    setNewFileName('');
    setCreating(false);
  };

  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter')  handleCreateSubmit();
    if (e.key === 'Escape') { setNewFileName(''); setCreating(false); }
  };

  const fileNames = Object.keys(files || {});

  return (
    <div className={`fe-root ${collapsed ? 'fe-root--collapsed' : ''}`} aria-label="File Explorer">
      <div className="fe-header">
        <div className="fe-title-row">
          <button
            className="fe-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Show Explorer' : 'Hide Explorer'}
            aria-label={collapsed ? 'Show file explorer' : 'Hide file explorer'}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <path d="M6 3l5 5-5 5"/>
                : <path d="M10 3L5 8l5 5"/>
              }
            </svg>
          </button>
          {!collapsed && (
            <>
              <span className="fe-title">Explorer</span>
              {fileNames.length > 0 && (
                <span className="fe-count">{fileNames.length}</span>
              )}
            </>
          )}
        </div>
        {!collapsed && (
          <button className="fe-new-btn" title="New file" aria-label="Create new file" onClick={() => setCreating(true)}>+</button>
        )}
      </div>

      {!collapsed && (
        <div className="fe-file-list" role="listbox" aria-label="Files">
          {fileNames.length === 0 && !creating && (
            <div className="fe-empty">No files yet.<br />Click + to create one.</div>
          )}

          {fileNames.map((fname) => (
            <FileRow
              key={fname}
              filename={fname}
              isActive={fname === activeFile}
              onClick={onFileSelect}
              onRename={onRenameFile}
              onDelete={onDeleteFile}
            />
          ))}

          {creating && (
            <div className="fe-new-file-row">
              <input
                ref={newFileInputRef}
                className="fe-rename-input"
                placeholder="filename.js"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={handleCreateSubmit}
                onKeyDown={handleCreateKeyDown}
                aria-label="New file name"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
