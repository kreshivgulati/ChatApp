import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

// ── ICONS ─────────────────────────────────────────────
const Icon = ({ d, size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);
const MicIcon = () => <Icon d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8" />;
const MicOffIcon = () => <Icon d="M1 1l22 22 M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6 M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8" />;
const VideoIcon = () => <Icon d="M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z" />;
const VideoOffIcon = () => <Icon d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10 M1 1l22 22" />;
const PhoneOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45
      12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2
      19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67" />
        <path d="M6.5 6.5a19.47 19.47 0 0 0-2.38 3.37 19.79 19.79 0 0 0-1.43 3.63
      2 2 0 0 0 1.24 2.47 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
); const UsersIcon = () => <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />;
const ChatIcon = () => <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
const ShareIcon = () => <Icon d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13" />;
const ArrowLeft = () => <Icon d="M19 12H5 M12 19l-7-7 7-7" />;
const ShieldIcon = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const SparkleIcon = () => <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
const SendIcon = () => <Icon d="M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z" />;

const SafeAvatar = ({ src, name, size = 40, style = {} }) => {
    const [isFailed, setIsFailed] = useState(!src);
    const initial = name ? name.charAt(0).toUpperCase() : '?';

    const getBgColor = (str) => {
        let hash = 0;
        if (str) {
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
        }
        const colors = [
            '#005153', '#0d9488', '#0284c7', '#4f46e5',
            '#7c3aed', '#db2777', '#dc2626', '#ea580c'
        ];
        return colors[Math.abs(hash) % colors.length];
    };

    if (isFailed) {
        return (
            <div style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: getBgColor(name),
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: size * 0.4,
                flexShrink: 0,
                border: style.border || 'none',
                ...style
            }}>
                {initial}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            onError={() => setIsFailed(true)}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                ...style
            }}
        />
    );
};

export default function CallModal({
    socket, user, otherUser, callType,
    isIncoming, incomingSignal, onEnd,
    isGroupCall, groupId, groupData
}) {
    const [callState, setCallState] = useState(isGroupCall ? 'connected' : (isIncoming ? 'incoming' : 'calling'));
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setCamOff] = useState(false);
    const [isRemoteCamOff, setRemoteCamOff] = useState(false);
    const [isRemoteMuted, setRemoteMuted] = useState(false);
    const [activeTab, setActiveTab] = useState(null); // 'chat' | 'participants'
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [duration, setDuration] = useState(0);
    const [ticker, setTicker] = useState(isGroupCall ? 'Group Call Active' : ' Syncing connection...');
    const myVideoRef = useRef();
    const peerVideoRef = useRef();
    const myStreamRef = useRef();
    const peerInstanceRef = useRef();
    const callInstanceRef = useRef();
    const chatEndRef = useRef();

    // Group call connection states & refs
    const [groupParticipants, setGroupParticipants] = useState([]);
    const [peerStreams, setPeerStreams] = useState({});
    const callsRef = useRef({});

    // Timer
    useEffect(() => {
        if (callState !== 'connected') return;
        const t = setInterval(() => setDuration(p => p + 1), 1000);
        return () => clearInterval(t);
    }, [callState]);

    // Auto scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const getMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === 'video',
            });
            myStreamRef.current = stream;
            if (myVideoRef.current) myVideoRef.current.srcObject = stream;
            return stream;
        } catch (err) {
            console.warn('Initial getUserMedia attempt failed:', err);

            if (callType === 'video') {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false,
                    });
                    myStreamRef.current = audioStream;
                    if (myVideoRef.current) myVideoRef.current.srcObject = audioStream;
                    setCamOff(true);
                    return audioStream;
                } catch (audioErr) {
                    console.warn('Audio-only fallback also failed:', audioErr);
                }
            }

            console.log('Establishing call connection with blank MediaStream.');
            setCamOff(true);
            setIsMuted(true);
            const emptyStream = new MediaStream();
            myStreamRef.current = emptyStream;
            return emptyStream;
        }
    };

    const stopMedia = () => {
        myStreamRef.current?.getTracks().forEach(t => t.stop());
        myStreamRef.current = null;
        if (myVideoRef.current) myVideoRef.current.srcObject = null;
        if (peerVideoRef.current) peerVideoRef.current.srcObject = null;
        
        callInstanceRef.current?.close();
        Object.values(callsRef.current).forEach(c => c.close());
        callsRef.current = {};
        
        peerInstanceRef.current?.destroy();
    };

    const endCall = () => {
        stopMedia();
        if (isGroupCall) {
            socket.emit('group_call_leave', { groupId, userId: user.id });
        } else {
            socket.emit('call_ended', { to: otherUser.id });
        }
        onEnd();
    };

    const upgradeToRealMedia = async () => {
        try {
            console.log('Upgrading blank stream to real media devices...');
            let realStream;
            try {
                realStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: callType === 'video',
                });
            } catch (err) {
                console.warn('Upgrade failed with default constraints, trying audio only...', err);
                realStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false,
                });
                setCamOff(true);
            }

            const oldStream = myStreamRef.current;
            myStreamRef.current = realStream;
            if (myVideoRef.current) myVideoRef.current.srcObject = realStream;

            if (oldStream) {
                oldStream.getTracks().forEach(t => t.stop());
            }

            if (isGroupCall) {
                // Replace tracks on all active group peer connections
                const newAudioTrack = realStream.getAudioTracks()[0];
                const newVideoTrack = realStream.getVideoTracks()[0];

                Object.values(callsRef.current).forEach(call => {
                    if (call.peerConnection) {
                        const senders = call.peerConnection.getSenders();
                        if (newAudioTrack) {
                            const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                            if (audioSender) audioSender.replaceTrack(newAudioTrack);
                        }
                        if (newVideoTrack) {
                            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                            if (videoSender) videoSender.replaceTrack(newVideoTrack);
                        }
                    }
                });
            } else if (callInstanceRef.current?.peerConnection) {
                const senders = callInstanceRef.current.peerConnection.getSenders();

                const newAudioTrack = realStream.getAudioTracks()[0];
                if (newAudioTrack) {
                    const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                    if (audioSender) await audioSender.replaceTrack(newAudioTrack);
                }

                const newVideoTrack = realStream.getVideoTracks()[0];
                if (newVideoTrack) {
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                    if (videoSender) await videoSender.replaceTrack(newVideoTrack);
                }
            }

            setIsMuted(false);
            if (realStream.getVideoTracks().length > 0) {
                setCamOff(false);
            }

            if (isGroupCall) {
                socket.emit('group_call_state_changed', {
                    groupId,
                    userId: user.id,
                    isMuted: false,
                    isCamOff: realStream.getVideoTracks().length === 0
                });
            } else {
                socket.emit('call_state_changed', {
                    to: otherUser.id,
                    isMuted: false,
                    isCamOff: realStream.getVideoTracks().length === 0
                });
            }

        } catch (err) {
            console.error('Failed to upgrade to real media:', err);
        }
    };

    const toggleMute = async () => {
        const nextState = !isMuted;
        setIsMuted(nextState);

        let localTrack = myStreamRef.current?.getAudioTracks()[0];
        if (!nextState && !localTrack) {
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const newAudioTrack = tempStream.getAudioTracks()[0];
                if (newAudioTrack) {
                    myStreamRef.current.addTrack(newAudioTrack);
                    localTrack = newAudioTrack;

                    if (isGroupCall) {
                        Object.values(callsRef.current).forEach(call => {
                            if (call.peerConnection) {
                                const senders = call.peerConnection.getSenders();
                                const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                                if (audioSender) audioSender.replaceTrack(newAudioTrack);
                            }
                        });
                    } else if (callInstanceRef.current?.peerConnection) {
                        const senders = callInstanceRef.current.peerConnection.getSenders();
                        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                        if (audioSender) await audioSender.replaceTrack(newAudioTrack);
                    }
                }
            } catch (err) {
                console.warn('Could not dynamically acquire audio track:', err);
                setIsMuted(true);
                return;
            }
        }

        if (localTrack) {
            localTrack.enabled = !nextState;
        }

        if (isGroupCall) {
            Object.values(callsRef.current).forEach(call => {
                if (call.peerConnection) {
                    const senders = call.peerConnection.getSenders();
                    const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                    if (audioSender && audioSender.track) {
                        audioSender.track.enabled = !nextState;
                    }
                }
            });
            socket.emit('group_call_state_changed', { groupId, userId: user.id, isMuted: nextState });
        } else {
            if (callInstanceRef.current?.peerConnection) {
                const senders = callInstanceRef.current.peerConnection.getSenders();
                const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                if (audioSender && audioSender.track) {
                    audioSender.track.enabled = !nextState;
                }
            }
            socket.emit('call_state_changed', { to: otherUser.id, isMuted: nextState });
        }
    };

    const toggleCamera = async () => {
        const nextState = !isCamOff;
        setCamOff(nextState);

        let localTrack = myStreamRef.current?.getVideoTracks()[0];
        if (!nextState && !localTrack) {
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = tempStream.getVideoTracks()[0];
                if (newVideoTrack) {
                    myStreamRef.current.addTrack(newVideoTrack);
                    localTrack = newVideoTrack;

                    if (isGroupCall) {
                        Object.values(callsRef.current).forEach(call => {
                            if (call.peerConnection) {
                                const senders = call.peerConnection.getSenders();
                                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                                if (videoSender) videoSender.replaceTrack(newVideoTrack);
                            }
                        });
                    } else if (callInstanceRef.current?.peerConnection) {
                        const senders = callInstanceRef.current.peerConnection.getSenders();
                        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                        if (videoSender) await videoSender.replaceTrack(newVideoTrack);
                    }
                }
            } catch (err) {
                console.warn('Could not dynamically acquire video track:', err);
                setCamOff(true);
                return;
            }
        }

        if (localTrack) {
            localTrack.enabled = !nextState;
        }

        if (isGroupCall) {
            Object.values(callsRef.current).forEach(call => {
                if (call.peerConnection) {
                    const senders = call.peerConnection.getSenders();
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                    if (videoSender && videoSender.track) {
                        videoSender.track.enabled = !nextState;
                    }
                }
            });
            socket.emit('group_call_state_changed', { groupId, userId: user.id, isCamOff: nextState });
        } else {
            if (callInstanceRef.current?.peerConnection) {
                const senders = callInstanceRef.current.peerConnection.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                if (videoSender && videoSender.track) {
                    videoSender.track.enabled = !nextState;
                }
            }
            socket.emit('call_state_changed', { to: otherUser.id, isCamOff: nextState });
        }
    };

    useEffect(() => {
        let camStatus, micStatus;
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'camera' }).then(status => {
                camStatus = status;
                status.onchange = () => {
                    console.log('Camera permission state changed in background:', status.state);
                    if (status.state === 'granted') upgradeToRealMedia();
                };
            }).catch(e => console.warn('Camera permission query not supported:', e));

            navigator.permissions.query({ name: 'microphone' }).then(status => {
                micStatus = status;
                status.onchange = () => {
                    console.log('Microphone permission state changed in background:', status.state);
                    if (status.state === 'granted') upgradeToRealMedia();
                };
            }).catch(e => console.warn('Microphone permission query not supported:', e));
        }
    }, [callType]);

    const startCall = async () => {
        const stream = await getMedia();
        if (!stream) return;
        const peer = new Peer(`user_${user.id}_${Date.now()}`, {
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });
        peerInstanceRef.current = peer;
        peer.on('open', (peerId) => {
            socket.emit('call_user', { to: otherUser.id, from: user.id, peerId, callType, caller: user });
        });
        socket.on('call_accepted', ({ receiverPeerId }) => {
            const call = peer.call(receiverPeerId, stream);
            callInstanceRef.current = call;
            call.on('stream', (remoteStream) => {
                if (peerVideoRef.current) peerVideoRef.current.srcObject = remoteStream;
                setCallState('connected');
            });
            call.on('close', () => { stopMedia(); onEnd(); });
        });
        peer.on('error', (e) => { console.error(e); stopMedia(); onEnd(); });
    };

    const answerCall = async () => {
        setCallState('connected');
        const stream = await getMedia();
        if (!stream) return;
        const peer = new Peer(`user_${user.id}_${Date.now()}`, {
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });
        peerInstanceRef.current = peer;
        peer.on('open', (receiverPeerId) => {
            socket.emit('call_accepted', { to: otherUser.id, receiverPeerId });
        });
        peer.on('call', (call) => {
            callInstanceRef.current = call;
            call.answer(stream);
            call.on('stream', (remoteStream) => {
                if (peerVideoRef.current) peerVideoRef.current.srcObject = remoteStream;
            });
            call.on('close', () => { stopMedia(); onEnd(); });
        });
        peer.on('error', (e) => console.error(e));
    };

    const startGroupCall = async () => {
        setCallState('connected');
        setTicker('Group Call Active');

        const stream = await getMedia();
        if (!stream) return;

        const myPeerId = `user_${user.id}_${Date.now()}`;
        const peer = new Peer(myPeerId, {
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });
        peerInstanceRef.current = peer;

        peer.on('open', (peerId) => {
            console.log('Group Peer opened successfully:', peerId);
            socket.emit('group_call_join', {
                groupId,
                userId: user.id,
                userName: user.name,
                peerId,
                avatar: user.avatar,
                callType
            });
        });

        socket.on('group_peer_joined', ({ userId: otherId, userName: otherName, peerId: otherPeerId, avatar: otherAvatar }) => {
            if (String(otherId) === String(user.id)) return;
            console.log(`Calling newly joined peer ${otherName} (PeerID: ${otherPeerId})`);
            
            const call = peer.call(otherPeerId, stream);
            callsRef.current[String(otherId)] = call;
            
            call.on('stream', (remoteStream) => {
                console.log(`Received stream from peer ${otherName}`);
                setPeerStreams(prev => ({
                    ...prev,
                    [String(otherId)]: remoteStream
                }));
            });

            call.on('close', () => {
                setPeerStreams(prev => {
                    const copy = { ...prev };
                    delete copy[String(otherId)];
                    return copy;
                });
            });
        });

        peer.on('call', (call) => {
            console.log('Answering incoming group call from peer:', call.peer);
            call.answer(stream);
            
            const match = call.peer.match(/^user_(\d+)_/);
            const otherId = match ? match[1] : call.peer;

            callsRef.current[String(otherId)] = call;

            call.on('stream', (remoteStream) => {
                console.log(`Received stream from caller peer ID: ${otherId}`);
                setPeerStreams(prev => ({
                    ...prev,
                    [String(otherId)]: remoteStream
                }));
            });

            call.on('close', () => {
                setPeerStreams(prev => {
                    const copy = { ...prev };
                    delete copy[String(otherId)];
                    return copy;
                });
            });
        });

        socket.on('group_call_updated', ({ participants }) => {
            const otherParts = participants.filter(p => String(p.userId) !== String(user.id));
            setGroupParticipants(otherParts);
        });

        socket.on('group_peer_left', ({ userId: leftId }) => {
            console.log(`Peer ${leftId} left the call`);
            if (callsRef.current[String(leftId)]) {
                callsRef.current[String(leftId)].close();
                delete callsRef.current[String(leftId)];
            }
            setPeerStreams(prev => {
                const copy = { ...prev };
                delete copy[String(leftId)];
                return copy;
            });
        });

        socket.on('group_peer_state_changed', ({ userId: stateUserId, isMuted: peerMuted, isCamOff: peerCamOff }) => {
            setGroupParticipants(prev => prev.map(p => {
                if (String(p.userId) === String(stateUserId)) {
                    return {
                        ...p,
                        isMuted: peerMuted !== undefined ? peerMuted : p.isMuted,
                        isCamOff: peerCamOff !== undefined ? peerCamOff : p.isCamOff
                    };
                }
                return p;
            }));
        });

        socket.on('group_call_ended', () => {
            stopMedia();
            onEnd();
        });
    };

    useEffect(() => {
        if (isGroupCall) {
            startGroupCall();
        } else {
            if (!isIncoming) startCall();
        }

        socket.on('call_ended', () => { stopMedia(); onEnd(); });
        socket.on('call_state_changed', ({ isMuted, isCamOff }) => {
            if (isMuted !== undefined) setRemoteMuted(isMuted);
            if (isCamOff !== undefined) setRemoteCamOff(isCamOff);
        });
        socket.on('call_chat_message', ({ text, senderId, time }) => {
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: text,
                sender: 'other',
                time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        });
        return () => {
            socket.off('call_ended');
            socket.off('call_accepted');
            socket.off('call_state_changed');
            socket.off('call_chat_message');
            socket.off('group_peer_joined');
            socket.off('group_call_updated');
            socket.off('group_peer_left');
            socket.off('group_peer_state_changed');
            socket.off('group_call_ended');
            stopMedia();
        };
    }, []);

    const sendChatMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const msgText = chatInput.trim();
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isGroupCall) {
            // For group call, broadcast message via group room
            socket.emit('send_group_message', {
                group_id: groupId,
                message: `[In-call Chat] ${msgText}`,
                sender_id: user.id
            });
        } else {
            socket.emit('call_chat_message', {
                to: otherUser.id,
                text: msgText,
                senderId: user.id,
                time: timeStr
            });
        }

        setMessages(prev => [...prev, {
            id: Date.now(),
            text: msgText,
            sender: 'me',
            time: timeStr
        }]);
        setChatInput('');
    };

    // ── INCOMING SCREEN ──────────────────────────
    if (callState === 'incoming') {
        return (
            <div style={S.overlay}>
                <div style={S.incomingCard}>
                    <div style={S.incomingTop}>
                        <div style={S.incomingPulse} />
                        <SafeAvatar src={otherUser.avatar} name={otherUser.name} size={90} style={S.incomingAvatar} />
                    </div>
                    <div style={S.incomingName}>{otherUser.name}</div>
                    <div style={S.incomingLabel}>
                        Incoming {callType === 'video' ? 'Video' : ' Audio'} Call
                    </div>
                    <div style={S.incomingBtns}>
                        <button onClick={endCall} style={S.rejectBtn}>✕ Decline</button>
                        <button onClick={answerCall} style={S.acceptBtn}>✓ Accept</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── MAIN CALL SCREEN ─────────────────────────
    return (
        <div style={S.fullscreen}>

            {/* ── HEADER ── */}
            <div style={S.header}>
                <div style={S.headerLeft}>
                    <button onClick={endCall} style={S.backBtn}><ArrowLeft /></button>
                    <div>
                        <div style={S.headerTitle}>
                            {isGroupCall 
                                ? (groupData?.name || 'Group Call')
                                : (callState === 'calling' ? `Calling ${otherUser.name}...` : otherUser.name)
                            }
                        </div>
                        <div style={S.headerMeta}>
                            {(callState === 'connected' || isGroupCall) && (
                                <>
                                    <span style={S.recDot} />
                                    <span style={{ color: '#ef4444', fontWeight: 700 }}>LIVE</span>
                                    <span style={{ color: '#6e7979' }}>•</span>
                                    <span style={{ color: '#6e7979' }}>{formatTime(duration)}</span>
                                </>
                            )}
                            {!isGroupCall && callState === 'calling' && (
                                <span style={{ color: '#6e7979' }}>Connecting...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ticker */}
                <div style={S.ticker}>
                    <SparkleIcon />
                    <span style={S.tickerText}>{ticker}</span>
                </div>


            </div>

            {/* ── MAIN AREA ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingTop: 64, paddingBottom: 72 }}>

                {/* Video Grid */}
                <div style={{
                    flex: 1, display: 'flex', gap: 12, padding: 16,
                    background: '#0f172a', alignItems: 'center', justifyContent: 'center',
                    flexWrap: 'wrap', overflowY: 'auto'
                }}>
                    {isGroupCall ? (
                        <>
                            {/* My Tile */}
                            <div style={{
                                ...S.videoTile,
                                width: groupParticipants.length === 0 ? '80%' : (groupParticipants.length === 1 ? '45%' : '30%'),
                                height: groupParticipants.length === 0 ? '80%' : (groupParticipants.length === 1 ? '70%' : '45%'),
                                minWidth: 200,
                                position: 'relative'
                            }}>
                                {callType === 'video' ? (
                                    <video ref={myVideoRef} autoPlay playsInline muted style={S.videoFill} />
                                ) : (
                                    <div style={{ ...S.camOffOverlay, background: '#1e293b' }}>
                                        <SafeAvatar src={user.avatar} name={user.name} size={70} style={S.waitingAvatar} />
                                    </div>
                                )}
                                <div style={S.nameBadge}>You {isMuted && ' (Muted)'}</div>
                                {callType === 'video' && isCamOff && (
                                    <div style={S.camOffOverlay}>
                                        <SafeAvatar src={user.avatar} name={user.name} size={70} style={S.waitingAvatar} />
                                        <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 11 }}>Camera off</div>
                                    </div>
                                )}
                            </div>

                            {/* Remote Peers Tiles */}
                            {groupParticipants.map(p => {
                                const remoteStream = peerStreams[String(p.userId)];
                                return (
                                    <div style={{
                                        ...S.videoTile,
                                        width: groupParticipants.length === 1 ? '45%' : '30%',
                                        height: groupParticipants.length === 1 ? '70%' : '45%',
                                        minWidth: 200,
                                        position: 'relative'
                                    }} key={p.userId}>
                                        {callType === 'video' && remoteStream ? (
                                            <video 
                                                ref={el => { 
                                                    if (el && el.srcObject !== remoteStream) { 
                                                        el.srcObject = remoteStream; 
                                                    } 
                                                }} 
                                                autoPlay 
                                                playsInline 
                                                style={S.videoFill} 
                                            />
                                        ) : (
                                            <div style={{ ...S.camOffOverlay, background: '#1e293b' }}>
                                                <SafeAvatar src={p.avatar} name={p.userName} size={70} style={S.waitingAvatar} />
                                            </div>
                                        )}
                                        <div style={S.nameBadge}>{p.userName} {p.isMuted && ' (Muted)'}</div>
                                        {(callType === 'video' && (p.isCamOff || !remoteStream)) && (
                                            <div style={S.camOffOverlay}>
                                                <SafeAvatar src={p.avatar} name={p.userName} size={70} style={S.waitingAvatar} />
                                                <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 11 }}>
                                                    {!remoteStream ? 'Connecting...' : 'Camera off'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        callType === 'video' ? (
                            <>
                                {/* Remote tile */}
                                <div style={S.videoTile}>
                                    <video ref={peerVideoRef} autoPlay playsInline style={S.videoFill} />
                                    <div style={S.nameBadge}>{otherUser.name}</div>
                                    {isRemoteCamOff && (
                                        <div style={S.camOffOverlay}>
                                            <SafeAvatar src={otherUser.avatar} name={otherUser.name} size={80} style={S.waitingAvatar} />
                                            <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>Camera off</div>
                                        </div>
                                    )}
                                    {callState === 'calling' && (
                                        <div style={S.waitingOverlay}>
                                            <SafeAvatar src={otherUser.avatar} name={otherUser.name} size={80} style={S.waitingAvatar} />
                                            <div style={{ color: 'white', marginTop: 12, fontSize: 14 }}>Ringing...</div>
                                        </div>
                                    )}
                                </div>
                                {/* My tile */}
                                <div style={S.videoTile}>
                                    <video ref={myVideoRef} autoPlay playsInline muted style={S.videoFill} />
                                    <div style={S.nameBadge}>You</div>
                                    {isCamOff && (
                                        <div style={S.camOffOverlay}>
                                            <SafeAvatar src={user.avatar} name={user.name} size={80} style={S.waitingAvatar} />
                                            <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>Camera off</div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Audio call */
                            <div style={S.audioLayout}>
                                <div style={S.audioTile}>
                                    <SafeAvatar src={otherUser.avatar} name={otherUser.name} size={100} style={S.audioAvatar} />
                                    <div style={S.audioName}>{otherUser.name}</div>
                                    <div style={S.audioStatus}>
                                        {callState === 'calling' ? ' Ringing...' : (isRemoteMuted ? ' Muted' : '🟢 Connected')}
                                    </div>
                                </div>
                                <div style={{ ...S.audioTile, opacity: 0.7 }}>
                                    <SafeAvatar src={user.avatar} name={user.name} size={100} style={S.audioAvatar} />
                                    <div style={S.audioName}>You</div>
                                    <div style={S.audioStatus}>{isMuted ? 'Muted' : 'Active'}</div>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* ── SIDE DRAWER ── */}
                {activeTab && (
                    <div style={S.drawer}>
                        <div style={S.drawerHeader}>
                            <span style={S.drawerTitle}>
                                {activeTab === 'chat' ? ' In-call Chat' : ' Participants'}
                            </span>
                            <button onClick={() => setActiveTab(null)} style={S.drawerClose}>✕</button>
                        </div>

                        {activeTab === 'participants' && (
                            <div style={S.drawerBody}>
                                {(isGroupCall 
                                    ? [
                                        { name: user.name, avatar: user.avatar, status: 'You' },
                                        ...groupParticipants.map(p => ({
                                            name: p.userName,
                                            avatar: p.avatar,
                                            status: p.isMuted ? 'Muted' : 'Connected'
                                        }))
                                      ]
                                    : [
                                        { name: otherUser.name, avatar: otherUser.avatar, status: callState === 'connected' ? 'Connected' : 'Calling' },
                                        { name: user.name, avatar: user.avatar, status: 'You' }
                                      ]
                                ).map((p, i) => (
                                    <div key={i} style={S.participantRow}>
                                        <SafeAvatar src={p.avatar} name={p.name} size={38} style={S.participantAvatar} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div style={S.chatArea}>
                                <div style={S.chatMessages}>
                                    {messages.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, marginTop: 40 }}>
                                            No messages yet
                                        </div>
                                    )}
                                    {messages.map(msg => (
                                        <div key={msg.id} style={{
                                            ...S.chatBubble,
                                            alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                                            background: msg.sender === 'me' ? 'var(--message-bg-outgoing)' : 'var(--message-bg-incoming)',
                                            color: msg.sender === 'me' ? 'var(--message-text-outgoing)' : 'var(--message-text-incoming)',
                                            border: msg.sender === 'me' ? 'none' : '1px solid var(--border-subtle)'
                                        }}>
                                            <div style={{ fontSize: 13 }}>{msg.text}</div>
                                            <div style={{ fontSize: 10, opacity: 0.7, textAlign: 'right', marginTop: 2 }}>{msg.time}</div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <form onSubmit={sendChatMessage} style={S.chatInputBar}>
                                    <input
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Type a message..."
                                        style={S.chatInput}
                                    />
                                    <button type="submit" style={S.chatSendBtn}><SendIcon /></button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── CONTROL BAR ── */}
            <div style={S.controlBar}>
                {/* Left — mic + cam */}
                <div style={S.controlGroup}>
                    <button onClick={toggleMute} style={{
                        ...S.ctrlBtn,
                        background: isMuted ? '#ef4444' : 'var(--input-bg)',
                        color: isMuted ? 'white' : 'var(--text-primary)',
                    }} title={isMuted ? 'Unmute' : 'Mute'}>
                        {isMuted ? <MicOffIcon /> : <MicIcon />}
                    </button>
                    {callType === 'video' && (
                        <button onClick={toggleCamera} style={{
                            ...S.ctrlBtn,
                            background: isCamOff ? '#ef4444' : 'var(--input-bg)',
                            color: isCamOff ? 'white' : 'var(--text-primary)',
                        }} title={isCamOff ? 'Start Camera' : 'Stop Camera'}>
                            {isCamOff ? <VideoOffIcon /> : <VideoIcon />}
                        </button>
                    )}
                </div>

                {/* Center — main actions */}
                <div style={S.controlGroup}>
                    <button
                        onClick={() => setActiveTab(t => t === 'participants' ? null : 'participants')}
                        style={{ ...S.ctrlBtn, background: activeTab === 'participants' ? 'var(--bg-search-input)' : 'var(--input-bg)', color: activeTab === 'participants' ? '#005153' : 'var(--text-primary)' }}
                        title="Participants"
                    >
                        <UsersIcon />
                    </button>

                    {/* End call — center */}
                    <button onClick={endCall} style={S.endBtn} title="End Call">
                        <PhoneOffIcon />
                    </button>

                    <button
                        onClick={() => setActiveTab(t => t === 'chat' ? null : 'chat')}
                        style={{ ...S.ctrlBtn, background: activeTab === 'chat' ? 'var(--bg-search-input)' : 'var(--input-bg)', color: activeTab === 'chat' ? '#005153' : 'var(--text-primary)' }}
                        title="Chat"
                    >
                        <ChatIcon />
                    </button>
                </div>

                {/* Right — secure badge */}
                <div style={S.controlGroup}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldIcon />
                        <span>Encrypted</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── STYLES ────────────────────────────────────────────
const S = {
    // Fullscreen
    fullscreen: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', zIndex: 2000 },
    overlay: { position: 'fixed', inset: 0, background: 'var(--modal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },

    // Header
    header: { position: 'fixed', top: 0, left: 0, right: 0, height: 64, background: 'var(--topbar-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 100 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    headerTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
    headerMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 2 },
    headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
    backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#005153', padding: 6, borderRadius: '50%', display: 'flex' },
    recDot: { width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' },
    ticker: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,81,83,0.06)', border: '1px solid rgba(0,81,83,0.15)', borderRadius: 999, padding: '4px 12px' },
    tickerText: { fontSize: 11, color: '#005153', fontWeight: 500 },
    // Video
    videoTile: { flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-search-wrap)', border: '1px solid var(--border-color)', maxHeight: 'calc(100vh - 160px)' },
    videoFill: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    nameBadge: { position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, backdropFilter: 'blur(4px)' },
    waitingOverlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-search-wrap)' },
    waitingAvatar: { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' },
    camOffOverlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-search-wrap)' },

    // Audio call
    audioLayout: { display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center' },
    audioTile: { textAlign: 'center', position: 'relative' },
    audioRing: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: '50%', border: '2px solid var(--tick-color)', opacity: 0.4, animation: 'pulse 2s infinite' },
    audioAvatar: { width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' },
    audioName: { fontSize: 16, fontWeight: 600, color: '#f8fafc', marginTop: 12 },
    audioStatus: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

    // Drawer
    drawer: { width: 320, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' },
    drawerHeader: { padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    drawerTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
    drawerClose: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' },
    drawerBody: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
    participantRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-search-wrap)', borderRadius: 10, border: '1px solid var(--border-subtle)' },
    participantAvatar: { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' },

    // Chat
    chatArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    chatMessages: { flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
    chatBubble: { maxWidth: '80%', padding: '8px 12px', borderRadius: 12, fontSize: 13 },
    chatInputBar: { display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border-color)', background: 'var(--inputbar-bg)' },
    chatInput: { flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
    chatSendBtn: { width: 36, height: 36, background: '#005153', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    // Control bar
    controlBar: { position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, background: 'var(--inputbar-bg)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', zIndex: 100 },
    controlGroup: { display: 'flex', alignItems: 'center', gap: 12 },
    ctrlBtn: { width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' },
    endBtn: { width: 52, height: 52, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' },

    // Incoming
    incomingCard: { background: 'var(--modal-card-bg)', borderRadius: 24, padding: '40px 36px', textAlign: 'center', minWidth: 320, border: '1px solid var(--modal-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' },
    incomingTop: { position: 'relative', display: 'inline-block', marginBottom: 20 },
    incomingPulse: { position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid var(--tick-color)', opacity: 0.4, animation: 'pulse 2s infinite' },
    incomingAvatar: { width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--tick-color)', position: 'relative', zIndex: 1 },
    incomingName: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 },
    incomingLabel: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 },
    incomingBtns: { display: 'flex', gap: 16, justifyContent: 'center' },
    rejectBtn: { padding: '12px 28px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 15, fontWeight: 600 },
    acceptBtn: { padding: '12px 28px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 15, fontWeight: 600 },
};