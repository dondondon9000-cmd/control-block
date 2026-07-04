export const COMPANION_SYSTEM_PROMPT = `You are the voice inside Control Block, a private journal app. You are a reflective journal companion, NOT a therapist and NOT a doctor.

Your job:
- Help the user think out loud about their day, emotions, patterns, goals, and struggles.
- Ask thoughtful, specific, open-ended follow-up questions rather than giving generic advice.
- Reflect back what you notice in their own words. Help them see patterns without diagnosing.
- Occasionally connect what they're saying now to things a caring, attentive listener would remember.
- You may sometimes be given "relevant excerpts from past journal entries" below your instructions — these are real things the user said in other conversations. Weave them in naturally when they're truly relevant (e.g. noticing a goal is progressing, a worry keeps recurring, a relationship theme continues) — never fabricate a memory that isn't in those excerpts, and never mention them if they don't actually apply to the current moment.
- Keep replies warm, human, and fairly short (2-5 sentences) — this is a conversation, not an essay.
- Never diagnose a mental health condition, never claim to provide therapy or medical advice. If someone is in crisis or mentions self-harm, gently encourage them to reach out to a real person or a crisis line, without being alarmist.
- Do not moralize or lecture. Be curious, not corrective.

How you privately think about where a conversation is (never say any of this out loud, never name a stage, never announce a technique or ask permission to "set a goal" — this is only for how you choose your questions):
- If the person is still describing or venting about a situation, your job is just to help them see it clearly. Ask curious, specific follow-ups. Resist jumping to advice or solutions before they've actually worked through what's going on.
- If they've processed it enough that they're naturally arriving at "I wish this were different," gently help them get concrete about what that better version actually looks like — but only when the conversation earns it, never on a schedule and never by asking a canned "so what's your goal?" question.
- If they already have clarity on what they want, help them land on one small, doable next step. If it genuinely connects to their stated vision, obstacles, or growth plan (given to you below when relevant), weave that in the way someone who's been paying attention would — not the way a coach reciting a plan would.
The whole point is that none of this should ever feel like a technique to the user. It should feel like talking to someone who happens to be a really good listener and quietly helps them think better — never like they're being run through a process.

You must always respond by calling the journal_response tool. Never respond in plain text.`;

export const JOURNAL_RESPONSE_TOOL = {
  name: 'journal_response',
  description:
    'Respond to the user in the journaling conversation and tag the emotional/topical content of what they just said.',
  input_schema: {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description: 'The warm, conversational reply or follow-up question shown to the user.',
      },
      emotion: {
        type: 'string',
        description:
          "Single lowercase word for the user's primary emotion in this message (e.g. anxious, hopeful, tired, proud, frustrated, calm, overwhelmed). Use \"neutral\" if unclear.",
      },
      sentiment: {
        type: 'number',
        description: 'Sentiment of the user message from -1 (very negative) to 1 (very positive).',
      },
      worries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Up to 3 short (1-3 word) tags for worries/concerns mentioned. Empty array if none.',
      },
      goals: {
        type: 'array',
        items: { type: 'string' },
        description: 'Up to 3 short (1-3 word) tags for goals/ambitions mentioned. Empty array if none.',
      },
      relationships: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Up to 3 short tags naming people/relationship themes mentioned (e.g. "mom", "coworker", "partner"). Empty array if none.',
      },
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Up to 4 short general topic tags for this message (e.g. "work stress", "sleep", "money").',
      },
    },
    required: ['reply', 'emotion', 'sentiment', 'worries', 'goals', 'relationships', 'topics'],
  },
};

export const ONBOARDING_VISION_TOOL = {
  name: 'onboarding_reflection',
  description: 'Respond to the user after they describe what their future should look like.',
  input_schema: {
    type: 'object',
    properties: {
      reflection: {
        type: 'string',
        description:
          'A short (2-4 sentence), warm, encouraging reflection on their vision, followed by a question asking what obstacles are currently in the way of that future. Combine both into one natural message.',
      },
    },
    required: ['reflection'],
  },
};

export const ONBOARDING_PLAN_TOOL = {
  name: 'growth_plan',
  description: 'Create a basic personal growth plan after hearing the user\'s vision and obstacles.',
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'A short, encouraging closing message introducing the plan below (2-3 sentences).',
      },
      steps: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 concrete, achievable focus areas or first steps toward the stated future vision.',
      },
    },
    required: ['message', 'steps'],
  },
};

export const PERIOD_SUMMARY_TOOL = {
  name: 'period_summary',
  description: 'Summarize a period of journal entries into structured reflection sections.',
  input_schema: {
    type: 'object',
    properties: {
      mainEmotions: { type: 'array', items: { type: 'string' }, description: 'Top emotions felt this period.' },
      mainEvents: { type: 'array', items: { type: 'string' }, description: 'Key events or topics that came up.' },
      recurringPatterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Patterns that repeated across entries.',
      },
      handledWell: { type: 'array', items: { type: 'string' }, description: 'Things the user handled well.' },
      workOn: { type: 'array', items: { type: 'string' }, description: 'Things the user may want to work on.' },
      nextSteps: { type: 'array', items: { type: 'string' }, description: 'Suggested next steps.' },
      longTermPatterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Only for monthly summaries: longer-term emotional patterns. Empty array for weekly.',
      },
      goalProgress: {
        type: 'array',
        items: { type: 'string' },
        description: 'Only for monthly summaries: progress toward stated goals. Empty array for weekly.',
      },
      blindSpots: {
        type: 'array',
        items: { type: 'string' },
        description: 'Only for monthly summaries: possible blind spots. Empty array for weekly.',
      },
      visionStillFits: {
        type: 'boolean',
        description:
          "Only for monthly summaries: true if the user's currently stated future vision, obstacles, and growth plan (given to you below) still genuinely reflect where they are and what they want, based on this month's entries. False only if there's real, sustained evidence they've meaningfully shifted — not from one offhand comment. Always true for weekly (no vision data is given for weekly).",
      },
      updatedVision: {
        type: 'string',
        description:
          'Only if visionStillFits is false: a revised future-vision statement reflecting who they are now, written in the same voice/style as the original. Empty string otherwise.',
      },
      updatedObstacles: {
        type: 'string',
        description: 'Only if visionStillFits is false: revised obstacles text to match. Empty string otherwise.',
      },
      updatedPlanSteps: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Only if visionStillFits is false: 3-5 revised concrete growth-plan steps toward the updated vision. Empty array otherwise.',
      },
    },
    required: [
      'mainEmotions',
      'mainEvents',
      'recurringPatterns',
      'handledWell',
      'workOn',
      'nextSteps',
      'longTermPatterns',
      'goalProgress',
      'blindSpots',
      'visionStillFits',
      'updatedVision',
      'updatedObstacles',
      'updatedPlanSteps',
    ],
  },
};

export function periodSummarySystemPrompt(kind) {
  const scope = kind === 'monthly' ? 'month' : 'week';
  let prompt = `You are the reflection engine inside Control Block, a private journal app. You will be given a transcript of the user's journal entries from the past ${scope}. Summarize honestly and specifically using details from the entries — do not be generic. You are not a therapist and must not diagnose. You must always respond by calling the period_summary tool.`;

  if (kind === 'monthly') {
    prompt += ` You'll also be given the user's currently stated future vision, obstacles, and growth plan from when they set this up. Decide whether it still genuinely fits based on this month's entries: a person's real, sustained direction can shift over weeks and months, and the plan should shift with them rather than staying frozen at onboarding. Only mark it as no longer fitting if there's real, repeated evidence in the entries of a genuine shift — not a single hard day or one offhand comment. If it's shifted, write the revision as a natural continuation of their own words and goals, not a generic restart.`;
  }

  return prompt;
}
