'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginFlow() {
  const [users, setUsers] = useState([]);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockdown, setLockdown] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const pinRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d.filter(u => u.active)); }).catch(() => {});
  }, []);

  useEffect(() => { if (step === 2 && pinRef.current) pinRef.current.focus(); }, [step]);

  useEffect(() => {
    if (!lockdown) return;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((new Date(lockdown).getTime() - Date.now()) / 1000));
      setCountdown(rem);
      if (rem === 0) { setLockdown(null); setCountdown(0); }
    }, 1000);
    return () => clearInterval(id);
  }, [lockdown]);

  const select = (u) => { setSelected(u); setPin(''); setError(''); setLockdown(null); setStep(2); };

  const handleKey = (e) => {
    if (e.key === 'Enter') { login(); return; }
    if (e.key === 'Backspace') { setPin(p => p.slice(0, -1)); return; }
    if (/^\d$/.test(e.key) && pin.length < 4) setPin(p => p + e.key);
  };

  const login = async () => {
    if (pin.length !== 4) return;
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selected.name, pin }) });
    const data = await res.json();
    if (res.ok) { router.refresh(); }
    else if (data.lockedUntil) { setLockdown(data.lockedUntil); setCountdown(Math.ceil((new Date(data.lockedUntil).getTime() - Date.now()) / 1000)); setError('Account locked'); setPin(''); }
    else { setError(data.attemptsRemaining !== undefined ? `Wrong PIN — ${data.attemptsRemaining} attempt${data.attemptsRemaining !== 1 ? 's' : ''} remaining` : data.error || 'Invalid PIN'); setPin(''); if (pinRef.current) pinRef.current.focus(); }
    setLoading(false);
  };

  const bg = { minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, width: 420, maxWidth: '92vw' };

  if (step === 1) return (
    <div style={bg}>
      <div style={card}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--cyan-faint)', border: '2px solid var(--cyan-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--cyan)', margin: '0 auto 20px' }}>OS</div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Novora Hub</div>
        <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>Operating System — select your profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {users.map(u => (
            <div key={u.id} onClick={() => select(u)} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface2)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.background = u.color + '11'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)'; }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: u.color + '22', border: `2px solid ${u.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: u.color }}>{u.name[0]}</div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={bg}>
      <div style={card}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: selected.color + '22', border: `2px solid ${selected.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: selected.color, margin: '0 auto 16px' }}>{selected.name[0]}</div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{selected.name}</div>
        <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>Enter your 4-digit PIN</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: pin.length > i ? 'var(--cyan)' : 'var(--border2)', transition: 'all 0.15s' }} />)}
        </div>
        <input ref={pinRef} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} type="password" onKeyDown={handleKey} onChange={() => {}} value={pin} readOnly />
        {error && <div style={{ color: 'var(--red)', textAlign: 'center', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {lockdown && countdown > 0 && <div style={{ color: 'var(--red)', textAlign: 'center', fontSize: 13, marginBottom: 12 }}>Try again in {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}</div>}
        <button style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: pin.length === 4 && !loading && !lockdown ? 'var(--cyan)' : 'var(--border2)', color: '#fff', fontWeight: 600, fontSize: 15, marginBottom: 8 }} onClick={login} disabled={pin.length !== 4 || loading || !!lockdown}>
          {loading ? 'Signing in…' : 'Log In'}
        </button>
        <button style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 14 }} onClick={() => { setStep(1); setPin(''); setError(''); }}>← Back</button>
      </div>
    </div>
  );
}
