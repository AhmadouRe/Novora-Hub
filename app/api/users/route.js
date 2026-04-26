import { NextResponse } from 'next/server';
import { getList, saveList } from '../../lib/kv.js';
import { validateSession, generateSalt, hashPin, generateId } from '../../lib/auth.js';
import { writeAudit } from '../../lib/audit.js';
export const dynamic = 'force-dynamic';

async function getSession(request) { return await validateSession(request.cookies.get('novora_session')?.value); }

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const users = await getList('users:list');
  return NextResponse.json(users.map(({ pinHash, salt, ...u }) => u));
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { name, pin, color, access } = await request.json();
  if (!name || !pin || !color) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const salt = generateSalt();
  const newUser = { id: generateId(), name, pinHash: hashPin(String(pin), salt), salt, color, addedAt: new Date().toISOString(), active: true, failedAttempts: 0, lockedUntil: null, access: access || { revenue: false, expenses: false, manageTeam: false } };
  const users = await getList('users:list');
  users.push(newUser);
  await saveList('users:list', users);
  await writeAudit(session.userId, session.userName, 'novora-hub', 'USER_CREATED', `Created: ${name}`);
  const { pinHash, salt: s, ...safe } = newUser;
  return NextResponse.json(safe);
}
