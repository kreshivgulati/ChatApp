import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL;

export default function MessageBubble({ message, onDelete, isGroup }) {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(false);
  const isMe = message.sender_id === user?.id;
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isImage = message.file_type?.startsWith('image');
  const isVideo = message.file_type?.startsWith('video');
  const isSystemCall = message.message?.startsWith('📞') || message.message?.startsWith('📹');

  if (isSystemCall) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0', width: '100%' }}>
        <div style={{
          background: 'rgba(0, 81, 83, 0.08)',
          color: '#005153',
          padding: '6px 14px',
          borderRadius: 16,
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0, 81, 83, 0.15)',
        }}>
          {message.message}
          <span style={{ fontSize: 10, color: 'rgba(0, 81, 83, 0.6)', marginLeft: 4 }}>{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        marginBottom: 4,
        position: 'relative',
        width: '100%'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Group Sender Name above the bubble */}
      {isGroup && !isMe && (
        <div style={{
          fontSize: 11,
          color: '#005153',
          fontWeight: 600,
          marginBottom: 2,
          marginLeft: message.file_url ? 36 : 40
        }}>
          {message.sender?.name}
        </div>
      )}

      {/* Row containing Avatar (if group remote) and Bubble */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, width: '100%', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
        {isGroup && !isMe && (
          <img
            src={message.sender?.avatar || '/default-avatar.png'}
            alt=""
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              marginBottom: 2
            }}
          />
        )}

        <div style={{ maxWidth: '68%', position: 'relative' }}>
          {isMe && hovered && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this message?")) {
                  onDelete(message.id);
                }
              }}
              style={{
                position: 'absolute',
                left: -32,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: 24,
                height: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                fontSize: 12,
                transition: 'opacity 0.2s',
                color: '#d32f2f',
                padding: 0,
                zIndex: 10,
              }}
              title="Delete message"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                <rect x="4" y="7" width="16" height="2" rx="0.5" />
                <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                <line x1="9" y1="12" x2="9" y2="17" />
                <line x1="12" y1="12" x2="12" y2="17" />
                <line x1="15" y1="12" x2="15" y2="17" />
              </svg>
            </button>
          )}
          <div style={{
            padding: message.file_url && !message.message ? '4px' : '10px 12px',
            borderRadius: 8,
            background: isMe ? 'var(--message-bg-outgoing)' : 'var(--message-bg-incoming)',
            borderTopRightRadius: isMe ? 2 : 8,
            borderTopLeftRadius: isMe ? 8 : 2,
            boxShadow: '0 1px 3px rgba(11,20,26,0.08)',
            overflow: 'hidden',
          }}>
            {/* Image */}
            {isImage && (
              <img
                src={`${API}${message.file_url}`}
                alt="sent"
                style={{ maxWidth: 280, maxHeight: 280, borderRadius: 6, display: 'block', cursor: 'pointer' }}
                onClick={() => window.open(`${API}${message.file_url}`, '_blank')}
              />
            )}

            {/* Video */}
            {isVideo && (
              <video
                src={`${API}${message.file_url}`}
                controls
                style={{ maxWidth: 280, borderRadius: 6, display: 'block' }}
              />
            )}

            {/* General File / Document */}
            {message.file_url && !isImage && !isVideo && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: isMe ? 'rgba(0, 81, 83, 0.08)' : 'var(--bg-search-wrap)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  minWidth: 200,
                  maxWidth: 280,
                }}
                onClick={() => window.open(`${API}${message.file_url}`, '_blank')}
              >
                <div style={{ fontSize: 24 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {message.file_name || message.file_url.split('/').pop()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Click to open/download
                  </div>
                </div>
                <div style={{ fontSize: 16, color: 'var(--tick-color)' }}>⬇️</div>
              </div>
            )}

            {/* Caption or text */}
            {message.message && (
              <p style={{ fontSize: 13, color: isMe ? 'var(--message-text-outgoing)' : 'var(--message-text-incoming)', lineHeight: 1.5, margin: message.file_url ? '6px 8px 2px' : 0 }}>
                {message.message}
              </p>
            )}

            {/* Timestamp */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4, padding: message.file_url ? '0 6px 4px' : 0 }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{time}</span>
              {isMe && (
                <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
                  <path d="M1 5.5L5 9.5L11 1.5" stroke="var(--tick-color)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 5.5L10 9.5L15 1.5" stroke="var(--tick-color)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}