import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import GroupChatWindow from '../components/GroupChatWindow';
import { useAuth } from '../context/AuthContext';
import CallModal from '../components/CallModal';

const SOCKET_URL = 'http://localhost:5000';

export default function Chat() {
  const { user } = useAuth();
  const { userId, groupId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [callModal, setCallModal] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        navigate('/chat');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const s = io(SOCKET_URL, { withCredentials: true });
    s.emit('user_online', user?.id);
    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming_call', ({ from, caller, peerId, callType }) => {
      setIncomingCall({ from, caller, peerId, callType });
    });

    return () => {
      socket.off('incoming_call');
    };
  }, [socket]);

  const sendCallSystemMessage = async (receiverId, textContent) => {
    try {
      const formData = new FormData();
      formData.append('receiver_id', receiverId);
      formData.append('message', textContent);

      const res = await axios.post(`${SOCKET_URL}/api/messages`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      socket?.emit('send_message', { ...res.data, receiver_id: parseInt(receiverId) });
    } catch (err) {
      console.error('Failed to send global system call message:', err);
    }
  };

  const handleStartCall = (callType, otherUser) => {
    setCallModal({ callType, otherUser, isIncoming: false, isGroupCall: false });
    sendCallSystemMessage(otherUser.id, callType === 'video' ? '📹 Video call started' : '📞 Audio call started');
  };

  const handleStartGroupCall = (callType, groupData) => {
    setCallModal({ callType, groupData, isIncoming: false, isGroupCall: true });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative', background: 'var(--bg-primary)' }}>
      <Sidebar socket={socket} />
      {groupId
        ? <GroupChatWindow socket={socket} onStartGroupCall={handleStartGroupCall} />
        : <ChatWindow socket={socket} onStartCall={handleStartCall} />
      }

      {/* Global Call Modal Overlay */}
      {(callModal || incomingCall) && (
        <CallModal
          socket={socket}
          user={user}
          otherUser={incomingCall ? incomingCall.caller : callModal?.otherUser}
          isGroupCall={callModal?.isGroupCall}
          groupId={callModal?.isGroupCall ? groupId : null}
          groupData={callModal?.groupData}
          callType={callModal?.callType || incomingCall?.callType}
          isIncoming={!!incomingCall}
          incomingSignal={incomingCall?.peerId}
          onEnd={() => {
            if (!incomingCall && !callModal?.isGroupCall) {
              const currentCallType = callModal?.callType || incomingCall?.callType;
              const label = currentCallType === 'video' ? '📹 Video call ended' : '📞 Audio call ended';
              sendCallSystemMessage(incomingCall ? incomingCall.from : callModal.otherUser.id, label);
            }
            setCallModal(null);
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}