import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
export const dynamic = 'force-dynamic';

const DEFAULT_TOOLS = [
  { id:'xleads', name:'X-Leads', category:'CRM', icon:'◉', color:'#06B6D4', globalUrl:'', desc:'Primary CRM — pipelines, sequences, lead management', perUser:true, visibility:'everyone', visibleTo:[], active:true },
  { id:'dealmachine', name:'DealMachine', category:'Lead Generation', icon:'◈', color:'#E8A020', globalUrl:'', desc:'List builder, skip tracing — $150/month', perUser:true, visibility:'everyone', visibleTo:[], active:true },
  { id:'propwire', name:'Propwire / WCL', category:'Lead Generation', icon:'◈', color:'#E8A020', globalUrl:'', desc:'Warm inbound seller leads ~200/month', perUser:false, visibility:'everyone', visibleTo:[], active:true },
  { id:'investorbase', name:'InvestorBase', category:'Disposition', icon:'◆', color:'#22C55E', globalUrl:'', desc:'Verified cash buyer network — POF required', perUser:true, visibility:'everyone', visibleTo:[], active:true },
  { id:'gmail', name:'Gmail', category:'Communication', icon:'✉', color:'#EF4444', globalUrl:'https://mail.google.com', desc:'Business email', perUser:true, visibility:'everyone', visibleTo:[], active:true },
  { id:'bluevine', name:'Bluevine', category:'Finance', icon:'◍', color:'#06B6D4', globalUrl:'https://www.bluevine.com', desc:'5-account business banking', perUser:false, visibility:'everyone', visibleTo:[], active:true },
  { id:'nc', name:'Novora Capital', category:'Internal Tools', icon:'N', color:'#E8A020', globalUrl:'', desc:'Deal Calculator, KPI, Revenue, Expenses, Scorecard', perUser:false, visibility:'everyone', visibleTo:[], active:true },
  { id:'ledger', name:'Novora Ledger', category:'Internal Tools', icon:'L', color:'#A78BFA', globalUrl:'', desc:'Personal financial tracker', perUser:false, visibility:'everyone', visibleTo:[], active:true },
  { id:'gdrive', name:'Google Drive', category:'Documents', icon:'▲', color:'#22C55E', globalUrl:'https://drive.google.com', desc:'Contracts, templates, legal files', perUser:true, visibility:'everyone', visibleTo:[], active:true },
  { id:'facebook', name:'Facebook Groups', category:'JV Marketing', icon:'f', color:'#06B6D4', globalUrl:'https://facebook.com/groups', desc:'60+ wholesale groups for JV deal flow', perUser:false, visibility:'everyone', visibleTo:[], active:true },
];

async function ensureTools() {
  let tools = await getList('nh:tools:list');
  if (!tools || tools.length === 0) { await saveList('nh:tools:list', DEFAULT_TOOLS); return DEFAULT_TOOLS; }
  return tools;
}

async function getSession(request) { return await validateSession(request.cookies.get('novora_session')?.value); }

function canSee(tool, userId) {
  if (tool.visibility === 'everyone') return true;
  if (tool.visibility === 'justme') return userId === 'ahmadou';
  if (tool.visibility === 'specific') return (tool.visibleTo || []).includes(userId);
  return false;
}

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tools = await ensureTools();
  const all = new URL(request.url).searchParams.get('all');
  if (all && session.access?.manageTeam) return NextResponse.json(tools.filter(t => t.active));
  return NextResponse.json(tools.filter(t => t.active && canSee(t, session.userId)));
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const tool = { id: generateId(), ...body, active: true };
  const tools = await ensureTools();
  tools.push(tool);
  await saveList('nh:tools:list', tools);
  return NextResponse.json(tool);
}
