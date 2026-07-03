# Control Block

A private conversational AI journal. Talk to a glowing neuron-style sphere by voice or text — it listens, reflects, tags your emotions and themes, and helps you build a picture of your patterns over time.

This is a standalone app. It doesn't depend on anything else and isn't part of a larger system (yet).

## What's here

- **Talk** — the main page. Animated 3D sphere (React Three Fiber) that reacts to listening/thinking/speaking. Voice input via the browser's built-in speech recognition, or type.
- **Onboarding** — first-run flow: "What should your future look like?" → reflection → obstacles → a generated growth plan.
- **History** — every past conversation, searchable, click one to keep talking in it.
- **Insights** — emotional trend chart, calendar of daily emotional themes, most repeated worries/goals/relationship themes, a linked-topics map, and progress toward your stated vision.
- **Weekly / Monthly** — one-click AI-generated reflections summarizing the period.

## Stack

- Next.js (App Router) + Tailwind CSS
- React Three Fiber / Three.js for the sphere
- SQLite (via `better-sqlite3`) — a single local file, no external database
- Claude Haiku (`claude-haiku-4-5`) via `@anthropic-ai/sdk` for conversation, tagging, and summaries
- Recharts for the trend chart
- Passcode-gated single-user auth (signed cookie via `jose`)

## Running it locally

This is built to run on your own machine — the SQLite file lives in `data/` right next to the code, nothing to host or configure beyond an API key.

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...       # your Anthropic API key
CONTROL_BLOCK_PASSCODE=pick-one    # the passcode you'll type to open the app
AUTH_SECRET=some-long-random-string
```

Then:

```bash
npm run dev
```

Open http://localhost:3000 — you'll land on the passcode screen, then onboarding the first time.

For a production-style run: `npm run build && npm start`.

## Data & privacy

- Everything is stored in a single SQLite file at `data/control-block.db` on your machine. Nothing is synced anywhere except the Claude API calls needed to generate replies, tags, and summaries.
- `data/` is gitignored — your journal never gets committed or pushed.
- There is no analytics, no third-party tracking, no data resale. This app talks to exactly one external service: the Anthropic API, and only sends it what's needed to respond to your current message or generate a summary.
- Auth is a single shared passcode (this is a personal, single-user app, not a multi-tenant product) — enough to keep it from being casually opened by anyone with access to your machine, not meant to withstand real attackers if you expose this beyond localhost.

## Notes on cost

Each chat turn and each weekly/monthly summary is one Claude Haiku call. There's no per-message extra call for tagging — the model returns the conversational reply and the emotion/topic tags together in a single structured tool call, so tagging is free with the reply.

## Known limitations (prototype)

- SQLite is file-based, so this won't work as-is on serverless hosts like Vercel (the filesystem isn't persistent there). It's meant to run on a normal always-on machine — your own PC, a home server, or a small VPS. Swapping to Postgres later is a small change (`lib/db.js` is the only place with real SQL).
- "Linked topics" is a simple co-occurrence map (topics tagged together in the same message), not a semantic clustering model — good enough to spot patterns, not a research tool.
- No anonymous pattern learning, no data sharing — intentionally not built yet per the original spec.
