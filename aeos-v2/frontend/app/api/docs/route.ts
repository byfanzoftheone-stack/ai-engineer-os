import { api } from '@/lib/api';
export async function GET() { return api('/api/docs'); }
export async function POST(req: Request) {
  return api('/api/docs/generate', { method: 'POST', body: await req.text() });
}
