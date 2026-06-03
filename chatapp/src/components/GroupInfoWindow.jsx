import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

export default function GroupInfoWindow({ groupId, socket, onClose, onGroupUpdated }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    // Edit fields state
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Admin Transfer on Leave states
    const [isTransferringAdmin, setIsTransferringAdmin] = useState(false);
    const [transferAdminUserId, setTransferAdminUserId] = useState('');

    const fetchGroupData = async () => {
        try {
            // Re-fetch groups to find current one with member details
            const res = await axios.get(`${API}/api/groups`, { withCredentials: true });
            const currentGroup = res.data.find(g => g.id === parseInt(groupId));
            if (currentGroup) {
                setGroup(currentGroup);
                setName(currentGroup.name);
                setDescription(currentGroup.description || '');
                setMembers(currentGroup.members || []);

                // Determine if current user is admin
                const myMembership = currentGroup.members?.find(m => m.user_id === user?.id);
                setIsAdmin(myMembership?.role === 'admin');
            } else {
                // If group not found, close window
                onClose();
            }
        } catch (err) {
            console.error('Failed to load group details:', err);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get(`${API}/api/users`, { withCredentials: true });
            setAllUsers(res.data);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    useEffect(() => {
        if (!groupId) return;
        fetchGroupData();
        fetchAllUsers();
    }, [groupId]);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleInfoUpdated = ({ groupId: gid, name: newName, description: newDesc }) => {
            if (parseInt(gid) === parseInt(groupId)) {
                setGroup(prev => prev ? { ...prev, name: newName, description: newDesc } : null);
                setName(newName);
                setDescription(newDesc);
                if (onGroupUpdated) onGroupUpdated();
            }
        };

        const handleMemberAdded = ({ groupId: gid }) => {
            if (parseInt(gid) === parseInt(groupId)) {
                fetchGroupData();
                if (onGroupUpdated) onGroupUpdated();
            }
        };

        const handleMemberRemoved = ({ groupId: gid, userId: uid }) => {
            if (parseInt(gid) === parseInt(groupId)) {
                if (parseInt(uid) === user?.id) {
                    // I was removed from this group
                    alert('You have been removed from this group.');
                    navigate('/chat');
                } else {
                    fetchGroupData();
                    if (onGroupUpdated) onGroupUpdated();
                }
            }
        };

        const handleGroupDeleted = ({ groupId: gid }) => {
            if (parseInt(gid) === parseInt(groupId)) {
                alert('This group has been deleted by the admin.');
                navigate('/chat');
            }
        };

        socket.on('group_info_updated', handleInfoUpdated);
        socket.on('group_member_added', handleMemberAdded);
        socket.on('group_member_removed', handleMemberRemoved);
        socket.on('group_deleted', handleGroupDeleted);

        return () => {
            socket.off('group_info_updated', handleInfoUpdated);
            socket.off('group_member_added', handleMemberAdded);
            socket.off('group_member_removed', handleMemberRemoved);
            socket.off('group_deleted', handleGroupDeleted);
        };
    }, [socket, groupId, user]);

    // Update group details
    const handleUpdate = async () => {
        if (!name.trim()) return setError('Group name is required');
        setError('');
        setLoading(true);
        try {
            const res = await axios.put(`${API}/api/groups/${groupId}`, {
                name: name.trim(),
                description: description.trim()
            }, { withCredentials: true });

            setIsEditing(false);
            setGroup(prev => ({ ...prev, name: res.data.name, description: res.data.description }));

            // Notify other members via socket
            socket?.emit('update_group_info', {
                groupId,
                name: res.data.name,
                description: res.data.description
            });

            if (onGroupUpdated) onGroupUpdated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update group');
        } finally {
            setLoading(false);
        }
    };

    // Add a new member
    const handleAddMember = async () => {
        if (!selectedUserId) return;
        setError('');
        try {
            await axios.post(`${API}/api/groups/${groupId}/members`, {
                user_id: selectedUserId
            }, { withCredentials: true });

            const addedUser = allUsers.find(u => u.id === parseInt(selectedUserId));
            setSelectedUserId('');

            // Notify other members
            socket?.emit('add_group_member', {
                groupId,
                member: addedUser
            });

            fetchGroupData();
            if (onGroupUpdated) onGroupUpdated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add member');
        }
    };

    // Remove a member
    const handleRemoveMember = async (targetUserId, memberName) => {
        if (!window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;
        setError('');
        try {
            await axios.delete(`${API}/api/groups/${groupId}/members/${targetUserId}`, { withCredentials: true });

            // Notify other members
            socket?.emit('remove_group_member', {
                groupId,
                userId: targetUserId
            });

            fetchGroupData();
            if (onGroupUpdated) onGroupUpdated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove member');
        }
    };

    // Leave group
    const handleLeaveGroup = async () => {
        const otherMembersCount = members.filter(m => m.user_id !== user?.id).length;
        if (isAdmin && otherMembersCount > 0) {
            setIsTransferringAdmin(true);
            return;
        }

        if (!window.confirm('Are you sure you want to leave this group?')) return;
        try {
            await axios.delete(`${API}/api/groups/${groupId}/leave`, { withCredentials: true });
            socket?.emit('remove_group_member', { groupId, userId: user?.id });
            navigate('/chat');
        } catch (err) {
            setError('Failed to leave group');
        }
    };

    const handleConfirmAdminLeave = async () => {
        if (!transferAdminUserId) return;
        if (!window.confirm('Are you sure you want to transfer admin rights and leave this group?')) return;
        try {
            await axios.delete(`${API}/api/groups/${groupId}/leave`, {
                data: { new_admin_id: transferAdminUserId },
                withCredentials: true
            });

            socket?.emit('remove_group_member', { groupId, userId: user?.id });
            socket?.emit('group_info_updated', { groupId });
            socket?.emit('add_group_member', { groupId, member: null });

            setIsTransferringAdmin(false);
            navigate('/chat');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to transfer admin and leave');
        }
    };

    // Users available to be added (all users except existing members)
    const availableUsers = allUsers.filter(u =>
        !members.some(m => m.user_id === u.id)
    );

    if (!group) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading group details...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header Toolbar */}
            <div style={styles.header}>
                <button onClick={onClose} style={styles.backBtn} title="Back to Chat">⬅ Back</button>
                <h2 style={styles.title}>Group Settings</h2>
            </div>

            <div style={styles.scrollArea}>
                {/* Visual Avatar */}
                <div style={styles.avatarSection}>
                    <div style={styles.avatar}>
                        {group.name?.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* Group Details / Edit view */}
                <div style={styles.card}>
                    {isEditing ? (
                        <div style={styles.editForm}>
                            <label style={styles.label}>Group Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={styles.input}
                            />

                            <label style={styles.label}>Group Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                style={styles.textarea}
                                placeholder="Add a description for this group..."
                            />

                            {error && <p style={styles.errorText}>{error}</p>}

                            <div style={styles.editActions}>
                                <button onClick={handleUpdate} disabled={loading} style={styles.saveBtn}>
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => { setIsEditing(false); setError(''); fetchGroupData(); }} style={styles.cancelBtn}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={styles.viewDetails}>
                            <div style={styles.nameRow}>
                                <h3 style={styles.groupName}>{group.name}</h3>
                                {isAdmin && (
                                    <button onClick={() => setIsEditing(true)} style={styles.editBtn} title="Edit details">
                                        Edit
                                    </button>
                                )}
                            </div>
                            <p style={styles.memberCount}>{members.length} members</p>
                            <div style={styles.descBox}>
                                <h4 style={styles.sectionHeading}>Description</h4>
                                <p style={styles.descText}>
                                    {group.description || <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No description provided yet.</span>}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Member (Admin Only) */}
                {isAdmin && availableUsers.length > 0 && (
                    <div style={styles.card}>
                        <h4 style={styles.sectionHeading}>Add New Member</h4>
                        <div style={styles.addMemberRow}>
                            <select
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                                style={styles.select}
                            >
                                <option value="">Select a user to add...</option>
                                {availableUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddMember}
                                disabled={!selectedUserId}
                                style={{ ...styles.addBtn, opacity: selectedUserId ? 1 : 0.5 }}
                            >
                                Add User
                            </button>
                        </div>
                    </div>
                )}

                {/* Members list */}
                <div style={styles.card}>
                    <h4 style={styles.sectionHeading}>Group Members ({members.length})</h4>
                    <div style={styles.membersList}>
                        {members.map(m => {
                            const memberUser = m.user;
                            if (!memberUser) return null;
                            const isMe = memberUser.id === user?.id;

                            return (
                                <div key={m.id} style={styles.memberItem}>
                                    <img src={memberUser.avatar} alt="" style={styles.memberAvatar} />
                                    <div style={styles.memberMeta}>
                                        <div style={styles.memberNameWrap}>
                                            <span style={styles.memberName}>{memberUser.name}</span>
                                            {isMe && <span style={styles.meTag}>you</span>}
                                        </div>
                                        <span style={styles.memberRoleBadge(m.role)}>
                                            {m.role === 'admin' ? 'Admin' : 'Member'}
                                        </span>
                                    </div>

                                    {/* Remove option: admins can remove non-admin members */}
                                    {isAdmin && !isMe && m.role !== 'admin' && (
                                        <button
                                            onClick={() => handleRemoveMember(memberUser.id, memberUser.name)}
                                            style={styles.removeBtn}
                                            title="Remove member"
                                        >
                                            Remove ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Red zone / Leave */}
                <div style={styles.dangerZone}>
                    <button onClick={handleLeaveGroup} style={styles.leaveBtn}>
                        Leave Group
                    </button>
                </div>
            </div>

            {/* Admin Transfer Modal */}
            {isTransferringAdmin && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Designate New Admin</h3>
                        <p style={styles.modalText}>
                            Since you are the admin of this group, you must select another member to be promoted to Admin before you can leave.
                        </p>
                        <select
                            value={transferAdminUserId}
                            onChange={e => setTransferAdminUserId(e.target.value)}
                            style={styles.modalSelect}
                        >
                            <option value="">Select a member...</option>
                            {members.filter(m => m.user_id !== user?.id).map(m => (
                                <option key={m.id} value={m.user_id}>
                                    {m.user?.name} ({m.user?.email})
                                </option>
                            ))}
                        </select>
                        <div style={styles.modalActions}>
                            <button
                                onClick={handleConfirmAdminLeave}
                                disabled={!transferAdminUserId}
                                style={{ ...styles.modalLeaveBtn, opacity: transferAdminUserId ? 1 : 0.6 }}
                            >
                                Transfer & Leave
                            </button>
                            <button
                                onClick={() => { setIsTransferringAdmin(false); setTransferAdminUserId(''); }}
                                style={styles.modalCancelBtn}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    loadingContainer: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: 12 },
    spinner: { width: 32, height: 32, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--tick-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    container: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-secondary)' },
    header: { height: 60, padding: '0 16px', background: 'var(--topbar-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
    backBtn: { background: 'var(--bg-search-input)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    title: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' },
    scrollArea: { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
    avatarSection: { display: 'flex', justifyContent: 'center', padding: '10px 0' },
    avatar: { width: 100, height: 100, borderRadius: '50%', background: 'var(--tick-color)', color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 700, boxShadow: '0 4px 10px rgba(0,81,83,0.15)' },
    card: { background: 'var(--modal-card-bg)', padding: 20, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14 },
    viewDetails: { display: 'flex', flexDirection: 'column', gap: 4 },
    nameRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    groupName: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' },
    editBtn: { background: 'transparent', border: 'none', color: 'var(--tick-color)', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '4px 8px', borderRadius: 4, transition: 'background 0.2s' },
    memberCount: { fontSize: 12, color: 'var(--text-secondary)', marginTop: -2 },
    descBox: { borderTop: '1px solid var(--border-subtle)', marginTop: 14, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 },
    sectionHeading: { fontSize: 13, fontWeight: 600, color: 'var(--tick-color)', textTransform: 'uppercase', letterSpacing: '0.5px' },
    descText: { fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 },
    editForm: { display: 'flex', flexDirection: 'column', gap: 10 },
    label: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 },
    input: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', fontSize: 14, outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit' },
    textarea: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', fontSize: 14, outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical', minHeight: 80 },
    editActions: { display: 'flex', gap: 8, marginTop: 4 },
    saveBtn: { background: 'var(--tick-color)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
    cancelBtn: { background: 'var(--bg-search-input)', color: 'var(--text-secondary)', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
    errorText: { color: '#d32f2f', fontSize: 12 },
    addMemberRow: { display: 'flex', gap: 10 },
    select: { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', color: 'var(--text-primary)', background: 'var(--input-bg)' },
    addBtn: { background: 'var(--tick-color)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
    membersList: { display: 'flex', flexDirection: 'column', gap: 12 },
    memberItem: { display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' },
    memberAvatar: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' },
    memberMeta: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
    memberNameWrap: { display: 'flex', alignItems: 'center', gap: 6 },
    memberName: { fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' },
    meTag: { background: 'var(--bg-search-input)', color: 'var(--text-secondary)', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 500 },
    memberRoleBadge: (role) => ({
        fontSize: 10,
        fontWeight: 600,
        color: role === 'admin' ? 'var(--tick-color)' : 'var(--text-secondary)',
        width: 'fit-content'
    }),
    removeBtn: { background: 'rgba(211,47,47,0.1)', color: '#ff4d4d', border: '1px solid rgba(211,47,47,0.2)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' },
    dangerZone: { marginTop: 10 },
    leaveBtn: { width: '100%', padding: '12px', background: 'rgba(211,47,47,0.1)', color: '#ff4d4d', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(211,47,47,0.05)' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--modal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: 'var(--modal-card-bg)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)', width: '90%', maxWidth: 400, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 14 },
    modalTitle: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
    modalText: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 },
    modalSelect: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', color: 'var(--text-primary)', background: 'var(--input-bg)', width: '100%' },
    modalActions: { display: 'flex', gap: 8, marginTop: 6 },
    modalLeaveBtn: { flex: 1, background: '#d32f2f', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
    modalCancelBtn: { background: 'var(--bg-search-input)', color: 'var(--text-secondary)', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
};
