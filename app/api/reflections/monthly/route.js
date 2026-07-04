import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { callWithTool } from '@/lib/anthropicClient';
import { PERIOD_SUMMARY_TOOL, periodSummarySystemPrompt } from '@/lib/prompts';
import { startOfMonth, endOfMonth } from '@/lib/dateUtils';

function resolveMonth(yearParam, monthParam) {
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  return { year, month, start: startOfMonth(year, month), end: endOfMonth(year, month) };
}

async function fetchTranscript(startISO, endISO) {
  return sql`
    SELECT role, content, emotion, created_at FROM messages
    WHERE created_at >= ${startISO} AND created_at <= ${endISO} AND role = 'user'
    ORDER BY created_at ASC
  `;
}

export async function GET(req) {
  await ensureSchema();
  const { searchParams } = new URL(req.url);
  const { year, month } = resolveMonth(searchParams.get('year'), searchParams.get('month'));
  const rows = await sql`SELECT * FROM monthly_reflections WHERE year = ${year} AND month = ${month}`;
  const row = rows[0];
  const history = await sql`SELECT * FROM monthly_reflections ORDER BY year DESC, month DESC LIMIT 12`;
  return NextResponse.json({
    current: row ? { ...row, content: JSON.parse(row.content) } : null,
    year,
    month,
    history: history.map((h) => ({ ...h, content: JSON.parse(h.content) })),
  });
}

export async function POST(req) {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const { year, month, start, end } = resolveMonth(body.year, body.month);

  const messages = await fetchTranscript(start.toISOString(), end.toISOString());
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
  await sql`
    INSERT INTO monthly_reflections (year, month, content, created_at)
    VALUES (${year}, ${month}, ${JSON.stringify(result)}, ${now})
    ON CONFLICT (year, month) DO UPDATE SET content = excluded.content, created_at = excluded.created_at
  `;

  return NextResponse.json({ year, month, content: result });
}
