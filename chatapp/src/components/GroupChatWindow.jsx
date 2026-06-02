import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import GroupInfoWindow from './GroupInfoWindow';
import EmojiPicker from './EmojiPicker';
import MessageBubble from './MessageBubble';

const API = 'http://localhost:5000';

export default function GroupChatWindow({ socket, onStartGroupCall }) {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [group, setGroup] = useState(null);
    const [typingUser, setTyping] = useState(null);
    const [preview, setPreview] = useState(null);
    const [selectedFile, setFile] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeGroupCall, setActiveGroupCall] = useState(null);
    const bottomRef = useRef();
    const typingTimeout = useRef();
    const fileInputRef = useRef();
    const textareaRef = useRef();

    const fetchGroupDetails = () => {
        if (!groupId) return;
        axios.get(`${API}/api/groups`, { withCredentials: true })
            .then(res => {
                const g = res.data.find(g => String(g.id) === String(groupId));
                setGroup(g);
            });
    };

    useEffect(() => {
        if (!groupId) return;
        setMessages([]);
        setShowInfo(false);
        setShowEmojiPicker(false);

        fetchGroupDetails();

        axios.get(`${API}/api/groups/${groupId}/messages`, { withCredentials: true })
            .then(res => setMessages(res.data));

        socket?.emit('join_group', groupId);
    }, [groupId, socket]);

    useEffect(() => {
        if (!socket) return;

        socket.on('receive_group_message', (msg) => {
            if (String(msg.group_id) === String(groupId)) {
                setMessages(prev => [...prev, msg]);
            }
        });

        socket.on('group_user_typing', ({ senderName }) => {
            setTyping(senderName);
        });

        socket.on('group_user_stop_typing', () => setTyping(null));

        socket.on('group_info_updated', ({ groupId: gid }) => {
            if (String(gid) === String(groupId)) {
                fetchGroupDetails();
            }
        });

        socket.on('group_member_added', ({ groupId: gid }) => {
            if (String(gid) === String(groupId)) {
                fetchGroupDetails();
            }
        });

        socket.on('group_member_removed', ({ groupId: gid, userId }) => {
            if (String(gid) === String(groupId)) {
                if (parseInt(userId) === user?.id) {
                    alert('You have been removed from this group.');
                    navigate('/chat');
                } else {
                    fetchGroupDetails();
                }
            }
        });

        socket.on('group_deleted', ({ groupId: gid }) => {
            if (String(gid) === String(groupId)) {
                alert('This group has been deleted by the admin.');
                navigate('/chat');
            }
        });

        socket.on('group_message_deleted', ({ groupId: gid, messageId }) => {
            if (String(gid) === String(groupId)) {
                setMessages(prev => prev.filter(msg => msg.id !== parseInt(messageId)));
            }
        });

        return () => {
            socket.off('receive_group_message');
            socket.off('group_user_typing');
            socket.off('group_user_stop_typing');
            socket.off('group_info_updated');
            socket.off('group_member_added');
            socket.off('group_member_removed');
            socket.off('group_deleted');
            socket.off('group_message_deleted');
        };
    }, [socket, groupId, user]);

    const handleDeleteMessage = async (messageId) => {
        try {
            await axios.delete(`${API}/api/groups/${groupId}/messages/${messageId}`, { withCredentials: true });
            socket?.emit('delete_group_message', { groupId, messageId });
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (err) {
            console.error('Failed to delete group message:', err);
        }
    };

    useEffect(() => {
        if (!socket || !groupId) return;

        // Query active call on mount or group change
        socket.emit('get_active_group_call', groupId);

        socket.on('active_group_call_response', ({ groupId: respGroupId, participants }) => {
            if (String(respGroupId) === String(groupId) && participants && participants.length > 0) {
                setActiveGroupCall(participants);
            } else if (String(respGroupId) === String(groupId)) {
                setActiveGroupCall(null);
            }
        });

        socket.on('group_call_started', ({ groupId: callGroupId, participants }) => {
            if (String(callGroupId) === String(groupId)) {
                setActiveGroupCall(participants);
            }
        });

        socket.on('group_call_updated', ({ groupId: callGroupId, participants }) => {
            if (String(callGroupId) === String(groupId) && participants && participants.length > 0) {
                setActiveGroupCall(participants);
            }
        });

        socket.on('group_call_ended', ({ groupId: callGroupId }) => {
            if (String(callGroupId) === String(groupId)) {
                setActiveGroupCall(null);
            }
        });

        return () => {
            socket.off('active_group_call_response');
            socket.off('group_call_started');
            socket.off('group_call_updated');
            socket.off('group_call_ended');
        };
    }, [socket, groupId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startAudioCall = (e) => {
        e.stopPropagation();
        if (onStartGroupCall && group) {
            onStartGroupCall('audio', group);
        }
    };

    const startVideoCall = (e) => {
        e.stopPropagation();
        if (onStartGroupCall && group) {
            onStartGroupCall('video', group);
        }
    };

    const joinActiveCall = (e) => {
        e.stopPropagation();
        if (onStartGroupCall && group) {
            // Find the call type from group or default to active call type
            onStartGroupCall('video', group); 
        }
    };

    const handleTyping = (e) => {
        setText(e.target.value);
        socket?.emit('group_typing', { groupId, senderId: user?.id, senderName: user?.name });
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket?.emit('group_stop_typing', { groupId, senderId: user?.id });
        }, 1500);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFile(file);
        setPreview({ url: URL.createObjectURL(file), type: file.type, name: file.name });
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

    const sendMessage = async () => {
        if (!text.trim() && !selectedFile) return;
        socket?.emit('group_stop_typing', { groupId, senderId: user?.id });

        try {
            const formData = new FormData();
            if (text.trim()) formData.append('message', text.trim());
            if (selectedFile) formData.append('file', selectedFile);

            const res = await axios.post(
                `${API}/api/groups/${groupId}/messages`,
                formData,
                { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
            );

            socket?.emit('send_group_message', { ...res.data, group_id: groupId });
            setMessages(prev => [...prev, res.data]);
            setText('');
            setFile(null);
            setPreview(null);
            setShowEmojiPicker(false);
        } catch (err) {
            console.error(err);
        }
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


    const memberCount = group?.members?.length || 0;

    if (showInfo) {
        return (
            <GroupInfoWindow
                groupId={groupId}
                socket={socket}
                onClose={() => setShowInfo(false)}
                onGroupUpdated={fetchGroupDetails}
            />
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.topBar}>
                <div 
                    onClick={() => setShowInfo(true)} 
                    title="Click to view group details & settings"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
                >
                    <div style={styles.groupAvatar}>
                        {group?.name?.charAt(0).toUpperCase() || 'G'}
                    </div>
                    <div>
                        <div style={styles.name}>{group?.name || 'Group'}</div>
                        <div style={styles.meta}>{memberCount} members</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {activeGroupCall && (
                        <button 
                            onClick={joinActiveCall} 
                            className="pulse-join-btn"
                            style={{ 
                                background: '#22c55e', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: 20, 
                                padding: '6px 14px', 
                                fontSize: 12, 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 4px 10px rgba(34,197,94,0.3)'
                            }}
                        >
                            🟢 Join Call
                        </button>
                    )}
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
            </div>

            {/* Messages */}
            <div style={styles.messages}>
                {messages.length === 0 && (
                    <div style={styles.noMsg}>No messages yet. Start the conversation! 👋</div>
                )}
                {messages.map(msg => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        onDelete={handleDeleteMessage} 
                        isGroup={true} 
                    />
                ))}
                {typingUser && (
                    <div style={{ fontSize: 12, color: '#6e7979', fontStyle: 'italic', marginLeft: 4 }}>
                        {typingUser} is typing...
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* File preview */}
            {preview && (
                <div style={styles.previewBar}>
                    <div style={styles.previewInner}>
                        {preview.type?.startsWith('image') ? (
                            <img src={preview.url} alt="preview" style={styles.previewImg} />
                        ) : preview.type?.startsWith('video') ? (
                            <video src={preview.url} style={styles.previewImg} />
                        ) : (
                            <div style={styles.previewFileIcon}></div>
                        )}
                        <span style={styles.previewName}>{selectedFile?.name || preview.name}</span>
                    </div>
                    <button onClick={() => { setFile(null); setPreview(null); }} style={styles.clearBtn}>✕</button>
                </div>
            )}

            {showEmojiPicker && (
                <EmojiPicker
                    onSelectEmoji={handleSelectEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                />
            )}

            {/* Input */}
            <div style={styles.inputBar}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current.click()} style={{ ...styles.iconBtn, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Send files or photos">
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
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    onPaste={handlePaste}
                    placeholder={selectedFile ? 'Add a caption...' : 'Message group...'}
                    style={styles.input}
                    rows={1}
                />
                <button
                    onClick={sendMessage}
                    disabled={!text.trim() && !selectedFile}
                    style={{ ...styles.sendBtn, opacity: (text.trim() || selectedFile) ? 1 : 0.5 }}
                >➤</button>
            </div>
        </div>
    );
}

const styles = {
    container: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' },
    topBar: { padding: '0 16px', height: 60, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--topbar-bg)', flexShrink: 0, justifyContent: 'space-between' },
    callBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#005153', padding: 8, borderRadius: '50%', display: 'flex', transition: 'background 0.2s' },
    groupAvatar: { width: 38, height: 38, borderRadius: '50%', background: '#005153', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 },
    name: { fontWeight: 500, fontSize: 15, color: 'var(--text-primary)' },
    meta: { fontSize: 12, color: 'var(--text-secondary)' },
    messages: { flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: 'var(--bg-secondary)', backgroundImage: 'radial-gradient(var(--bg-dot-pattern) 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' },
    noMsg: { textAlign: 'center', color: 'var(--text-secondary)', marginTop: 40, fontSize: 13 },
    senderAvatar: { width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    previewBar: { background: 'var(--topbar-bg)', borderTop: '1px solid var(--border-color)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    previewInner: { display: 'flex', alignItems: 'center', gap: 10 },
    previewImg: { width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' },
    previewFileIcon: { width: 56, height: 56, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    previewName: { fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    clearBtn: { background: 'var(--border-color)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 11, color: 'var(--text-primary)' },
    inputBar: { padding: '10px 14px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10, background: 'var(--inputbar-bg)', alignItems: 'center', minHeight: 60, flexShrink: 0 },
    iconBtn: { width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, borderRadius: '50%', color: 'var(--text-primary)' },
    input: { flex: 1, padding: '10px 18px', borderRadius: 999, border: 'none', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--text-primary)', resize: 'none', maxHeight: 100 },
    sendBtn: { width: 38, height: 38, background: '#005153', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};