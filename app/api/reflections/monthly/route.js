import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { callWithTool } from '@/lib/anthropicClient';
import { PERIOD_SUMMARY_TOOL, periodSummarySystemPrompt } from '@/lib/prompts';
import { startOfMonth, endOfMonth } from '@/lib/dateUtils';

function resolveMonth(yearParam, monthParam) {
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  return { year, month, start: startOfMonth(year, month), end: endOfMonth(year, month) };
}

function fetchTranscript(startISO, endISO) {
  return db
    .prepare(
      `SELECT role, content, emotion, created_at FROM messages
       WHERE created_at >= ? AND created_at <= ? AND role = 'user'
       ORDER BY created_at ASC`
    )
    .all(startISO, endISO);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const { year, month } = resolveMonth(searchParams.get('year'), searchParams.get('month'));
  const row = db.prepare('SELECT * FROM monthly_reflections WHERE year = ? AND month = ?').get(year, month);
  const history = db
    .prepare('SELECT * FROM monthly_reflections ORDER BY year DESC, month DESC LIMIT 12')
    .all();
  return NextResponse.json({
    current: row ? { ...row, content: JSON.parse(row.content) } : null,
    year,
    month,
    history: history.map((h) => ({ ...h, content: JSON.parse(h.content) })),
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { year, month, start, end } = resolveMonth(body.year, body.month);

  const messages = fetchTranscript(start.toISOString(), end.toISOString());
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No entries logged this month yet.' }, { status: 400 });
  }

  const transcript = messages
    .map((m) => `[${m.created_at.slice(0, 10)}]${m.emotion ? ` (${m.emotion})` : ''} ${m.content}`)
    .join('\n');

  let result;
  try {
    result = await callWithTool({
      system: periodSummarySystemPrompt('monthly'),
      messages: [{ role: 'user', content: `Journal entries for ${year}-${String(month).padStart(2, '0')}:\n\n${transcript}` }],
      tool: PERIOD_SUMMARY_TOOL,
      maxTokens: 1600,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 502 });
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO monthly_reflections (year, month, content, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET content = excluded.content, created_at = excluded.created_at`
  ).run(year, month, JSON.stringify(result), now);

  return NextResponse.json({ year, month, content: result });
}
