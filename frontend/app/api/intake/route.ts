import { api } from '@/lib/api';
export async function POST(req: Request) {
  const body = await req.json();
  const endpoint = body._endpoint || 'analyze';
  delete body._endpoint;
  return api(`/api/intake/${endpoint}`, { method: 'POST', body: JSON.stringify(body) });
}
