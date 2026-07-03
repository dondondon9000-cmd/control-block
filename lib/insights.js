import db from './db';

function parseTags(json) {
  try {
    return JSON.parse(json || '[]');
  } catch {
    return [];
  }
}

function topN(counts, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag, count]) => ({ tag, count }));
}

export function buildInsights() {
  const rows = db
    .prepare(
      `SELECT emotion, sentiment, worries, goals, relationships, topics, created_at
       FROM messages WHERE role = 'user' ORDER BY created_at ASC`
    )
    .all();

  const dayBuckets = {};
  const worryCounts = {};
  const goalCounts = {};
  const relationshipCounts = {};
  const topicCounts = {};
  const topicCooccur = {};

  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    if (!dayBuckets[date]) dayBuckets[date] = { sentimentSum: 0, count: 0, emotionCounts: {} };
    const bucket = dayBuckets[date];
    bucket.count += 1;
    if (typeof row.sentiment === 'number') bucket.sentimentSum += row.sentiment;
    if (row.emotion) bucket.emotionCounts[row.emotion] = (bucket.emotionCounts[row.emotion] || 0) + 1;

    for (const w of parseTags(row.worries)) worryCounts[w] = (worryCounts[w] || 0) + 1;
    for (const g of parseTags(row.goals)) goalCounts[g] = (goalCounts[g] || 0) + 1;
    for (const r of parseTags(row.relationships)) relationshipCounts[r] = (relationshipCounts[r] || 0) + 1;

    const topics = parseTags(row.topics);
    for (const t of topics) topicCounts[t] = (topicCounts[t] || 0) + 1;
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const key = [topics[i], topics[j]].sort().join('|||');
        topicCooccur[key] = (topicCooccur[key] || 0) + 1;
      }
    }
  }

  const trend = Object.entries(dayBuckets)
    .map(([date, b]) => {
      const dominantEmotion = topN(b.emotionCounts, 1)[0]?.tag || null;
      return {
        date,
        avgSentiment: b.count ? Number((b.sentimentSum / b.count).toFixed(2)) : 0,
        dominantEmotion,
        entries: b.count,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const calendar = {};
  for (const t of trend) calendar[t.date] = t.dominantEmotion;

  const topTopics = topN(topicCounts, 12);
  const topTopicIds = new Set(topTopics.map((t) => t.tag));
  const edges = Object.entries(topicCooccur)
    .map(([key, weight]) => {
      const [source, target] = key.split('|||');
      return { source, target, weight };
    })
    .filter((e) => topTopicIds.has(e.source) && topTopicIds.has(e.target));

  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();

  return {
    profile: profile
      ? {
          futureVision: profile.future_vision,
          obstacles: profile.obstacles,
          growthPlan: profile.growth_plan ? JSON.parse(profile.growth_plan) : [],
        }
      : null,
    trend,
    calendar,
    topWorries: topN(worryCounts, 8),
    topGoals: topN(goalCounts, 8),
    topRelationships: topN(relationshipCounts, 8),
    topicNetwork: { nodes: topTopics, edges },
    totalEntries: rows.length,
  };
}
