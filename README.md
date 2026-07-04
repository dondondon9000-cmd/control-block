# Control Block

A private conversational AI journal. Talk to a glowing neuron-style sphere by voice or text — it listens, reflects, tags your emotions and themes, and helps you build a picture of your patterns over time.

This is a standalone app. It doesn't depend on anything else and isn't part of a larger system (yet).

## What's here

- **Talk** — the main page. Animated 3D sphere (React Three Fiber) that reacts to listening/thinking/speaking, speaks its replies aloud. Voice input via the browser's built-in speech recognition, or type.
- **Onboarding** — first-run flow: "What should your future look like?" → reflection → obstacles → a generated growth plan.
- **History** — every past conversation, searchable, click one to keep talking in it.
- **Insights** — emotional trend chart, calendar of daily emotional themes, most repeated worries/goals/relationship themes, a linked-topics map, and progress toward your stated vision.
- **Weekly / Monthly** — one-click AI-generated reflections summarizing the period.

## Stack

- Next.js (App Router) + Tailwind CSS
- React Three Fiber / Three.js for the sphere
- Postgres (via the standard `pg` driver) — works with any Postgres host: Vercel's Neon-backed Postgres integration, Supabase, Neon directly, or a local instance for development
- Claude Haiku (`claude-haiku-4-5`) via `@anthropic-ai/sdk` for conversation, tagging, and summaries
- Recharts for the trend chart
- Passcode-gated single-user auth (signed cookie via `jose`)

## Deploying (Vercel + Postgres)

This is meant to be deployed for real — a single hosted URL you can open from your phone or your computer, with one shared database either way.

1. **Add Postgres storage in Vercel**: open your Vercel project → **Storage** tab → **Create Database** → Postgres. Vercel provisions it (backed by Neon) and automatically adds a `DATABASE_URL` environment variable to your project — no manual connection string copying.
2. **Add the other three environment variables** in Vercel's project settings (Settings → Environment Variables):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   CONTROL_BLOCK_PASSCODE=pick-one
   AUTH_SECRET=some-long-random-string
   ```
3. **Redeploy.** The database schema is created automatically on first request — no migration step to run.
4. Open the `*.vercel.app` URL Vercel gives you from any device, enter the passcode, and you're in.

## Running it locally

For local development, point at the *same* Postgres database Vercel is using (copy the `DATABASE_URL` value from Vercel's dashboard into your local `.env`) so your local runs and phone/deployed runs share one journal instead of two separate ones. A local Postgres also works fine if you'd rather keep dev data separate.

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...       # your Anthropic API key
CONTROL_BLOCK_PASSCODE=pick-one    # the passcode you'll type to open the app
AUTH_SECRET=some-long-random-string
DATABASE_URL=postgres://...        # same DB as your deployment, or a local Postgres
```

Then:

```bash
npm run dev
```

Open http://localhost:3000 — you'll land on the passcode screen, then onboarding the first time.

For a production-style local run: `npm run build && npm start`.

## Data & privacy

- Everything lives in your own Postgres database — one you provisioned, that only you have credentials to. Nothing is synced anywhere else except the Claude API calls needed to generate replies, tags, and summaries.
- There is no analytics, no third-party tracking, no data resale. This app talks to exactly two external services: your Postgres host, and the Anthropic API (which only receives what's needed to respond to your current message or generate a summary).
- Auth is a single shared passcode (this is a personal, single-user app, not a multi-tenant product) — enough to keep it from being casually opened by anyone who finds the URL, not meant to withstand a determined attacker.

## Notes on cost

Each chat turn and each weekly/monthly summary is one Claude Haiku call. There's no per-message extra call for tagging — the model returns the conversational reply and the emotion/topic tags together in a single structured tool call, so tagging is free with the reply. Vercel's free tier and most Postgres free tiers comfortably cover personal use.

## Known limitations (prototype)

- "Linked topics" is a simple co-occurrence map (topics tagged together in the same message), not a semantic clustering model — good enough to spot patterns, not a research tool.
- No anonymous pattern learning, no data sharing — intentionally not built yet per the original spec.
