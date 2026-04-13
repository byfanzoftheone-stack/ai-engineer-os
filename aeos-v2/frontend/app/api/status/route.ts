import { api } from '@/lib/api';
export async function GET() { return api('/api/status'); }
