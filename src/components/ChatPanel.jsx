import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatPanel.css';

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2L7 9M14 2L9 14 7 9 2 7l12-5z"/>
  </svg>
);

const ChatPanelIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 10a1 1 0 0 1-1 1H5l-3 3V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7z"/>
  </svg>
);

/**
 * ChatPanel
 * Props:
 *   messages       – array of message objects managed by EditorPage
 *   onSendMessage  – (text: string) => void
 *   onUnreadChange – (count: number) => void
 *   username       – current user's name
 */
const ChatPanel = ({ messages, onSendMessage, onUnreadChange, username }) => {
  const [inputText, setInputText]     = useState('');
  const [isOpen, setIsOpen]           = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevLen, setPrevLen]         = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Unread counter
  useEffect(() => {
    if (messages.length > prevLen) {
      if (!isOpen) {
        setUnreadCount((c) => c + (messages.length - prevLen));
      }
      setPrevLen(messages.length);
    }
  }, [messages.length, isOpen, prevLen]);

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text);
    setInputText('');
    inputRef.current?.focus();
  }, [inputText, onSendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`chatPanel ${isOpen ? 'chatPanel--open' : 'chatPanel--collapsed'}`}>

      {/* Header / toggle */}
      <button
        className="chatPanel__toggle"
        onClick={handleToggle}
        aria-label={isOpen ? 'Collapse chat' : 'Expand chat'}
        aria-expanded={isOpen}
      >
        {isOpen && (
          <span className="chatPanel__toggleIcon"><ChatPanelIcon /></span>
        )}
        <span className="chatPanel__toggleLabel">
  Chat
  {!isOpen && unreadCount > 0 && (
    <span className="chatPanel__badge chatPanel__badge--inline">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</span>
        {isOpen && (
          <span className="chatPanel__chevron" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6l4 4 4-4"/></svg>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="chatPanel__body">

          {/* Messages */}
          <div className="chatPanel__messages" role="log" aria-live="polite" aria-label="Chat messages">
            {messages.length === 0 && (
              <p className="chatPanel__empty">No messages yet.<br/>Start the conversation.</p>
            )}
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="chatMsg chatMsg--system">
                    <span className="chatMsg__text">{msg.text}</span>
                    <span className="chatMsg__time">{formatTime(msg.timestamp)}</span>
                  </div>
                );
              }
              const isSelf = msg.isSelf;
              return (
                <div
                  key={msg.id}
                  className={`chatMsg chatMsg--user ${isSelf ? 'chatMsg--self' : 'chatMsg--other'}`}
                >
                  {!isSelf && (
                    <span className="chatMsg__author">{msg.username}</span>
                  )}
                  <div className="chatMsg__bubble">
                    <span className="chatMsg__text">{msg.text}</span>
                    <span className="chatMsg__time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatPanel__inputRow">
            <textarea
              ref={inputRef}
              className="chatPanel__input"
              placeholder="Message… (Enter to send)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              aria-label="Chat message input"
            />
            <button
              className="chatPanel__sendBtn"
              onClick={sendMessage}
              disabled={!inputText.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default ChatPanel;
