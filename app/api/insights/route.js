import { NextResponse } from 'next/server';
import { buildInsights } from '@/lib/insights';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await buildInsights());
}
