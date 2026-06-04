import { STORAGE_KEYS } from './storage';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getToken() {
  try { return localStorage.getItem(STORAGE_KEYS.ACCOUNT_TOKEN); } catch { return null; }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Request failed'), { status: res.status, data });
  return data;
}

export const apiSignup = (body) => apiFetch('/api/signup', { method: 'POST', body: JSON.stringify(body) });
export const apiLogin  = (body) => apiFetch('/api/login',  { method: 'POST', body: JSON.stringify(body) });
export const apiMe     = ()     => apiFetch('/api/me');
