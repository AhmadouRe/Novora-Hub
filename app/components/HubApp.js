'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminPanel from './AdminPanel.js';

function fmt(n) { return Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}); }

const VERDICT_COLORS = { DEAL: 'var(--green)', DEAD: 'var(--red)', 'FOLLOW-UP': 'var(--gold)', INCOMPLETE: 'var(--cyan)' };

export default function HubApp({ session }) {
  const router = useRouter();
  const [clock, setClock] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [tools, setTools] = useState([]);
  const [allTools, setAllTools] = useState([]);
  const [myUrls, setMyUrls] = useState({});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showUrlModal, setShowUrlModal] = useState(null); // tool object
  const [urlPersonal, setUrlPersonal] = useState('');
  const [urlGlobal, setUrlGlobal] = useState('');
  const [activity, setActivity] = useState([]);
  const [showActivity, setShowActivity] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const load = async () => {
    const [m, t, u, a] = await Promise.all([
      fetch('/api/hub/metrics').then(r => r.json()).catch(() => ({})),
      fetch('/api/hub/tools').then(r => r.json()).catch(() => []),
      fetch(`/api/hub/urls/${session.userId}`).then(r => r.json()).catch(() => ({})),
      fetch('/api/hub/activity').then(r => r.json()).catch(() => []),
    ]);
    setMetrics(m); setTools(Array.isArray(t) ? t : []); setAllTools(Array.isArray(t) ? t : []); setMyUrls(u || {}); setActivity(Array.isArray(a) ? a : []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const check = async () => {
      const res = await fetch('/api/auth/session').catch(() => null);
      if (!res?.ok) { router.push('/'); return; }
      const d = await res.json();
      if (d.expiresAt) {
        const rem = (new Date(d.expiresAt).getTime() - Date.now()) / 1000 / 60;
        setSessionWarning(rem <= 15);
      }
    };
    check(); const id = setInterval(check, 60000); return () => clearInterval(id);
  }, []);

  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.refresh(); };

  const openTool = async (tool) => {
    const personalUrl = myUrls[tool.id];
    const url = tool.perUser ? (personalUrl || tool.globalUrl) : tool.globalUrl;
    if (!url) { setShowUrlModal(tool); setUrlPersonal(personalUrl || ''); setUrlGlobal(tool.globalUrl || ''); return; }
    window.open(url, '_blank', 'noopener');
    await fetch('/api/hub/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolName: tool.name, toolId: tool.id }) }).catch(() => {});
  };

  const saveUrl = async () => {
    if (!showUrlModal) return;
    if (urlPersonal && showUrlModal.perUser) {
      await fetch(`/api/hub/urls/${session.userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [showUrlModal.id]: urlPersonal }) });
      setMyUrls(prev => ({ ...prev, [showUrlModal.id]: urlPersonal }));
    }
    if (urlGlobal !== showUrlModal.globalUrl) {
      await fetch(`/api/hub/tools/${showUrlModal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ globalUrl: urlGlobal }) });
      setTools(prev => prev.map(t => t.id === showUrlModal.id ? { ...t, globalUrl: urlGlobal } : t));
    }
    setShowUrlModal(null);
  };

  const categories = ['All', ...new Set(tools.map(t => t.category))];
  const filtered = tools.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.desc?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
    const matchCat = catFilter === 'All' || t.category === catFilter;
    return matchSearch && matchCat;
  });
  const grouped = {};
  filtered.forEach(t => { grouped[t.category] = grouped[t.category] || []; grouped[t.category].push(t); });

  const daysColor = metrics?.daysLeft >= 30 ? 'var(--green)' : metrics?.daysLeft >= 14 ? 'var(--gold)' : 'var(--red)';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--cyan-faint)', border: '2px solid var(--cyan-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--cyan)', fontSize: 14 }}>OS</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Novora Capital</div>
            <div style={{ color: 'var(--text2)', fontSize: 11 }}>Operating System</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="num" style={{ fontSize: 13, color: 'var(--text2)' }}>{clock}</span>
          {session.access?.manageTeam && (
            <button onClick={() => setShowAdmin(true)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--cyan-border)', background: 'var(--cyan-faint)', color: 'var(--cyan)', fontSize: 13, fontWeight: 600 }}>Admin</button>
          )}
          <button onClick={() => setShowActivity(!showActivity)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13 }}>Activity</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--cyan-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>{session.userName?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize: 13 }}>{session.userName}</span>
          </div>
          <button onClick={signOut} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13 }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
        {/* Command Center */}
        {metrics && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>Good {greeting}, {session.userName} — Command Center</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
              {[
                { label: 'Days to Goal', value: metrics.daysLeft, color: daysColor, sub: metrics.endDate },
                { label: 'Revenue', value: fmt(metrics.totalRevenue), color: 'var(--gold)', sub: `${metrics.goalPct}% of ${fmt(metrics.goalAmt)} · ${metrics.dealsCount} deals` },
                { label: 'Deals Needed', value: Math.max(0, Math.ceil((metrics.goalAmt - metrics.totalRevenue) / 9000)), color: 'var(--cyan)', sub: 'more at $9K avg' },
                { label: 'Today', value: `${metrics.todayWcl + metrics.todaySms}`, color: 'var(--green)', sub: `${metrics.todayWcl} WCL · ${metrics.todaySms} SMS logged` },
              ].map(({ label, value, color, sub }) => (
                <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
                  <div className="num" style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
                  {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
                </div>
              ))}
            </div>

            {metrics.activeCampaigns?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Active campaigns:</span>
                {metrics.activeCampaigns.map(c => (
                  <span key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color || 'var(--purple)', display: 'inline-block' }} />
                    {c.name}
                  </span>
                ))}
              </div>
            )}

            {metrics.lastScore && (
              <div style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Last scorecard:</span>
                <span style={{ fontWeight: 700, color: VERDICT_COLORS[metrics.lastScore.verdict] || 'var(--gold)', fontSize: 13 }}>{metrics.lastScore.verdict}</span>
                {metrics.lastScore.address && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{metrics.lastScore.address}</span>}
              </div>
            )}
          </div>
        )}

        {/* Search + Category filters */}
        <div style={{ marginBottom: 20 }}>
          <input ref={searchRef} style={{ width: '100%', padding: '11px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 15, marginBottom: 12 }} placeholder="Search tools… (press / to focus)" value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${catFilter === cat ? 'var(--cyan-border)' : 'var(--border)'}`, background: catFilter === cat ? 'var(--cyan-faint)' : 'var(--surface2)', color: catFilter === cat ? 'var(--cyan)' : 'var(--text2)', fontSize: 13, fontWeight: catFilter === cat ? 600 : 400 }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Tool Grid */}
        {Object.entries(grouped).map(([category, catTools]) => (
          <div key={category} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{category}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {catTools.map(tool => {
                const personalUrl = myUrls[tool.id];
                const hasPersonal = tool.perUser && !!personalUrl;
                const hasAnyUrl = hasPersonal || !!tool.globalUrl;
                return (
                  <div key={tool.id} style={{ background: 'var(--surface)', border: `1px solid ${tool.color}33`, borderRadius: 14, padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = tool.color + '88'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = tool.color + '33'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: tool.color + '18', border: `1px solid ${tool.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: tool.color, flexShrink: 0 }}>{tool.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{tool.name}</span>
                          {hasPersonal && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--green-faint)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>YOUR LINK</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{tool.desc}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openTool(tool)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: hasAnyUrl ? tool.color : 'var(--surface3)', color: hasAnyUrl ? '#000' : 'var(--text3)', fontWeight: 600, fontSize: 13, cursor: hasAnyUrl ? 'pointer' : 'default', opacity: hasAnyUrl ? 1 : 0.6 }}>
                        {hasAnyUrl ? '↗ Open' : 'No URL set'}
                      </button>
                      <button onClick={() => { setShowUrlModal(tool); setUrlPersonal(personalUrl || ''); setUrlGlobal(tool.globalUrl || ''); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13 }}>
                        Set URL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '48px 0' }}>No tools match your search.</div>
        )}
      </div>

      {/* URL Modal */}
      {showUrlModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: 460, maxWidth: '100%', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: showUrlModal.color + '18', border: `1px solid ${showUrlModal.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: showUrlModal.color }}>{showUrlModal.icon}</div>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{showUrlModal.name}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {showUrlModal.perUser && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Your Personal URL <span style={{ color: 'var(--text3)' }}>(private — only you see this)</span></label>
                  <input style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} value={urlPersonal} onChange={e => setUrlPersonal(e.target.value)} placeholder="https://…" />
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Global / Default URL <span style={{ color: 'var(--text3)' }}>(fallback for everyone)</span></label>
                <input style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} value={urlGlobal} onChange={e => setUrlGlobal(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={saveUrl} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: 14 }}>Save</button>
              <button onClick={() => setShowUrlModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Activity sidebar */}
      {showActivity && (
        <div style={{ position: 'fixed', right: 0, top: 60, bottom: 0, width: 320, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', zIndex: 200, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Activity Log</span>
            <button onClick={() => setShowActivity(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
          {activity.slice(0, 50).map(e => (
            <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--cyan)' }}>{e.userName}</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>Opened {e.toolName}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{e.timestamp?.slice(0,16).replace('T',' ')}</div>
            </div>
          ))}
          {activity.length === 0 && <div style={{ color: 'var(--text2)', fontSize: 14 }}>No activity yet.</div>}
        </div>
      )}

      {/* Session warning */}
      {sessionWarning && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--gold-border)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 300 }}>
          <span style={{ color: 'var(--gold)', fontSize: 14 }}>⚠ Session expiring soon</span>
          <button onClick={() => fetch('/api/auth/session').then(() => setSessionWarning(false))} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#000', fontWeight: 600, fontSize: 13 }}>Extend</button>
        </div>
      )}

      {showAdmin && <AdminPanel session={session} onClose={() => setShowAdmin(false)} onRefresh={load} />}
    </div>
  );
}
