import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CreateGroupModal from './CreateGroupModal';

const API = import.meta.env.VITE_API_URL;

export default function Sidebar({ socket }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnline] = useState([]);
  const [search, setSearch] = useState('');
  const { userId, groupId } = useParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');

  // Track unread status for conversations/groups (persisted in localStorage)
  const [unreadChats, setUnreadChats] = useState(() => {
    try {
      const saved = localStorage.getItem(`unreadChats_${user?.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Track timestamps of last message for sorting (persisted in localStorage)
  const [lastMessageTimes, setLastMessageTimes] = useState(() => {
    try {
      const saved = localStorage.getItem(`lastMessageTimes_${user?.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Persist unread status to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`unreadChats_${user.id}`, JSON.stringify(unreadChats));
    }
  }, [unreadChats, user]);

  // Persist last message timestamps to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`lastMessageTimes_${user.id}`, JSON.stringify(lastMessageTimes));
    }
  }, [lastMessageTimes, user]);

  // Clear unread status when opening a private chat
  useEffect(() => {
    if (userId) {
      setUnreadChats(prev => {
        if (prev[`user_${userId}`]) {
          const copy = { ...prev };
          delete copy[`user_${userId}`];
          return copy;
        }
        return prev;
      });
    }
  }, [userId]);

  // Clear unread status when opening a group chat
  useEffect(() => {
    if (groupId) {
      setUnreadChats(prev => {
        if (prev[`group_${groupId}`]) {
          const copy = { ...prev };
          delete copy[`group_${groupId}`];
          return copy;
        }
        return prev;
      });
    }
  }, [groupId]);

  // Load all users
  useEffect(() => {
    axios.get(`${API}/api/users`, { withCredentials: true })
      .then(res => setUsers(res.data))
      .catch(console.error);
  }, []);

  // Listen for online users from socket
  useEffect(() => {
    if (!socket) return;
    socket.on('online_users', (ids) => {
      setOnline(ids.map(String));
    });
    return () => socket.off('online_users');
  }, [socket]);

  const fetchGroups = () => {
    axios.get(`${API}/api/groups`, { withCredentials: true })
      .then(res => setGroups(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Listen for group events on socket
  useEffect(() => {
    if (!socket) return;

    socket.on('group_deleted', () => {
      fetchGroups();
    });

    socket.on('group_member_added', () => {
      fetchGroups();
    });

    socket.on('group_member_removed', () => {
      fetchGroups();
    });

    socket.on('group_info_updated', () => {
      fetchGroups();
    });

    return () => {
      socket.off('group_deleted');
      socket.off('group_member_added');
      socket.off('group_member_removed');
      socket.off('group_info_updated');
    };
  }, [socket]);

  // Global socket listener for new messages & messages sent to sync sorting and unread dots
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      const isCurrentChat = String(userId) === String(msg.sender_id);
      const isFromMe = String(user?.id) === String(msg.sender_id);

      if (isFromMe) {
        setLastMessageTimes(prev => ({ ...prev, [`user_${msg.receiver_id}`]: Date.now() }));
      } else {
        setLastMessageTimes(prev => ({ ...prev, [`user_${msg.sender_id}`]: Date.now() }));
        if (!isCurrentChat) {
          setUnreadChats(prev => ({ ...prev, [`user_${msg.sender_id}`]: true }));
        }
      }
    };

    const handleReceiveGroupMessage = (msg) => {
      const isCurrentGroup = String(groupId) === String(msg.group_id);
      setLastMessageTimes(prev => ({ ...prev, [`group_${msg.group_id}`]: Date.now() }));
      if (!isCurrentGroup) {
        setUnreadChats(prev => ({ ...prev, [`group_${msg.group_id}`]: true }));
      }
    };

    // Confirmation from server for messages we sent ourselves
    const handleMessageSent = (msg) => {
      setLastMessageTimes(prev => ({ ...prev, [`user_${msg.receiver_id}`]: Date.now() }));
    };

    const handleGroupMessageSent = (msg) => {
      setLastMessageTimes(prev => ({ ...prev, [`group_${msg.group_id}`]: Date.now() }));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('receive_group_message', handleReceiveGroupMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('group_message_sent', handleGroupMessageSent);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('receive_group_message', handleReceiveGroupMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('group_message_sent', handleGroupMessageSent);
    };
  }, [socket, userId, groupId, user]);

  // Fetch unread messages count on mount
  useEffect(() => {
    axios.get(`${API}/api/messages/unread`, { withCredentials: true })
      .then(res => {
        const countsMap = {};
        res.data.forEach(item => {
          countsMap[`user_${item.sender_id}`] = true;
        });
        setUnreadChats(prev => ({ ...prev, ...countsMap }));
      })
      .catch(console.error);
  }, []);

  // Fetch recent conversation timestamps on mount
  useEffect(() => {
    axios.get(`${API}/api/messages/recent`, { withCredentials: true })
      .then(res => {
        setLastMessageTimes(prev => ({ ...res.data, ...prev }));
      })
      .catch(console.error);
  }, []);

  const handleDeleteChat = async (targetUserId, targetUserName) => {
    if (!window.confirm(`Are you sure you want to clear this conversation with ${targetUserName}? This will permanently delete all messages.`)) {
      return;
    }
    try {
      await axios.delete(`${API}/api/messages/conversation/${targetUserId}`, { withCredentials: true });
      // Remove conversation timestamp from local state so it goes to "Other Contacts"
      setLastMessageTimes(prev => {
        const copy = { ...prev };
        delete copy[`user_${targetUserId}`];
        return copy;
      });
      if (String(userId) === String(targetUserId)) {
        navigate('/chat');
      } else {
        alert('Conversation cleared successfully.');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      alert('Failed to clear conversation.');
    }
  };

  const handleDeleteLeaveGroup = async (targetGroupId, groupName, creatorId) => {
    const isCreator = creatorId === user?.id;
    if (isCreator) {
      if (!window.confirm(`Are you sure you want to delete the group "${groupName}"? This will remove all members and delete all messages.`)) {
        return;
      }
      try {
        await axios.delete(`${API}/api/groups/${targetGroupId}`, { withCredentials: true });
        socket?.emit('delete_group', { groupId: targetGroupId });
        setLastMessageTimes(prev => {
          const copy = { ...prev };
          delete copy[`group_${targetGroupId}`];
          return copy;
        });
        fetchGroups();
        if (String(groupId) === String(targetGroupId)) {
          navigate('/chat');
        }
      } catch (err) {
        console.error('Failed to delete group:', err);
        alert('Failed to delete group.');
      }
    } else {
      if (!window.confirm(`Are you sure you want to leave the group "${groupName}"?`)) {
        return;
      }
      try {
        await axios.delete(`${API}/api/groups/${targetGroupId}/leave`, { withCredentials: true });
        socket?.emit('remove_group_member', { groupId: targetGroupId, userId: user?.id });
        setLastMessageTimes(prev => {
          const copy = { ...prev };
          delete copy[`group_${targetGroupId}`];
          return copy;
        });
        fetchGroups();
        if (String(groupId) === String(targetGroupId)) {
          navigate('/chat');
        }
      } catch (err) {
        console.error('Failed to leave group:', err);
        alert('Failed to leave group.');
      }
    }
  };

  const isOnline = (id) => onlineUsers.includes(String(id));

  // Search filtering
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  // Dynamic sorting (recent first, then alphabetical fallback)
  const sortedUsers = [...filtered].sort((a, b) => {
    const timeA = lastMessageTimes[`user_${a.id}`] || 0;
    const timeB = lastMessageTimes[`user_${b.id}`] || 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return a.name.localeCompare(b.name);
  });

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const timeA = lastMessageTimes[`group_${a.id}`] || 0;
    const timeB = lastMessageTimes[`group_${b.id}`] || 0;
    return timeB - timeA;
  });

  // Divide users into parts: with whom we have talked vs other contacts
  const recentUsers = sortedUsers.filter(u => (lastMessageTimes[`user_${u.id}`] || 0) > 0);
  const otherUsers = sortedUsers.filter(u => !(lastMessageTimes[`user_${u.id}`] || 0));

  // Divide groups into parts: with whom we have talked vs other groups
  const recentGroups = sortedGroups.filter(g => (lastMessageTimes[`group_${g.id}`] || 0) > 0);
  const otherGroups = sortedGroups.filter(g => !(lastMessageTimes[`group_${g.id}`] || 0));

  return (
    <div style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.profile}>
          <div style={styles.avatarWrap}>
            <img src={user?.avatar} alt="me" style={styles.avatar} />
            <span style={styles.onlineDot} />
          </div>
          <div>
            <div style={styles.myName}>{user?.name}</div>
            <div style={styles.myEmail}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <input
          placeholder=" Search users..."
          style={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
        {['chats', 'groups'].map(tab => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, textAlign: 'center', padding: '10px 0',
              fontSize: 13, cursor: 'pointer',
              color: activeTab === tab ? '#005153' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid #005153' : '2px solid transparent',
              fontWeight: activeTab === tab ? 500 : 400,
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Conditional list */}
      {activeTab === 'chats' ? (
        <div style={styles.userList}>
          <div style={styles.listTitle}>
            Users · <span style={{ color: '#22c55e' }}>{onlineUsers.length} online</span>
          </div>

          {sortedUsers.length === 0 && (
            <div style={styles.empty}>No users found</div>
          )}

          {sortedUsers.length > 0 && (
            <>
              {/* Recent Chats Section */}
              <div style={styles.sectionHeader}>Recent Chats</div>
              {recentUsers.length === 0 ? (
                <div style={{ ...styles.empty, fontSize: 12, padding: '14px 16px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  No recent chats yet. Select a contact below to start! 💬
                </div>
              ) : (
                recentUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => navigate(`/chat/${u.id}`)}
                    className="sidebar-item"
                    style={{
                      ...styles.userItem,
                      background: String(userId) === String(u.id) ? 'var(--bg-search-wrap)' : 'var(--bg-primary)',
                      borderLeft: String(userId) === String(u.id) ? '3px solid #005153' : '3px solid transparent',
                    }}
                  >
                    <div style={styles.avatarWrap}>
                      <img src={u.avatar} alt={u.name} style={styles.userAvatar} />
                      <span style={{
                        ...styles.statusDot,
                        background: isOnline(u.id) ? '#06D755' : 'var(--text-secondary)',
                      }} />
                    </div>
                    <div style={styles.contactInfo}>
                      <div style={styles.contactRow}>
                        <div style={styles.userName}>{u.name}</div>
                        <div style={styles.contactTime}>{isOnline(u.id) ? 'online' : 'offline'}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {u.email}
                        </div>
                        {unreadChats[`user_${u.id}`] && (
                          <span style={{
                            width: 8,
                            height: 8,
                            background: '#22c55e',
                            borderRadius: '50%',
                            marginLeft: 8,
                            flexShrink: 0,
                            boxShadow: '0 0 6px #22c55e'
                          }} />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(u.id, u.name);
                      }}
                      className="delete-btn"
                      title="Clear Conversation"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                        <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                        <rect x="4" y="7" width="16" height="2" rx="0.5" />
                        <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                        <line x1="9" y1="12" x2="9" y2="17" />
                        <line x1="12" y1="12" x2="12" y2="17" />
                        <line x1="15" y1="12" x2="15" y2="17" />
                      </svg>
                    </button>
                  </div>
                ))
              )}

              {/* Other Contacts Section */}
              {otherUsers.length > 0 && (
                <>
                  <div style={styles.sectionHeader}>Other Contacts</div>
                  {otherUsers.map(u => (
                    <div
                      key={u.id}
                      onClick={() => navigate(`/chat/${u.id}`)}
                      className="sidebar-item"
                      style={{
                        ...styles.userItem,
                        background: String(userId) === String(u.id) ? 'var(--bg-search-wrap)' : 'var(--bg-primary)',
                        borderLeft: String(userId) === String(u.id) ? '3px solid #005153' : '3px solid transparent',
                      }}
                    >
                      <div style={styles.avatarWrap}>
                        <img src={u.avatar} alt={u.name} style={styles.userAvatar} />
                        <span style={{
                          ...styles.statusDot,
                          background: isOnline(u.id) ? '#06D755' : 'var(--text-secondary)',
                        }} />
                      </div>
                      <div style={styles.contactInfo}>
                        <div style={styles.contactRow}>
                          <div style={styles.userName}>{u.name}</div>
                          <div style={styles.contactTime}>{isOnline(u.id) ? 'online' : 'offline'}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                            {u.email}
                          </div>
                          {unreadChats[`user_${u.id}`] && (
                            <span style={{
                              width: 8,
                              height: 8,
                              background: '#22c55e',
                              borderRadius: '50%',
                              marginLeft: 8,
                              flexShrink: 0,
                              boxShadow: '0 0 6px #22c55e'
                            }} />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(u.id, u.name);
                        }}
                        className="delete-btn"
                        title="Clear Conversation"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                          <rect x="4" y="7" width="16" height="2" rx="0.5" />
                          <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                          <line x1="9" y1="12" x2="9" y2="17" />
                          <line x1="12" y1="12" x2="12" y2="17" />
                          <line x1="15" y1="12" x2="15" y2="17" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div style={styles.userList}>
          <div style={styles.listTitle}>Your Groups</div>
          {sortedGroups.length === 0 && <div style={styles.empty}>No groups yet</div>}

          {sortedGroups.length > 0 && (
            <>
              {/* Recent Groups Section */}
              <div style={styles.sectionHeader}>Recent Groups</div>
              {recentGroups.length === 0 ? (
                <div style={{ ...styles.empty, fontSize: 12, padding: '14px 16px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  No recent group activity yet! 💬
                </div>
              ) : (
                recentGroups.map(g => (
                  <div
                    key={g.id}
                    onClick={() => navigate(`/chat/group/${g.id}`)}
                    className="sidebar-item"
                    style={{
                      ...styles.userItem,
                      background: groupId === String(g.id) ? 'var(--bg-search-wrap)' : 'var(--bg-primary)',
                      borderLeft: groupId === String(g.id) ? '3px solid #005153' : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#005153', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {g.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.contactInfo}>
                      <div style={styles.contactRow}>
                        <div style={styles.userName}>{g.name}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                          {g.members?.length || 0} members
                        </div>
                        {unreadChats[`group_${g.id}`] && (
                          <span style={{
                            width: 8,
                            height: 8,
                            background: '#22c55e',
                            borderRadius: '50%',
                            marginLeft: 8,
                            flexShrink: 0,
                            boxShadow: '0 0 6px #22c55e'
                          }} />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLeaveGroup(g.id, g.name, g.created_by);
                      }}
                      className="delete-btn"
                      title={g.created_by === user?.id ? "Delete Group entirely" : "Leave Group"}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {g.created_by === user?.id ? (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                          <rect x="4" y="7" width="16" height="2" rx="0.5" />
                          <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                          <line x1="9" y1="12" x2="9" y2="17" />
                          <line x1="12" y1="12" x2="12" y2="17" />
                          <line x1="15" y1="12" x2="15" y2="17" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))
              )}

              {/* Other Groups Section */}
              {otherGroups.length > 0 && (
                <>
                  <div style={styles.sectionHeader}>Other Groups</div>
                  {otherGroups.map(g => (
                    <div
                      key={g.id}
                      onClick={() => navigate(`/chat/group/${g.id}`)}
                      className="sidebar-item"
                      style={{
                        ...styles.userItem,
                        background: groupId === String(g.id) ? 'var(--bg-search-wrap)' : 'var(--bg-primary)',
                        borderLeft: groupId === String(g.id) ? '3px solid #005153' : '3px solid transparent',
                      }}
                    >
                      <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#005153', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {g.name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.contactInfo}>
                        <div style={styles.contactRow}>
                          <div style={styles.userName}>{g.name}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                            {g.members?.length || 0} members
                          </div>
                          {unreadChats[`group_${g.id}`] && (
                            <span style={{
                              width: 8,
                              height: 8,
                              background: '#22c55e',
                              borderRadius: '50%',
                              marginLeft: 8,
                              flexShrink: 0,
                              boxShadow: '0 0 6px #22c55e'
                            }} />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLeaveGroup(g.id, g.name, g.created_by);
                        }}
                        className="delete-btn"
                        title={g.created_by === user?.id ? "Delete Group entirely" : "Leave Group"}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {g.created_by === user?.id ? (
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                            <rect x="4" y="7" width="16" height="2" rx="0.5" />
                            <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                            <line x1="9" y1="12" x2="9" y2="17" />
                            <line x1="12" y1="12" x2="12" y2="17" />
                            <line x1="15" y1="12" x2="15" y2="17" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
          <button
            onClick={() => setShowModal(true)}
            style={{ ...styles.newChatBtn, margin: '16px 12px' }}
          >
            + New Group
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onCreated={(g) => {
            setGroups(prev => [...prev, g]);
            navigate(`/chat/group/${g.id}`);
            socket?.emit('add_group_member', { groupId: g.id, member: null });
          }}
        />
      )}

      {/* Sidebar Footer */}
      <div style={styles.footer}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            background: 'var(--bg-search-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'background 0.2s, color 0.2s, border-color 0.2s',
          }}
        >
          <option value="light"> Light Theme</option>
          <option value="dark"> Dark Theme</option>
        </select>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: { width: 300, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { background: 'var(--bg-sidebar)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', height: 60, borderBottom: '1px solid var(--border-color)' },
  profile: { display: 'flex', alignItems: 'center', gap: 10 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: '#06D755', borderRadius: '50%', border: '2px solid var(--bg-primary)' },
  myName: { fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' },
  myEmail: { fontSize: 11, color: 'var(--text-secondary)' },
  logoutBtn: { fontSize: 12, padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', background: 'var(--bg-search-wrap)', color: 'var(--text-secondary)', fontWeight: 500, transition: 'all 0.2s' },
  footer: { padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-sidebar)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  searchWrap: { padding: '10px 12px', background: 'var(--bg-search-wrap)' },
  search: { width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 13, outline: 'none', background: 'var(--bg-search-input)', color: 'var(--text-primary)' },
  userList: { flex: 1, overflowY: 'auto', padding: 0 },
  listTitle: { padding: '8px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 },
  empty: { padding: '20px 16px', color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' },
  userItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', transition: 'background 0.15s' },
  userAvatar: { width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' },
  statusDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--bg-primary)' },
  userName: { fontWeight: 500, fontSize: 15, color: 'var(--text-primary)' },
  userStatus: { fontSize: 12, color: 'var(--text-secondary)' },
  contactInfo: { flex: 1, minWidth: 0, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, paddingTop: 2 },
  contactRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  contactTime: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 },
  newChatBtn: { margin: '12px', background: '#005153', color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sectionHeader: {
    padding: '8px 16px 4px',
    fontSize: 10,
    fontWeight: 700,
    color: '#005153',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(0, 81, 83, 0.04)',
    margin: '4px 0'
  }
};