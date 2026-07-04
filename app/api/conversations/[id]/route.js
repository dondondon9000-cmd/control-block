import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET(_req, { params }) {
  await ensureSchema();
  const id = Number(params.id);
  const conversations = await sql`SELECT * FROM conversations WHERE id = ${id}`;
  const conversation = conversations[0];
  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const messages = await sql`SELECT * FROM messages WHERE conversation_id = ${id} ORDER BY id ASC`;

  return NextResponse.json({
    conversation,
    messages: messages.map((m) => ({
      ...m,
      worries: JSON.parse(m.worries || '[]'),
      goals: JSON.parse(m.goals || '[]'),
      relationships: JSON.parse(m.relationships || '[]'),
      topics: JSON.parse(m.topics || '[]'),
    })),
  });
}

export async function DELETE(_req, { params }) {
  await ensureSchema();
  const id = Number(params.id);
  await sql`DELETE FROM conversations WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
