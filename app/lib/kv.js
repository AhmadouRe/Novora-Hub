import { kv } from '@vercel/kv';

export async function getList(key) {
  try { return (await kv.get(key)) || []; } catch { return []; }
}
export async function getItem(key) {
  try { return await kv.get(key); } catch { return null; }
}
export async function saveList(key, arr) { await kv.set(key, arr); }
export async function saveItem(key, value) { await kv.set(key, value); }

export async function updateItem(key, id, updates) {
  const list = await getList(key);
  const updated = list.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
  await saveList(key, updated);
  return updated.find(i => i.id === id);
}
