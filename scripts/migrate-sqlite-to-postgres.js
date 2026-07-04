/* eslint-disable */
// One-time migration: copies a local SQLite journal (data/control-block.db,
// from before the Postgres switch) into the Postgres database configured
// via DATABASE_URL in .env.
//
// Run once with: node scripts/migrate-sqlite-to-postgres.js
// (or: npm run migrate:sqlite)

const fs = require('fs');
const path = require('path');

// Minimal .env loader — this script runs standalone via plain `node`, not
// through Next.js, so nothing auto-loads .env the way `next dev` does.
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');

async function main() {
  const sqlitePath = path.join(process.cwd(), 'data', 'control-block.db');
  if (!fs.existsSync(sqlitePath)) {
    console.error(`No SQLite file found at ${sqlitePath} — nothing to migrate.`);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env — cannot connect to Postgres.');
    process.exit(1);
  }

  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  const pg = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
  });

  try {
    // Safety check: don't silently double-import on top of existing data.
    const existing = await pg.query('SELECT COUNT(*)::int AS count FROM conversations');
    if (existing.rows[0].count > 0) {
      console.error(
        `Postgres already has ${existing.rows[0].count} conversation(s). Refusing to import on top of ` +
          `existing data to avoid duplicates. If those are just test entries you don't need, delete them ` +
          `first, then run this again.`
      );
      process.exit(1);
    }

    console.log('Migrating profile...');
    const profile = sqlite.prepare('SELECT * FROM profile WHERE id = 1').get();
    if (profile) {
      await pg.query(
        `INSERT INTO profile (id, future_vision, obstacles, growth_plan, onboarded_at)
         VALUES (1, $1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           future_vision = excluded.future_vision,
           obstacles = excluded.obstacles,
           growth_plan = excluded.growth_plan,
           onboarded_at = excluded.onboarded_at`,
        [profile.future_vision, profile.obstacles, profile.growth_plan, profile.onboarded_at]
      );
      console.log('  done.');
    } else {
      console.log('  no profile row found, skipping.');
    }

    console.log('Migrating conversations + messages...');
    const conversations = sqlite.prepare('SELECT * FROM conversations ORDER BY id ASC').all();
    const idMap = new Map();

    for (const conv of conversations) {
      const result = await pg.query(
        `INSERT INTO conversations (title, created_at, updated_at) VALUES ($1, $2, $3) RETURNING id`,
        [conv.title, conv.created_at, conv.updated_at]
      );
      idMap.set(conv.id, result.rows[0].id);
    }
    console.log(`  ${conversations.length} conversation(s) migrated.`);

    const messages = sqlite.prepare('SELECT * FROM messages ORDER BY id ASC').all();
    let messageCount = 0;
    for (const msg of messages) {
      const newConvId = idMap.get(msg.conversation_id);
      if (!newConvId) continue;
      await pg.query(
        `INSERT INTO messages
          (conversation_id, role, content, emotion, sentiment, worries, goals, relationships, topics, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newConvId,
          msg.role,
          msg.content,
          msg.emotion,
          msg.sentiment,
          msg.worries,
          msg.goals,
          msg.relationships,
          msg.topics,
          msg.created_at,
        ]
      );
      messageCount++;
    }
    console.log(`  ${messageCount} message(s) migrated.`);

    console.log('Migrating weekly reflections...');
    const weekly = sqlite.prepare('SELECT * FROM weekly_reflections').all();
    for (const w of weekly) {
      await pg.query(
        `INSERT INTO weekly_reflections (week_start, week_end, content, created_at)
         VALUES ($1, $2, $3, $4) ON CONFLICT (week_start) DO NOTHING`,
        [w.week_start, w.week_end, w.content, w.created_at]
      );
    }
    console.log(`  ${weekly.length} weekly reflection(s) migrated.`);

    console.log('Migrating monthly reflections...');
    const monthly = sqlite.prepare('SELECT * FROM monthly_reflections').all();
    for (const m of monthly) {
      await pg.query(
        `INSERT INTO monthly_reflections (year, month, content, created_at)
         VALUES ($1, $2, $3, $4) ON CONFLICT (year, month) DO NOTHING`,
        [m.year, m.month, m.content, m.created_at]
      );
    }
    console.log(`  ${monthly.length} monthly reflection(s) migrated.`);

    console.log('\nDone! Your old conversations should now show up in History.');
  } finally {
    await pg.end();
    sqlite.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
