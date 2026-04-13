import { api } from '@/lib/api';
export async function POST(req: Request) {
  return api('/api/chat', { method: 'POST', body: await req.text() });
}
export async function GET() {
  return api('/api/chat/history');
}
