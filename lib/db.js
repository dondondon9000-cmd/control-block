import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

let pool = globalThis.__controlBlockPool;
if (!pool) {
  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  globalThis.__controlBlockPool = pool;
}

// A tagged-template helper so call sites read like `sql\`SELECT * FROM x WHERE id = ${id}\``
// instead of manually juggling $1/$2 placeholders — resolves to the rows array directly.
export async function sql(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}${strings[i + 1]}`;
  }
  const result = await pool.query(text, values);
  return result.rows;
}

let schemaReady;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          future_vision TEXT,
          obstacles TEXT,
          growth_plan TEXT,
          onboarded_at TEXT
        )
      `;
      // JSON array of short, neutral observations (from the monthly reflection
      // job) about a gap between the stated plan and what's actually come up —
      // never auto-applied to the plan itself, just handed to the Talk
      // companion to naturally check in about.
      await sql`ALTER TABLE profile ADD COLUMN IF NOT EXISTS plan_gap_notes TEXT`;
      await sql`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL DEFAULT 'Untitled entry',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          emotion TEXT,
          sentiment REAL,
          worries TEXT,
          goals TEXT,
          relationships TEXT,
          topics TEXT,
          created_at TEXT NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS weekly_reflections (
          id SERIAL PRIMARY KEY,
          week_start TEXT NOT NULL UNIQUE,
          week_end TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS monthly_reflections (
          id SERIAL PRIMARY KEY,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(year, month)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`;

      // Full-text search over everything ever journaled — content plus the
      // tagged worries/goals/relationships/topics, so a search for "money"
      // also catches entries only tagged with the worry "finances" even if
      // that exact word never appears in the message text. Generated +
      // stored so it's precomputed on write, not recomputed on every search.
      await sql`
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english',
            content || ' ' ||
            coalesce(worries, '') || ' ' ||
            coalesce(goals, '') || ' ' ||
            coalesce(relationships, '') || ' ' ||
            coalesce(topics, '')
          )
        ) STORED
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN (search_vector)`;
    })();
  }
  return schemaReady;
}
