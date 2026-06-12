const ACTIONS = {
  // ── Existing room / code events ──────────────────────────────────────────
  JOIN:            'join',
  JOINED:          'joined',
  DISCONNECTED:    'disconnected',
  CODE_CHANGE:     'code-change',
  SYNC_CODE:       'sync-code',
  LANGUAGE_CHANGE: 'language-change',
  LEAVE:           'leave',

  // ── Chat events ──────────────────────────────────────────────────────────
  CHAT_MESSAGE: 'chat-message',
  CHAT_SYSTEM:  'chat-system',

  // ── Multi-file workspace events ──────────────────────────────────────────
  CREATE_FILE:         'create-file',
  DELETE_FILE:         'delete-file',
  RENAME_FILE:         'rename-file',
  SWITCH_FILE:         'switch-file',
  FILE_CONTENT_CHANGE: 'file-content-change',
  SYNC_FILES:          'sync-files',
};

module.exports = ACTIONS;
