import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(_req, { params }) {
  const id = Number(params.id);
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(id);

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
  const id = Number(params.id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
