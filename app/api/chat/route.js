import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { callWithTool } from '@/lib/anthropicClient';
import { COMPANION_SYSTEM_PROMPT, JOURNAL_RESPONSE_TOOL } from '@/lib/prompts';
import { searchJournal, formatMemoryContext } from '@/lib/journalSearch';

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

  await ensureSchema();

  const now = new Date().toISOString();
  let convId = conversationId;

  if (!convId) {
    const rows = await sql`
      INSERT INTO conversations (title, created_at, updated_at)
      VALUES (${makeTitle(message)}, ${now}, ${now})
      RETURNING id
    `;
    convId = rows[0].id;
  } else {
    const exists = await sql`SELECT id FROM conversations WHERE id = ${convId}`;
    if (exists.length === 0) {
      return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
    }
  }

  // Both run against fast indexed queries — pulled in parallel so the past-
  // entry search never adds a serial round trip to a normal chat turn.
  const [history, pastEntries] = await Promise.all([
    sql`SELECT role, content FROM messages WHERE conversation_id = ${convId} ORDER BY id ASC LIMIT ${HISTORY_LIMIT}`,
    searchJournal(message, { excludeConversationId: convId, limit: 5 }),
  ]);

  const system = COMPANION_SYSTEM_PROMPT + formatMemoryContext(pastEntries);

  let result;
  try {
    result = await callWithTool({
      system,
      messages: [...history, { role: 'user', content: message }],
      tool: JOURNAL_RESPONSE_TOOL,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 502 });
  }

  const nowUser = new Date().toISOString();
  await sql`
    INSERT INTO messages
      (conversation_id, role, content, emotion, sentiment, worries, goals, relationships, topics, created_at)
    VALUES (
      ${convId}, 'user', ${message}, ${result.emotion || null},
      ${typeof result.sentiment === 'number' ? result.sentiment : null},
      ${JSON.stringify(result.worries || [])}, ${JSON.stringify(result.goals || [])},
      ${JSON.stringify(result.relationships || [])}, ${JSON.stringify(result.topics || [])}, ${nowUser}
    )
  `;

  const nowAssistant = new Date().toISOString();
  await sql`
    INSERT INTO messages
      (conversation_id, role, content, emotion, sentiment, worries, goals, relationships, topics, created_at)
    VALUES (${convId}, 'assistant', ${result.reply}, NULL, NULL, '[]', '[]', '[]', '[]', ${nowAssistant})
  `;

  await sql`UPDATE conversations SET updated_at = ${nowAssistant} WHERE id = ${convId}`;

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
