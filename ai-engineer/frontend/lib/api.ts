function normalizeApiBase(input: string | undefined) {
  if (!input) return '';
  return input.trim().replace(/["',\s]+$/g, '').replace(/\/$/, '');
}

const API = normalizeApiBase(
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || process.env.RAILWAY_API_URL
);

export async function api(path: string, init: RequestInit = {}) {
  if (!API) {
    return new Response(JSON.stringify({
      error: 'API URL not configured',
      hint: 'Set NEXT_PUBLIC_API_URL (or API_URL) in Vercel environment variables',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      cache: 'no-store',
    });
    const text = await res.text();
    return new Response(text || JSON.stringify({ error: 'Upstream returned empty response' }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to reach backend API',
      details: error instanceof Error ? error.message : 'Unknown error',
      target: `${API}${path}`,
    }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function apiJSON(path: string, init: RequestInit = {}) {
  const res = await api(path, init);
  return res.json();
}
