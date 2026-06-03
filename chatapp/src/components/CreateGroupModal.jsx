import { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function CreateGroupModal({ onClose, onCreated }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get(`${API}/api/users`, { withCredentials: true })
            .then(res => setUsers(res.data));
    }, []);

    const toggle = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!name.trim()) return alert('Group name is required');
        if (selected.length < 1) return alert('Select at least 1 member');
        setLoading(true);
        try {
            const res = await axios.post(
                `${API}/api/groups`,
                {
                    name: name.trim(),
                    description: desc.trim(),
                    member_ids: selected,   // already an array of integers
                },
                { withCredentials: true }
            );
            onCreated(res.data);
            onClose();
        } catch (err) {
            // Show actual error message from server
            console.error(err.response?.data);
            alert(err.response?.data?.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h2 style={styles.title}>New Group</h2>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                <div style={styles.body}>
                    <label style={styles.label}>Group Name *</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Design Team"
                        style={styles.input}
                    />

                    <label style={styles.label}>Description</label>
                    <input
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Optional"
                        style={styles.input}
                    />

                    <label style={styles.label}>Add Members *</label>
                    <div style={styles.memberList}>
                        {users.map(u => (
                            <div
                                key={u.id}
                                onClick={() => toggle(u.id)}
                                style={{
                                    ...styles.memberItem,
                                    background: selected.includes(u.id) ? 'var(--sidebar-hover-bg)' : 'var(--bg-primary)',
                                    border: `1px solid ${selected.includes(u.id) ? 'var(--tick-color)' : 'var(--border-subtle)'}`,
                                }}
                            >
                                <img src={u.avatar} alt={u.name} style={styles.memberAvatar} />
                                <span style={styles.memberName}>{u.name}</span>
                                {selected.includes(u.id) && (
                                    <span style={styles.check}>✓</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={styles.selectedCount}>
                        {selected.length} member{selected.length !== 1 ? 's' : ''} selected
                    </div>
                </div>

                <div style={styles.footer}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={handleCreate} disabled={loading} style={styles.createBtn}>
                        {loading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', inset: 0, background: 'var(--modal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'var(--modal-card-bg)', border: '1px solid var(--modal-border)', borderRadius: 12, width: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
    header: { padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' },
    body: { padding: '16px 20px', overflowY: 'auto', flex: 1 },
    label: { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 12 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' },
    memberList: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' },
    memberItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' },
    memberAvatar: { width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' },
    memberName: { fontSize: 13, color: 'var(--text-primary)', flex: 1 },
    check: { color: 'var(--tick-color)', fontWeight: 700 },
    selectedCount: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 },
    footer: { padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10, justifyContent: 'flex-end' },
    cancelBtn: { padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-search-input)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', transition: 'all 0.2s' },
    createBtn: { padding: '8px 20px', background: 'var(--tick-color)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' },
};