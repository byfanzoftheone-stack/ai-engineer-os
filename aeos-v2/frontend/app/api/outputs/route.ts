import { api } from '@/lib/api';
export async function GET(req: Request) {
  const url = new URL(req.url);
  const filePath = url.searchParams.get('filePath');
  if (filePath) return api(`/api/outputs/content?filePath=${encodeURIComponent(filePath)}`);
  return api('/api/outputs');
}
