import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET(req) {
  await ensureSchema();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = await sql`
      SELECT c.id, c.title, c.created_at, c.updated_at,
             (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id ASC LIMIT 1) AS preview
      FROM conversations c
      WHERE c.id IN (
        SELECT DISTINCT conversation_id FROM messages WHERE content ILIKE ${like}
      ) OR c.title ILIKE ${like}
      ORDER BY c.updated_at DESC
    `;
  } else {
    rows = await sql`
      SELECT c.id, c.title, c.created_at, c.updated_at,
             (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id ASC LIMIT 1) AS preview
      FROM conversations c
      ORDER BY c.updated_at DESC
    `;
  }

  return NextResponse.json({ conversations: rows });
}
