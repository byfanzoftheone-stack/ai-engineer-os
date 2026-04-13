import { api } from '@/lib/api';
export async function GET() { return api('/api/tasks'); }
export async function POST(req: Request) {
  return api('/api/tasks', { method: 'POST', body: await req.text() });
}
