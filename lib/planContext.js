import { sql } from './db';

export async function getProfile() {
  const rows = await sql`SELECT future_vision, obstacles, growth_plan FROM profile WHERE id = 1`;
  return rows[0] || null;
}

export function formatPlanContext(profile) {
  if (!profile || !profile.future_vision) return '';

  let steps = [];
  try {
    steps = JSON.parse(profile.growth_plan || '[]');
  } catch {
    steps = [];
  }

  const stepLines = steps.length
    ? steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '(no plan steps recorded)';

  return (
    `\n\nThe user's own long-term picture, from when they set this up (reference only if it's genuinely ` +
    `relevant to what they're talking about right now — never recite it, never say "per your plan" or ` +
    `"checking in on your goal," never announce that you're drawing on this. If it fits, bring it up the ` +
    `way someone who's been paying attention would):\n` +
    `Future vision: ${profile.future_vision}\n` +
    `Obstacles they named: ${profile.obstacles || '(none stated)'}\n` +
    `Growth plan steps:\n${stepLines}`
  );
}
