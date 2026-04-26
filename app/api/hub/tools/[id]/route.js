import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';
export const dynamic = 'force-dynamic';
async function getSession(request) { return await validateSession(request.cookies.get('novora_session')?.value); }

export async function PUT(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const tools = await getList('nh:tools:list');
  const idx = tools.findIndex(t => t.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  tools[idx] = { ...tools[idx], ...body, updatedAt: new Date().toISOString() };
  await saveList('nh:tools:list', tools);
  return NextResponse.json(tools[idx]);
}

export async function DELETE(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const tools = await getList('nh:tools:list');
  await saveList('nh:tools:list', tools.filter(t => t.id !== params.id));
  return NextResponse.json({ success: true });
}
