import { createHash, randomBytes } from 'crypto';
import { kv } from '@vercel/kv';
import { getList, saveList } from './kv.js';

export function generateSalt() { return randomBytes(16).toString('hex'); }
export function hashPin(pin, salt) { return createHash('sha256').update(String(pin) + salt).digest('hex'); }
export function verifyPin(pin, salt, hash) { return hashPin(pin, salt) === hash; }
export function generateId() { return randomBytes(16).toString('hex'); }

export async function createSession(userId, userName, access, app) {
  const sessionId = generateId();
  const now = Date.now();
  const session = {
    userId, userName, access, app,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
    lastActivity: new Date(now).toISOString(),
  };
  await kv.set(`session:${sessionId}`, session, { ex: 14400 });
  return sessionId;
}

export async function validateSession(sessionId) {
  if (!sessionId) return null;
  try {
    const session = await kv.get(`session:${sessionId}`);
    if (!session) return null;
    if (Date.now() > new Date(session.expiresAt).getTime()) { await kv.del(`session:${sessionId}`); return null; }
    return session;
  } catch { return null; }
}

export async function refreshSession(sessionId) {
  try {
    const session = await kv.get(`session:${sessionId}`);
    if (!session) return null;
    const updated = { ...session, expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), lastActivity: new Date().toISOString() };
    await kv.set(`session:${sessionId}`, updated, { ex: 14400 });
    return updated;
  } catch { return null; }
}

export async function deleteSession(sessionId) {
  try { await kv.del(`session:${sessionId}`); } catch {}
}

export async function seedUsers() {
  try {
    const users = await getList('users:list');
    if (users && users.length > 0) return;
    const as = generateSalt(), ts = generateSalt();
    await saveList('users:list', [
      { id: 'ahmadou', name: 'Ahmadou', pinHash: hashPin('1111', as), salt: as, color: '#E8A020', addedAt: new Date().toISOString(), active: true, failedAttempts: 0, lockedUntil: null, access: { revenue: true, expenses: true, manageTeam: true } },
      { id: 'timar', name: 'Timar', pinHash: hashPin('1111', ts), salt: ts, color: '#06B6D4', addedAt: new Date().toISOString(), active: true, failedAttempts: 0, lockedUntil: null, access: { revenue: false, expenses: false, manageTeam: false } },
    ]);
  } catch {}
}
