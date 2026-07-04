import { sql } from './db';

export async function getProfile() {
  const rows = await sql`SELECT future_vision, obstacles, growth_plan, plan_gap_notes FROM profile WHERE id = 1`;
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

  let context =
    `\n\nThe user's own long-term picture, from when they set this up (reference only if it's genuinely ` +
    `relevant to what they're talking about right now — never recite it, never say "per your plan" or ` +
    `"checking in on your goal," never announce that you're drawing on this. If it fits, bring it up the ` +
    `way someone who's been paying attention would):\n` +
    `Future vision: ${profile.future_vision}\n` +
    `Obstacles they named: ${profile.obstacles || '(none stated)'}\n` +
    `Growth plan steps:\n${stepLines}`;

  let gapNotes = [];
  try {
    gapNotes = JSON.parse(profile.plan_gap_notes || '[]');
  } catch {
    gapNotes = [];
  }

  if (gapNotes.length) {
    context +=
      `\n\nPossible gaps between the above and what's actually come up lately (from the monthly reflection job — ` +
      `these are observations, not verdicts):\n` +
      gapNotes.map((n) => `- ${n}`).join('\n');
  }

  return context;
}

// Applies a plan change only after the user has explicitly confirmed it in
// conversation (see JOURNAL_RESPONSE_TOOL's planUpdate field) — the monthly
// reflection job is only allowed to *flag* gaps (plan_gap_notes), never
// rewrite the plan itself.
export async function applyConfirmedPlanUpdate(planUpdate, currentProfile) {
  await sql`
    UPDATE profile
    SET future_vision = ${planUpdate.vision},
        obstacles = ${planUpdate.obstacles || currentProfile?.obstacles || null},
        growth_plan = ${JSON.stringify(planUpdate.steps?.length ? planUpdate.steps : JSON.parse(currentProfile?.growth_plan || '[]'))},
        plan_gap_notes = '[]'
    WHERE id = 1
  `;
}

export async function clearPlanGapNotes() {
  await sql`UPDATE profile SET plan_gap_notes = '[]' WHERE id = 1`;
}
