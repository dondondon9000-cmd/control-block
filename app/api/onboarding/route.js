import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { callWithTool } from '@/lib/anthropicClient';
import { ONBOARDING_VISION_TOOL, ONBOARDING_PLAN_TOOL } from '@/lib/prompts';

const ONBOARDING_SYSTEM = `You are the voice inside Control Block, a private journal app, guiding a brand new user through their first conversation. You are a reflective companion, not a therapist — warm, specific, encouraging, never generic. You must always respond using the provided tool.`;

export async function POST(req) {
  const { stage, answer } = await req.json();

  if (!answer || typeof answer !== 'string' || !answer.trim()) {
    return NextResponse.json({ error: 'answer is required' }, { status: 400 });
  }

  db.prepare('INSERT OR IGNORE INTO profile (id) VALUES (1)').run();

  if (stage === 'vision') {
    let result;
    try {
      result = await callWithTool({
        system: ONBOARDING_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `The user was asked: "What should your future look like?" They answered: "${answer}"\n\nWrite a short encouraging reflection on their answer, then ask what obstacles are currently in the way of that future.`,
          },
        ],
        tool: ONBOARDING_VISION_TOOL,
      });
    } catch (err) {
      return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 502 });
    }

    db.prepare('UPDATE profile SET future_vision = ? WHERE id = 1').run(answer);

    return NextResponse.json({ reflection: result.reflection });
  }

  if (stage === 'obstacles') {
    const profile = db.prepare('SELECT future_vision FROM profile WHERE id = 1').get();

    let result;
    try {
      result = await callWithTool({
        system: ONBOARDING_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `The user's stated future vision: "${profile?.future_vision || 'unknown'}"\n\nThey were then asked what obstacles are in the way. They answered: "${answer}"\n\nWrite a short encouraging closing message, then create a basic personal growth plan of 3-5 concrete first steps toward their stated future, accounting for the obstacles they named.`,
          },
        ],
        tool: ONBOARDING_PLAN_TOOL,
      });
    } catch (err) {
      return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 502 });
    }

    db.prepare(
      'UPDATE profile SET obstacles = ?, growth_plan = ?, onboarded_at = ? WHERE id = 1'
    ).run(answer, JSON.stringify(result.steps), new Date().toISOString());

    return NextResponse.json({ message: result.message, steps: result.steps });
  }

  return NextResponse.json({ error: 'invalid stage' }, { status: 400 });
}
