import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { callWithTool } from '@/lib/anthropicClient';
import { PERIOD_SUMMARY_TOOL, periodSummarySystemPrompt } from '@/lib/prompts';
import { startOfWeek, endOfWeek, toISODate } from '@/lib/dateUtils';

function resolveWeek(weekStartParam) {
  const base = weekStartParam ? new Date(weekStartParam) : new Date();
  const start = startOfWeek(base);
  const end = endOfWeek(base);
  return { start, end, weekStart: toISODate(start), weekEnd: toISODate(end) };
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
  const { weekStart } = resolveWeek(searchParams.get('week_start'));
  const row = db.prepare('SELECT * FROM weekly_reflections WHERE week_start = ?').get(weekStart);
  const history = db
    .prepare('SELECT * FROM weekly_reflections ORDER BY week_start DESC LIMIT 12')
    .all();
  return NextResponse.json({
    current: row ? { ...row, content: JSON.parse(row.content) } : null,
    weekStart,
    history: history.map((h) => ({ ...h, content: JSON.parse(h.content) })),
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { start, end, weekStart, weekEnd } = resolveWeek(body.week_start);

  const messages = fetchTranscript(start.toISOString(), end.toISOString());
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No entries logged this week yet.' }, { status: 400 });
  }

  const transcript = messages
    .map((m) => `[${m.created_at.slice(0, 10)}]${m.emotion ? ` (${m.emotion})` : ''} ${m.content}`)
    .join('\n');

  let result;
  try {
    result = await callWithTool({
      system: periodSummarySystemPrompt('weekly'),
      messages: [{ role: 'user', content: `Journal entries from ${weekStart} to ${weekEnd}:\n\n${transcript}` }],
      tool: PERIOD_SUMMARY_TOOL,
      maxTokens: 1400,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 502 });
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO weekly_reflections (week_start, week_end, content, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(week_start) DO UPDATE SET content = excluded.content, created_at = excluded.created_at`
  ).run(weekStart, weekEnd, JSON.stringify(result), now);

  return NextResponse.json({ weekStart, weekEnd, content: result });
}
