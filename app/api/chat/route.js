import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { callWithTool } from '@/lib/anthropicClient';
import { COMPANION_SYSTEM_PROMPT, JOURNAL_RESPONSE_TOOL } from '@/lib/prompts';

const HISTORY_LIMIT = 24;

function makeTitle(text) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export async function POST(req) {
  const { conversationId, message } = await req.json();

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  let convId = conversationId;

  if (!convId) {
    const info = db
      .prepare('INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)')
      .run(makeTitle(message), now, now);
    convId = info.lastInsertRowid;
  } else {
    const exists = db.prepare('SELECT id FROM conversations WHERE id = ?').get(convId);
    if (!exists) {
      return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
    }
  }

  const history = db
    .prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC LIMIT ?'
    )
    .all(convId, HISTORY_LIMIT);

  let result;
  try {
    result = await callWithTool({
      system: COMPANION_SYSTEM_PROMPT,
      messages: [...history, { role: 'user', content: message }],
      tool: JOURNAL_RESPONSE_TOOL,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 502 });
  }

  const insertMessage = db.prepare(
    `INSERT INTO messages
      (conversation_id, role, content, emotion, sentiment, worries, goals, relationships, topics, created_at)
     VALUES (@conversation_id, @role, @content, @emotion, @sentiment, @worries, @goals, @relationships, @topics, @created_at)`
  );

  const nowUser = new Date().toISOString();
  insertMessage.run({
    conversation_id: convId,
    role: 'user',
    content: message,
    emotion: result.emotion || null,
    sentiment: typeof result.sentiment === 'number' ? result.sentiment : null,
    worries: JSON.stringify(result.worries || []),
    goals: JSON.stringify(result.goals || []),
    relationships: JSON.stringify(result.relationships || []),
    topics: JSON.stringify(result.topics || []),
    created_at: nowUser,
  });

  const nowAssistant = new Date().toISOString();
  insertMessage.run({
    conversation_id: convId,
    role: 'assistant',
    content: result.reply,
    emotion: null,
    sentiment: null,
    worries: '[]',
    goals: '[]',
    relationships: '[]',
    topics: '[]',
    created_at: nowAssistant,
  });

  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(nowAssistant, convId);

  return NextResponse.json({
    conversationId: convId,
    reply: result.reply,
    emotion: result.emotion,
    sentiment: result.sentiment,
    worries: result.worries,
    goals: result.goals,
    relationships: result.relationships,
    topics: result.topics,
  });
}
