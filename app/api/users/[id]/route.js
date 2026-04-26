import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, hashPin, generateSalt } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';
export const dynamic = 'force-dynamic';

async function getSession(request) { return await validateSession(request.cookies.get('novora_session')?.value); }

export async function PUT(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  if (params.id === 'ahmadou' && body.access) return NextResponse.json({ error: 'Cannot modify Ahmadou' }, { status: 403 });
  const users = await getList('users:list');
  const idx = users.findIndex(u => u.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (body.pin) { const salt = generateSalt(); users[idx].salt = salt; users[idx].pinHash = hashPin(String(body.pin), salt); }
  if (body.access && params.id !== 'ahmadou') users[idx].access = { ...users[idx].access, ...body.access };
  if (body.active !== undefined && params.id !== 'ahmadou') users[idx].active = body.active;
  await saveList('users:list', users);
  const { pinHash, salt, ...safe } = users[idx];
  return NextResponse.json(safe);
}

export async function DELETE(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (params.id === 'ahmadou') return NextResponse.json({ error: 'Cannot delete Ahmadou' }, { status: 403 });
  const users = await getList('users:list');
  const idx = users.findIndex(u => u.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  users[idx].active = false;
  await saveList('users:list', users);
  await writeAudit(session.userId, session.userName, 'novora-hub', 'USER_DEACTIVATED', users[idx].name);
  return NextResponse.json({ success: true });
}
