import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import { useAuth } from '../context/AuthContext';
import EmojiPicker from './EmojiPicker';

const API = import.meta.env.VITE_API_URL;

export default function ChatWindow({ socket, onStartCall }) {
  const { userId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [otherUser, setOther] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [preview, setPreview] = useState(null); // file preview
  const [selectedFile, setFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const bottomRef = useRef();
  const typingTimeout = useRef();
  const fileInputRef = useRef();
  const textareaRef = useRef();

  // Listen for online users from socket
  useEffect(() => {
    if (!socket) return;
    socket.on('online_users', (ids) => {
      setOnlineUsers(ids.map(String));
    });
    return () => socket.off('online_users');
  }, [socket]);

  useEffect(() => {
    if (!userId) return;
    setMessages([]);
    setPreview(null);
    setFile(null);
    setShowEmojiPicker(false);

    axios.get(`${API}/api/users/${userId}`, { withCredentials: true })
      .then(res => setOther(res.data));

    axios.get(`${API}/api/messages/${userId}`, { withCredentials: true })
      .then(res => setMessages(res.data))
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (msg) => {
      if (
        (msg.sender_id === parseInt(userId) && msg.receiver_id === user?.id) ||
        (msg.sender_id === user?.id && msg.receiver_id === parseInt(userId))
      ) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socket.on('message_deleted', ({ id }) => {
      setMessages(prev => prev.filter(msg => msg.id !== parseInt(id)));
    });

    socket.on('user_typing', ({ senderId }) => {
      if (senderId === parseInt(userId)) setIsTyping(true);
    });
    socket.on('user_stop_typing', ({ senderId }) => {
      if (senderId === parseInt(userId)) setIsTyping(false);
    });
    return () => {
      socket.off('receive_message');
      socket.off('message_deleted');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, userId, user]);

  const startAudioCall = () => {
    if (otherUser) onStartCall('audio', otherUser);
  };

  const startVideoCall = () => {
    if (otherUser) onStartCall('video', otherUser);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleTyping = (e) => {
    setText(e.target.value);
    socket?.emit('typing', { senderId: user?.id, receiverId: parseInt(userId) });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('stop_typing', { senderId: user?.id, receiverId: parseInt(userId) });
    }, 1500);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreview({ url, type: file.type, name: file.name });
    e.target.value = '';
  };

  // Handle clipboard paste (Ctrl+V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          setFile(file);
          const url = URL.createObjectURL(file);
          setPreview({ url, type: file.type, name: file.name || 'Pasted File' });
          e.preventDefault();
          break;
        }
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const sendSystemMessage = async (textContent) => {
    try {
      const formData = new FormData();
      formData.append('receiver_id', userId);
      formData.append('message', textContent);

      const res = await axios.post(`${API}/api/messages`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      socket?.emit('send_message', { ...res.data, receiver_id: parseInt(userId) });
      setMessages(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Failed to send system call message:', err);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() && !selectedFile) return;

    socket?.emit('stop_typing', { senderId: user?.id, receiverId: parseInt(userId) });

    try {
      const formData = new FormData();
      formData.append('receiver_id', userId);
      if (text.trim()) formData.append('message', text.trim());
      if (selectedFile) formData.append('file', selectedFile);

      const res = await axios.post(`${API}/api/messages`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      socket?.emit('send_message', { ...res.data, receiver_id: parseInt(userId) });
      setMessages(prev => [...prev, res.data]);
      setText('');
      setFile(null);
      setPreview(null);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/api/messages/${messageId}`, { withCredentials: true });
      socket?.emit('delete_message', { id: messageId, receiver_id: parseInt(userId) });
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSelectEmoji = (emojiChar) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText(prev => prev + emojiChar);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    const newText = currentText.substring(0, start) + emojiChar + currentText.substring(end);
    setText(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emojiChar.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };


  if (!userId) return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>💬</div>
      <div style={styles.emptyTitle}>Welcome to ChatApp</div>
      <div style={styles.emptyText}>Select a user to start chatting</div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        {otherUser && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <img src={otherUser.avatar} alt="" style={styles.avatar} />
              <div>
                <div style={styles.name}>{otherUser.name}</div>
                <div style={{
                  ...styles.status,
                  color: (isTyping || onlineUsers.includes(String(userId))) ? '#06D755' : 'var(--text-secondary)'
                }}>
                  {isTyping ? ' typing...' : (onlineUsers.includes(String(userId)) ? 'online' : 'offline')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={startAudioCall} style={styles.callBtn} title="Audio Call">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none" style={{ display: 'block' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.36-5.83c-.34-.34-.9-.34-1.24 0l-.82.82c-.17-.1-.36-.21-.57-.34a7.99 7.99 0 0 1-1.68-1.68c-.13-.21-.24-.4-.34-.57l.82-.82c.34-.34.34-.9 0-1.24l-1.65-1.65a.89.89 0 0 0-1.24 0l-.78.78c-.7.7-.85 1.74-.35 2.6A11.02 11.02 0 0 0 10.9 13.1a11.02 11.02 0 0 0 3.73 3.39c.86.5 1.9.35 2.6-.35l.78-.78c.34-.34.34-.9 0-1.24l-1.65-1.65z" />
                </svg>
              </button>
              <button onClick={startVideoCall} style={styles.callBtn} title="Video Call">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none" style={{ display: 'block' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.62-10.93c.36-.29.88-.03.88.43v5c0 .46-.52.72-.88.43l-2.12-1.7V14.5c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1v-5c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v1.27l2.12-1.7z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.noMsg}>No messages yet. Say hi! 👋</div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} onDelete={handleDeleteMessage} />
        ))}
        {isTyping && (
          <div style={styles.typingWrap}>
            <img src={otherUser?.avatar} alt="" style={styles.typingAvatar} />
            <div style={styles.typingBubble}>
              <span style={styles.dot} />
              <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
              <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* File preview bar */}
      {preview && (
        <div style={styles.previewBar}>
          <div style={styles.previewInner}>
            {preview.type.startsWith('image') ? (
              <img src={preview.url} alt="preview" style={styles.previewImg} />
            ) : preview.type.startsWith('video') ? (
              <video src={preview.url} style={styles.previewImg} />
            ) : (
              <div style={styles.previewFileIcon}></div>
            )}
            <span style={styles.previewName}>{selectedFile?.name || preview.name}</span>
          </div>
          <button onClick={clearFile} style={styles.clearBtn}>✕</button>
        </div>
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={handleSelectEmoji}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Input bar */}
      <div style={styles.inputBar}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current.click()}
          style={styles.iconBtn}
          title="Send files or photos"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M8 17h8" />
            <path d="M8 15.5V17M16 15.5V17" />
            <line x1="12" y1="14" x2="12" y2="10.5" />
            <polyline points="9.5 13 12 10.5 14.5 13" />
          </svg>
        </button>

        {/* Emoji trigger button */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            ...styles.iconBtn,
            color: showEmojiPicker ? '#005153' : 'inherit',
            background: showEmojiPicker ? 'rgba(0, 81, 83, 0.1)' : 'transparent',
          }}
          title="Insert emoji"
        >
          😊
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTyping}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          placeholder={selectedFile ? 'Add a caption...' : `Message ${otherUser?.name || ''}...`}
          style={styles.input}
          rows={1}
        />

        <button
          onClick={sendMessage}
          disabled={!text.trim() && !selectedFile}
          style={{
            ...styles.sendBtn,
            opacity: (text.trim() || selectedFile) ? 1 : 0.5,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 },
  emptyText: { fontSize: 13 },
  topBar: { padding: '0 16px', height: 60, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--topbar-bg)', flexShrink: 0 },
  avatar: { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' },
  callBtn: { width: 36, height: 36, background: 'var(--bg-search-input)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', color: 'var(--tick-color)' },
  name: { fontWeight: 500, fontSize: 15, color: 'var(--text-primary)' },
  status: { fontSize: 12, color: '#06D755' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--bg-secondary)', backgroundImage: 'radial-gradient(var(--bg-dot-pattern) 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' },
  noMsg: { textAlign: 'center', color: 'var(--text-secondary)', marginTop: 40, fontSize: 13 },
  typingWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  typingAvatar: { width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' },
  typingBubble: { background: 'var(--message-bg-incoming)', color: 'var(--message-text-incoming)', borderRadius: '8px 8px 8px 2px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center', boxShadow: '0 1px 3px rgba(11,20,26,0.08)' },
  dot: { width: 6, height: 6, background: '#005153', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.2s infinite' },
  previewBar: { background: 'var(--topbar-bg)', borderTop: '1px solid var(--border-color)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  previewInner: { display: 'flex', alignItems: 'center', gap: 10 },
  previewImg: { width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' },
  previewFileIcon: { width: 60, height: 60, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  previewName: { fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  clearBtn: { background: 'var(--border-color)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' },
  inputBar: { padding: '10px 14px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10, background: 'var(--inputbar-bg)', alignItems: 'center', minHeight: 60, flexShrink: 0 },
  iconBtn: { width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' },
  input: { flex: 1, padding: '10px 18px', borderRadius: 999, border: 'none', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', resize: 'none', maxHeight: 100 },
  sendBtn: { width: 38, height: 38, background: '#005153', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};