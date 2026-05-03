import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useChatbot } from '../hooks/useChatbot';
import styles from './ChatWidget.module.css';

// ── Iconos inline (sin dependencia extra) ────────────────────
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ── Componente principal ─────────────────────────────────────
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChatbot();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Enfocar input al abrir
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open]);

  // Auto-resize del textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  }

  function handleSend() {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.widget}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Asistente Remi">
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.avatar}>🍽️</div>
            <div className={styles.headerInfo}>
              <p className={styles.headerName}>Remi — Asistente</p>
              <p className={styles.headerStatus}>
                <span className={styles.statusDot} />
                En línea
              </p>
            </div>
            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              <IconX />
            </button>
          </div>

          {/* Cuerpo: mensajes o acceso denegado */}
          {!user ? (
            <div className={styles.denied}>
              <span className={styles.deniedIcon}>🔒</span>
              <p>Debes iniciar sesión para hablar con el asistente.</p>
              <a href="/login">Iniciar sesión →</a>
            </div>
          ) : (
            <>
              <div className={styles.messages}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.msgRow} ${styles[msg.role]}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className={styles.msgAvatar}>🤖</div>
                    )}
                    <div className={styles.bubble}>{msg.content}</div>
                  </div>
                ))}

                {loading && (
                  <div className={`${styles.msgRow} ${styles.assistant}`}>
                    <div className={styles.msgAvatar}>🤖</div>
                    <div className={`${styles.bubble} ${styles.assistant}`}>
                      <div className={styles.typing}>
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className={styles.inputArea}>
                <textarea
                  ref={textareaRef}
                  className={styles.input}
                  rows={1}
                  placeholder="Escribe tu mensaje…"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  aria-label="Enviar mensaje"
                >
                  <IconSend />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Botón flotante */}
      <button
        className={styles.toggleBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
      >
        {open ? <IconX /> : <IconChat />}
      </button>
    </div>
  );
}
