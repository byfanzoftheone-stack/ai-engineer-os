const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function api(path: string, init: RequestInit = {}) {
  if (!API) return new Response(JSON.stringify({ error: 'NEXT_PUBLIC_API_URL not set' }), { status: 500 });
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}

export async function apiJSON(path: string, init: RequestInit = {}) {
  const res = await api(path, init);
  return res.json();
}
