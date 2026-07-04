import { sql } from './db';

// Below this many words, a message is unlikely to carry enough signal to
// search well ("ok", "thanks", "yeah") — skip the query entirely rather than
// spend a DB round trip on something that won't return anything useful.
const MIN_WORDS_FOR_SEARCH = 3;

export async function searchJournal(queryText, { excludeConversationId, limit = 5 } = {}) {
  const trimmed = (queryText || '').trim();
  if (trimmed.split(/\s+/).filter(Boolean).length < MIN_WORDS_FOR_SEARCH) {
    return [];
  }

  // conversation_id is always a positive serial, so -1 as a sentinel means
  // "don't exclude anything" without needing a second query shape.
  const excludeId = excludeConversationId ?? -1;

  // plainto_tsquery ANDs every word together, which is wrong for this: a
  // rambling current message like "how's my inventory business going" would
  // fail to match a past entry that only contains "inventory" (it has no
  // "business" or "going"), even though that's clearly the relevant one.
  // Building an OR query from the same stemmed lexemes used to build the
  // stored vectors means any real overlap surfaces, ranked by how much
  // overlaps rather than requiring every word to.
  return sql`
    WITH query AS (
      SELECT to_tsquery('english', string_agg(lexeme, ' | ')) AS q
      FROM unnest(tsvector_to_array(to_tsvector('english', ${trimmed}))) AS lexeme
    )
    SELECT m.conversation_id, m.content, m.emotion, m.created_at,
           ts_rank(m.search_vector, query.q) AS rank
    FROM messages m, query
    WHERE m.role = 'user'
      AND m.conversation_id != ${excludeId}
      AND query.q IS NOT NULL
      AND m.search_vector @@ query.q
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
}

export function formatMemoryContext(entries) {
  if (!entries || entries.length === 0) return '';
  const lines = entries.map((e) => {
    const date = (e.created_at || '').slice(0, 10);
    const emotion = e.emotion ? ` (felt ${e.emotion})` : '';
    return `- [${date}]${emotion} "${e.content}"`;
  });
  return (
    `\n\nRelevant excerpts from the user's past journal entries (other conversations), most relevant first:\n` +
    `${lines.join('\n')}\n\n` +
    `Only reference these if they're genuinely relevant to what the user just said — don't force a ` +
    `connection that isn't there, and don't announce that you "searched" anything. Just bring it up ` +
    `the way someone would if they simply remembered.`
  );
}
