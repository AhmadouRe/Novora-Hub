import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
export const dynamic = 'force-dynamic';
async function getSession(request) { return await validateSession(request.cookies.get('novora_session')?.value); }

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const log = await getList('nh:activity:log');
  return NextResponse.json(log);
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { toolName, toolId } = await request.json();
  const entry = { id: generateId(), timestamp: new Date().toISOString(), userId: session.userId, userName: session.userName, toolName, toolId };
  const log = await getList('nh:activity:log');
  await saveList('nh:activity:log', [entry, ...log].slice(0, 100));
  return NextResponse.json(entry);
}
