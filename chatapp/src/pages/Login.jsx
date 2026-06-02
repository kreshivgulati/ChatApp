import { useState } from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [hovered, setHovered] = useState(false);

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
        pointerEvents: 'none',
      }} />

      {/* Blue glow bottom right */}
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '60%', height: '60%', background: '#1e3a8a',
        opacity: 0.2, filter: 'blur(140px)', borderRadius: '50%',
        pointerEvents: 'none',
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
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', cursor: 'default',
          }}>
            <MessageSquare size={32} color="white" strokeWidth={1.5} />
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 300, color: 'white',
            marginBottom: 8, fontFamily: 'Georgia, serif',
            letterSpacing: '-0.5px',
          }}>
            ChatApp
          </h1>


          <p style={{
            color: '#64748b', fontSize: 12,
            maxWidth: 280, margin: '0 auto',
            lineHeight: 1.6, fontFamily: 'sans-serif',
          }}>
            The simplest way to stay connected with your team and friends.
          </p>
        </div>

        {/* Google Sign In Button */}
        <div style={{ width: '100%' }}>
          <p style={{
            fontSize: 10, textTransform: 'uppercase',
            letterSpacing: 4, color: '#64748b',
            fontWeight: 600, marginBottom: 10, marginLeft: 4,
          }}>
            Identity
          </p>

          <button
            onClick={login}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              width: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 24px', borderRadius: 12, border: 'none',
              background: hovered ? '#e2e8f0' : 'white',
              color: '#0f172a', fontWeight: 500, fontSize: 14,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 0 20px rgba(255,255,255,0.1)',
            }}
          >
            {/* Google G logo */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            <span>Continue with Google</span>
            <ArrowRight
              size={16}
              style={{
                marginLeft: 4,
                transform: hovered ? 'translateX(3px)' : 'translateX(0)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>


        {/* Footer inside card */}
        <div style={{
          marginTop: 24, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          width: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          color: '#475569', fontSize: 10,
          letterSpacing: 3, textTransform: 'uppercase',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>End-to-End Encrypted</span>
        </div>
      </div>

      {/* Bottom tag */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 16, opacity: 0.4,
      }}>
        <div style={{ width: 48, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2))' }} />

        <div style={{ width: 48, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.2))' }} />
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 32, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 24, opacity: 0.3,
        fontSize: 10, letterSpacing: 4,
        textTransform: 'uppercase', color: '#64748b',
      }}>

      </div>
    </div>
  );
}