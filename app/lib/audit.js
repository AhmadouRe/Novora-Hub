import { getList, saveList } from './kv.js';
import { generateId } from './auth.js';

export async function writeAudit(userId, userName, app, action, detail) {
  try {
    const log = await getList('audit:log');
    const entry = { id: generateId(), timestamp: new Date().toISOString(), userId, userName, app, action, detail };
    await saveList('audit:log', [entry, ...log].slice(0, 500));
  } catch {}
}
