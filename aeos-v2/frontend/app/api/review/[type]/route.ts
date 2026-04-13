import { api } from '@/lib/api';
export async function POST(req: Request, { params }: { params: { type: string } }) {
  return api(`/api/review/${params.type}`, { method: 'POST', body: await req.text() });
}
