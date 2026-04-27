'use client';
import { useState, useEffect } from 'react';

const COLORS = ['#00C9A7','#FFD166','#FF6B6B','#A78BFA','#60A5FA','#F472B6','#34D399','#FB923C'];

export default function AdminPanel({ session, onClose }) {
  const [tab, setTab] = useState('members');
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Add Member
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  // Change PIN
  const [pinUserId, setPinUserId] = useState('');
  const [newPin1, setNewPin1] = useState('');
  const [newPin2, setNewPin2] = useState('');

  // Add Tool
  const [toolName, setToolName] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolUrl, setToolUrl] = useState('');
  const [toolCategory, setToolCategory] = useState('General');
  const [toolColor, setToolColor] = useState(COLORS[0]);
  const [toolPerUser, setToolPerUser] = useState(false);
  const [toolVisibility, setToolVisibility] = useState('everyone');

  // Edit Tool
  const [editTool, setEditTool] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPerUser, setEditPerUser] = useState(false);
  const [editVisibility, setEditVisibility] = useState('everyone');

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    if (tab === 'tools' || tab === 'addtool') loadTools();
    if (tab === 'activity') loadActivity();
  }, [tab]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  async function loadUsers() {
    const r = await fetch('/api/users'); const d = await r.json();
    if (Array.isArray(d)) setUsers(d);
  }
  async function loadTools() {
    const r = await fetch('/api/hub/tools?all=1'); const d = await r.json();
    if (Array.isArray(d)) setTools(d);
  }
  async function loadActivity() {
    const r = await fetch('/api/hub/activity'); const d = await r.json();
    if (Array.isArray(d)) setActivity(d);
  }

  async function toggleAccess(userId, field, val) {
    await fetch(`/api/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access: { [field]: val } }) });
    loadUsers();
  }

  async function removeUser(userId) {
    if (!confirm('Deactivate this user?')) return;
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    loadUsers();
  }

  async function addMember() {
    if (!newName.trim() || newPin.length !== 4) return flash('Name and 4-digit PIN required');
    setLoading(true);
    const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), pin: newPin, color: newColor }) });
    if (r.ok) { flash('Member added'); setNewName(''); setNewPin(''); setNewColor(COLORS[0]); loadUsers(); }
    else { const d = await r.json(); flash(d.error || 'Failed'); }
    setLoading(false);
  }

  async function changePin() {
    if (!pinUserId) return flash('Select a user');
    if (newPin1.length !== 4 || newPin1 !== newPin2) return flash('PINs must match and be 4 digits');
    setLoading(true);
    const r = await fetch(`/api/users/${pinUserId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: newPin1 }) });
    if (r.ok) { flash('PIN updated'); setNewPin1(''); setNewPin2(''); setPinUserId(''); }
    else { const d = await r.json(); flash(d.error || 'Failed'); }
    setLoading(false);
  }

  async function addTool() {
    if (!toolName.trim()) return flash('Tool name required');
    setLoading(true);
    const r = await fetch('/api/hub/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: toolName.trim(), description: toolDesc, url: toolUrl, category: toolCategory, color: toolColor, perUser: toolPerUser, visibility: toolVisibility }) });
    if (r.ok) { flash('Tool added'); setToolName(''); setToolDesc(''); setToolUrl(''); setToolCategory('General'); setToolColor(COLORS[0]); setToolPerUser(false); setToolVisibility('everyone'); loadTools(); }
    else { const d = await r.json(); flash(d.error || 'Failed'); }
    setLoading(false);
  }

  function openEdit(t) {
    setEditTool(t);
    setEditName(t.name);
    setEditDesc(t.description || '');
    setEditCategory(t.category || 'General');
    setEditColor(t.color || COLORS[0]);
    setEditPerUser(!!t.perUser);
    setEditVisibility(t.visibility || 'everyone');
  }

  async function saveTool() {
    setLoading(true);
    const r = await fetch(`/api/hub/tools/${editTool.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName, description: editDesc, category: editCategory, color: editTool.color, perUser: editTool.perUser, visibility: editTool.visibility }) });
    if (r.ok) { flash('Tool updated'); setEditTool(null); loadTools(); }
    else { const d = await r.json(); flash(d.error || 'Failed'); }
    setLoading(false);
  }

  async function deleteTool(toolId) {
    if (!confirm('Delete this tool?')) return;
    await fetch(`/api/hub/tools/${toolId}`, { method: 'DELETE' });
    loadTools();
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const modal = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column' };
  const header = { padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
  const tabs = { display: 'flex', gap: 4, padding: '16px 24px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' };
  const body = { padding: 24, overflowY: 'auto', flex: 1 };
  const inp = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const btn = (c) => ({ padding: '9px 18px', borderRadius: 8, border: 'none', background: c || 'var(--cyan)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' });
  const TABS = [
    { id: 'members', label: 'Members' },
    { id: 'addmember', label: 'Add Member' },
    { id: 'pins', label: 'Change PINs' },
    { id: 'tools', label: 'Manage Tools' },
    { id: 'addtool', label: 'Add Tool' },
    { id: 'activity', label: 'Activity Log' },
  ];

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={header}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Admin Panel</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={tabs}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--cyan)' : '2px solid transparent', color: tab === t.id ? 'var(--cyan)' : 'var(--text2)', fontWeight: tab === t.id ? 700 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1 }}>{t.label}</button>
          ))}
        </div>
        {msg && <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: 'var(--cyan-faint)', border: '1px solid var(--cyan-border)', borderRadius: 8, color: 'var(--cyan)', fontSize: 13 }}>{msg}</div>}

        <div style={body}>

          {tab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.filter(u => u.active !== false).map(u => (
                <div key={u.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.color + '22', border: `2px solid ${u.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: u.color, fontSize: 15, flexShrink: 0 }}>{u.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name} {u.id === session.userId && <span style={{ fontSize: 11, background: 'var(--cyan-faint)', color: 'var(--cyan)', border: '1px solid var(--cyan-border)', borderRadius: 4, padding: '1px 6px', marginLeft: 6 }}>YOU</span>}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {['revenue','expenses','manageTeam'].map(f => (
                        <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: u.name === 'Ahmadou' ? 'default' : 'pointer', opacity: u.name === 'Ahmadou' ? 0.5 : 1 }}>
                          <input type="checkbox" checked={!!u.access?.[f]} disabled={u.name === 'Ahmadou'} onChange={e => toggleAccess(u.id, f, e.target.checked)} />
                          {f}
                        </label>
                      ))}
                    </div>
                  </div>
                  {u.name !== 'Ahmadou' && u.id !== session.userId && (
                    <button onClick={() => removeUser(u.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'addmember' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Name</div>
                <input style={inp} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>4-Digit PIN</div>
                <input style={inp} value={newPin} onChange={e => /^\d{0,4}$/.test(e.target.value) && setNewPin(e.target.value)} placeholder="0000" maxLength={4} type="password" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Color</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setNewColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newColor === c ? `3px solid #fff` : '3px solid transparent', cursor: 'pointer', outline: newColor === c ? `2px solid ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
              <button style={btn()} onClick={addMember} disabled={loading}>Add Member</button>
            </div>
          )}

          {tab === 'pins' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Select User</div>
                <select style={inp} value={pinUserId} onChange={e => setPinUserId(e.target.value)}>
                  <option value="">— choose —</option>
                  {users.filter(u => u.active !== false).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>New PIN</div>
                <input style={inp} value={newPin1} onChange={e => /^\d{0,4}$/.test(e.target.value) && setNewPin1(e.target.value)} placeholder="0000" maxLength={4} type="password" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Confirm PIN</div>
                <input style={inp} value={newPin2} onChange={e => /^\d{0,4}$/.test(e.target.value) && setNewPin2(e.target.value)} placeholder="0000" maxLength={4} type="password" />
              </div>
              <button style={btn()} onClick={changePin} disabled={loading}>Update PIN</button>
            </div>
          )}

          {tab === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editTool ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Edit: {editTool.name}</div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Name</div>
                    <input style={inp} value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Description</div>
                    <input style={inp} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Category</div>
                    <input style={inp} value={editCategory} onChange={e => setEditCategory(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={btn()} onClick={saveTool} disabled={loading}>Save</button>
                    <button style={{ ...btn(), background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setEditTool(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                tools.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface2)', border: `1px solid ${t.color}33`, borderLeft: `3px solid ${t.color}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: t.color }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{t.category} · {t.visibility || 'everyone'} {t.perUser && '· per-user URLs'} {t.builtin && '· built-in'}</div>
                    </div>
                    <button onClick={() => openEdit(t)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    {!t.builtin && <button onClick={() => deleteTool(t.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>Delete</button>}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'addtool' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Tool Name</div>
                <input style={inp} value={toolName} onChange={e => setToolName(e.target.value)} placeholder="e.g. Slack" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Description</div>
                <input style={inp} value={toolDesc} onChange={e => setToolDesc(e.target.value)} placeholder="Short description" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Default URL (optional)</div>
                <input style={inp} value={toolUrl} onChange={e => setToolUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Category</div>
                <input style={inp} value={toolCategory} onChange={e => setToolCategory(e.target.value)} placeholder="General" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Color</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => <div key={c} onClick={() => setToolColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: toolColor === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer', outline: toolColor === c ? `2px solid ${c}` : 'none' }} />)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Visibility</div>
                <select style={inp} value={toolVisibility} onChange={e => setToolVisibility(e.target.value)}>
                  <option value="everyone">Everyone</option>
                  <option value="justme">Just Me</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={toolPerUser} onChange={e => setToolPerUser(e.target.checked)} />
                Per-user URLs (each user sets their own URL)
              </label>
              <button style={btn()} onClick={addTool} disabled={loading}>Add Tool</button>
            </div>
          )}

          {tab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.length === 0 && <div style={{ color: 'var(--text2)', fontSize: 14 }}>No activity yet.</div>}
              {activity.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(a.timestamp).toLocaleString()}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{a.userName}</span>
                    <span style={{ color: 'var(--text2)', fontSize: 13 }}> opened </span>
                    <span style={{ fontSize: 13, color: 'var(--cyan)' }}>{a.toolName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
