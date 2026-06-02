import { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

export default function LoadingScreen({ onComplete }) {
    const [progress, setProgress] = useState(0);
    const [complete, setComplete] = useState(false);
    const [statusText, setStatusText] = useState('Syncing messages...');

    const statuses = [
        { threshold: 0, text: 'Syncing messages...' },
        { threshold: 22, text: 'Loading contacts...' },
        { threshold: 45, text: 'Downloading media elements...' },
        { threshold: 68, text: 'Applying secure preferences...' },
        { threshold: 88, text: 'Verifying active session state...' },
        { threshold: 100, text: 'Workspace synchronized!' }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setComplete(true);
                    // Auto redirect to chat after 1.5s
                    setTimeout(() => onComplete(), 1500);
                    return 100;
                }
                const increment = Math.floor(Math.random() * 12) + 4;
                const next = Math.min(prev + increment, 100);
                const matchingStatus = [...statuses].reverse().find(s => next >= s.threshold);
                if (matchingStatus) setStatusText(matchingStatus.text);
                return next;
            });
        }, 450);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            position: 'relative', width: '100%', minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#020205', color: 'white', overflow: 'hidden',
        }}>
            {/* Purple glow top left */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%',
                width: '60%', height: '60%', background: '#4c1d95',
                opacity: 0.2, filter: 'blur(140px)', borderRadius: '50%',
            }} />
            {/* Blue glow bottom right */}
            <div style={{
                position: 'absolute', bottom: '-20%', right: '-10%',
                width: '60%', height: '60%', background: '#1e3a8a',
                opacity: 0.2, filter: 'blur(140px)', borderRadius: '50%',
            }} />

            {/* Concentric rings */}
            {[800, 600].map(size => (
                <div key={size} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: size, height: size,
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '50%', pointerEvents: 'none',
                }} />
            ))}

            {/* Card */}
            <div style={{
                position: 'relative', zIndex: 10, width: '100%', maxWidth: 420,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '40px', borderRadius: 32,
                backdropFilter: 'blur(24px)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center',
            }}>
                {/* Logo */}
                <div style={{ marginBottom: 32, position: 'relative' }}>
                    <div style={{
                        width: 64, height: 64,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 16, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <MessageSquare size={32} color="white" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 300, color: 'white', marginBottom: 8, fontFamily: 'Georgia, serif' }}>
                        Welcome back!
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' }}>
                        Setting up your workspace
                    </p>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', maxWidth: 320 }}>
                    <div style={{
                        height: 6, width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 999, overflow: 'hidden',
                        marginBottom: 16,
                    }}>
                        <div style={{
                            height: '100%', width: `${progress}%`,
                            background: 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)',
                            borderRadius: 999,
                            transition: 'width 0.3s ease-out',
                            boxShadow: '0 0 10px rgba(99,102,241,0.5)',
                        }} />
                    </div>

                    {/* Status text */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 24 }}>
                        {complete ? (
                            <CheckCircle2 size={16} color="#818cf8" />
                        ) : (
                            <div style={{
                                width: 14, height: 14,
                                border: '2px solid #6366f1',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                        )}
                        <span style={{
                            fontSize: 10, letterSpacing: 4,
                            textTransform: 'uppercase', fontWeight: 600,
                            color: complete ? '#a5b4fc' : '#64748b',
                            transition: 'color 0.3s',
                        }}>
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: 40, paddingTop: 24,
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    width: '100%',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>
                            <ShieldCheck size={14} color="#818cf8" />
                            <span>End-to-End Encrypted</span>
                        </div>
                        <div style={{ width: 4, height: 4, background: '#334155', borderRadius: '50%' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>
                            <RefreshCw size={12} color="#818cf8" />
                            <span>Syncing</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom footer */}
            <div style={{
                position: 'absolute', bottom: 32, left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', gap: 24,
                color: '#475569', fontSize: 10,
                letterSpacing: 4, textTransform: 'uppercase', opacity: 0.4,
            }}>
                <span>Terms</span>
                <span>Privacy</span>
                <span>v1.0.0</span>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}