import React from 'react';

export const LANGUAGES = [
  { label: 'JavaScript', mode: 'javascript',  mime: 'text/javascript',       extension: 'js'   },
  { label: 'TypeScript', mode: 'javascript',  mime: 'application/typescript', extension: 'ts'   },
  { label: 'Python',     mode: 'python',      mime: 'text/x-python',          extension: 'py'   },
  { label: 'Java',       mode: 'clike',       mime: 'text/x-java',            extension: 'java' },
  { label: 'C',          mode: 'clike',       mime: 'text/x-csrc',            extension: 'c'    },
  { label: 'C++',        mode: 'clike',       mime: 'text/x-c++src',          extension: 'cpp'  },
  { label: 'HTML',       mode: 'htmlmixed',   mime: 'text/html',              extension: 'html' },
  { label: 'CSS',        mode: 'css',         mime: 'text/css',               extension: 'css'  },
  { label: 'JSON',       mode: 'javascript',  mime: 'application/json',       extension: 'json' },
  { label: 'Markdown',   mode: 'markdown',    mime: 'text/x-markdown',        extension: 'md'   },
  { label: 'SQL',        mode: 'sql',         mime: 'text/x-sql',             extension: 'sql'  },
];

// Maps each language label to what Piston API expects
// export const PISTON_LANG_MAP = {
//   JavaScript: { language: 'javascript', version: '*' },
//   TypeScript: { language: 'typescript', version: '*' },
//   Python:     { language: 'python',     version: '*' },
//   Java:       { language: 'java',       version: '*' },
//   C:          { language: 'c',          version: '*' },
//   'C++':      { language: 'c++',        version: '*' },
//   HTML:       null, // run in browser, not Piston
//   CSS:        null,
//   JSON:       null,
//   Markdown:   null,
//   SQL:        null,
// };

const LanguageSelector = ({ selectedLanguage, onLanguageChange }) => {
  return (
    <div className="languageSelectorWrap">
      <label className="langLabel">Language</label>
      <select
        className="langSelect"
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.label} value={lang.label}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
