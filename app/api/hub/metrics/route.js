import { NextResponse } from 'next/server';
import { getItem, getList } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';
export const dynamic = 'force-dynamic';
async function getSession(request) { return await validateSession(request.cookies.get('novora_session')?.value); }

function toN(v) { const n = parseFloat(String(v||0).replace(/[^0-9.]/g,'')); return isNaN(n)?0:n; }

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const [goal, deals, wclEntries, campaigns, scoreHistory] = await Promise.all([
      getItem('nc:revenue:goal'),
      getList('nc:revenue:deals'),
      getList('nc:kpi:wcl'),
      getList('nc:kpi:campaigns'),
      getList('nc:scorecard:history'),
    ]);

    const g = goal || { amount: 50000, startDate: '2026-04-25', endDate: '2026-07-25' };
    const activeDeals = (deals || []).filter(d => !d.deleted);
    const totalRevenue = activeDeals.reduce((s, d) => s + toN(d.fee), 0);
    const goalAmt = toN(g.amount) || 50000;
    const now = new Date();
    const endDate = new Date(g.endDate);
    const daysLeft = Math.max(0, Math.ceil((endDate - now) / 86400000));
    const today = now.toISOString().slice(0, 10);
    const todayWcl = (wclEntries || []).filter(e => e.date === today).length;
    const todaySms = (campaigns || []).flatMap(c => c.dailyEntries || []).filter(e => e.date === today).length;
    const activeCampaigns = (campaigns || []).filter(c => c.status === 'active');
    const lastScore = scoreHistory?.[0] || null;

    return NextResponse.json({
      daysLeft,
      totalRevenue,
      goalAmt,
      goalPct: goalAmt > 0 ? Math.round((totalRevenue / goalAmt) * 100) : 0,
      dealsCount: activeDeals.length,
      todayWcl,
      todaySms,
      activeCampaigns: activeCampaigns.map(c => ({ name: c.name, color: c.color })),
      lastScore: lastScore ? { verdict: lastScore.verdict, address: lastScore.address } : null,
      endDate: g.endDate,
    });
  } catch { return NextResponse.json({}); }
}
