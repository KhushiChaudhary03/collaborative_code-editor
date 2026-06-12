import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';

// ── Themes ────────────────────────────────────────────────────────────────
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/material.css';
import 'codemirror/theme/eclipse.css';
import 'codemirror/theme/darcula.css';

// ── Language modes ────────────────────────────────────────────────────────
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/css/css';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/sql/sql';

// ── Addons ────────────────────────────────────────────────────────────────
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/edit/matchbrackets';

import ACTIONS from '../Actions';
import { LANGUAGES } from './LanguageSelector';

const Editor = ({
  socketRef,
  roomId,
  onCodeChange,
  language,
  activeFile,      // ← current filename (e.g. "main.js")
  theme = 'dracula',
}) => {
  const editorRef      = useRef(null);
  // Track which file the editor currently holds to avoid spurious re-loads
  const activeFileRef  = useRef(activeFile);
  const languageRef    = useRef(language);

  // ── Initialise CodeMirror once ─────────────────────────────────────────
  useEffect(() => {
    editorRef.current = Codemirror.fromTextArea(
      document.getElementById('realtimeEditor'),
      {
        mode:              { name: 'javascript', json: true },
        theme,
        autoCloseTags:     true,
        autoCloseBrackets: true,
        lineNumbers:       true,
        styleActiveLine:   true,
        matchBrackets:     true,
        indentUnit:        2,
        tabSize:           2,
        lineWrapping:      false,
      }
    );

    editorRef.current.on('change', (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      if (onCodeChange) onCodeChange(code);

      // Only broadcast user-initiated changes (not programmatic setValue calls)
      if (origin !== 'setValue') {
        socketRef.current?.emit(ACTIONS.FILE_CONTENT_CHANGE, {
          roomId,
          filename: activeFileRef.current,
          content:  code,
        });
      }
    });

    return () => {
      editorRef.current?.toTextArea();
      editorRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply theme when it changes ────────────────────────────────────────
  useEffect(() => {
    editorRef.current?.setOption('theme', theme);
  }, [theme]);

  // ── Apply language mode when language prop changes ─────────────────────
  useEffect(() => {
    if (!editorRef.current || !language) return;
    languageRef.current = language;
    const lang = LANGUAGES.find((l) => l.label === language);
    if (lang) editorRef.current.setOption('mode', lang.mime);
  }, [language]);

  // ── Socket listeners for per-file content sync ─────────────────────────
  useEffect(() => {
    if (!socketRef.current) return;

    // Another user edited a file
    const handleFileContentChange = ({ filename, content }) => {
      // Only apply to the editor if the changed file is currently open
      if (filename === activeFileRef.current && editorRef.current) {
        const cursor = editorRef.current.getCursor();
        editorRef.current.setValue(content);
        // Restore cursor so the current user's position doesn't jump
        editorRef.current.setCursor(cursor);
      }
    };

    // Server sends full file state (on join or SYNC_FILES event)
    // Parent (EditorPage) handles SYNC_FILES and passes the correct content
    // via the activeFileContent prop — see below.

    socketRef.current.on(ACTIONS.FILE_CONTENT_CHANGE, handleFileContentChange);

    return () => {
      socketRef.current?.off(ACTIONS.FILE_CONTENT_CHANGE, handleFileContentChange);
    };
  }, [socketRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load file content when the user switches files ─────────────────────
  // activeFile changes come from EditorPage (parent), which also passes the
  // correct content from the shared `files` state map.
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  return <textarea id="realtimeEditor" />;
};

export default Editor;
