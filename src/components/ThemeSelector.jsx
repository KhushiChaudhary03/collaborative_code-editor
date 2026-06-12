import React, { useState, useRef, useEffect } from 'react';
import './ThemeSelector.css';

export const THEMES = [
  { label: 'Dracula',        value: 'dracula',  cssFile: 'dracula',  dark: true  },
  { label: 'Monokai',        value: 'monokai',  cssFile: 'monokai',  dark: true  },
  { label: 'Material',       value: 'material', cssFile: 'material', dark: true  },
  { label: 'Eclipse (Light)',value: 'eclipse',  cssFile: 'eclipse',  dark: false },
  { label: 'Darcula',        value: 'darcula',  cssFile: 'darcula',  dark: true  },
];

export const STORAGE_KEY = 'rte-editor-theme';

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.find((t) => t.value === saved) || THEMES[0];
  } catch {
    return THEMES[0];
  }
}

// ── ThemeSelector ──────────────────────────────────────────────────────────
const ThemeSelector = ({ selectedTheme, onThemeChange }) => {
  const [open, setOpen]   = useState(false);
  const rootRef           = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (theme) => {
    onThemeChange(theme);
    setOpen(false);
  };

  return (
    <div className="ts-root" ref={rootRef}>
      <label className="ts-label">Theme</label>
      <button
        className={`ts-trigger ${open ? 'ts-trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Change editor theme"
      >
        <span className="ts-trigger-dot" data-dark={String(selectedTheme.dark)} />
        <span className="ts-trigger-text">{selectedTheme.label}</span>
        <span className={`ts-chevron ${open ? 'ts-chevron--up' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="ts-dropdown">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              className={`ts-option ${theme.value === selectedTheme.value ? 'ts-option--active' : ''}`}
              onClick={() => handleSelect(theme)}
            >
              <span className="ts-option-dot" data-dark={String(theme.dark)} />
              <span>{theme.label}</span>
              {theme.value === selectedTheme.value && (
                <span className="ts-option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
