import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  let rows;
  if (q) {
    rows = db
      .prepare(
        `SELECT c.id, c.title, c.created_at, c.updated_at,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id ASC LIMIT 1) AS preview
         FROM conversations c
         WHERE c.id IN (
           SELECT DISTINCT conversation_id FROM messages WHERE content LIKE ?
         ) OR c.title LIKE ?
         ORDER BY c.updated_at DESC`
      )
      .all(`%${q}%`, `%${q}%`);
  } else {
    rows = db
      .prepare(
        `SELECT c.id, c.title, c.created_at, c.updated_at,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id ASC LIMIT 1) AS preview
         FROM conversations c
         ORDER BY c.updated_at DESC`
      )
      .all();
  }

  return NextResponse.json({ conversations: rows });
}
