import { NextResponse } from 'next/server';
import { getItem, saveItem } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';
export const dynamic = 'force-dynamic';
async function getSession(request) { return await validateSession(request.cookies.get('novora_session')?.value); }

export async function GET(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const urls = await getItem(`nh:urls:${params.userId}`) || {};
  return NextResponse.json(urls);
}

export async function PUT(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const existing = await getItem(`nh:urls:${params.userId}`) || {};
  const updated = { ...existing, ...body };
  await saveItem(`nh:urls:${params.userId}`, updated);
  return NextResponse.json(updated);
}
