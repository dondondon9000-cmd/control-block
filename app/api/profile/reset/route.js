import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function POST() {
  await ensureSchema();
  await sql`
    UPDATE profile
    SET future_vision = NULL, obstacles = NULL, growth_plan = NULL, onboarded_at = NULL
    WHERE id = 1
  `;
  return NextResponse.json({ ok: true });
}
