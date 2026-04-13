import { api } from '@/lib/api';
export async function GET() { return api('/api/eval'); }
export async function POST(req: Request, { params }: { params: { type: string } }) {
  return api(`/api/eval/${params.type}`, { method: 'POST', body: await req.text() });
}
