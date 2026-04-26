# Agentic Nexus

Agentic Nexus is a multi-domain AI web app built with Next.js, Tailwind, Supabase, and OpenAI.

It delivers six specialist agents in one white/yellow/blue interface and supports both chat and browser voice interaction.

## Core value

- One product for 6 high-value domains
- Auto-route or manual routing to specialist agents
- Authenticated cloud chat persistence with Supabase
- Browser voice input/output for conversational workflows
- Full multi-thread sidebar: list/create/switch conversation threads

## Domain agents

1. Economics
2. Finance
3. Technology
4. Medical
5. Law
6. Media

## Cloud persistence (implemented)

Signed-in users now get persistent history:

- Conversation rows saved in `public.conversations`
- Message rows saved in `public.messages`
- Latest signed-in history loaded on session start
- Continuation of conversation via stored `conversationId`

Main persistence flow:

- Client sends chat request to `/api/chat`
- Server generates model response
- If authenticated, server inserts user + assistant turns into Supabase
- Client receives `conversationId` and continues same thread
- Client fetches saved history from `/api/chat/history`

## Tech stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- OpenAI Chat Completions API
- Vercel-ready deployment

## Repository info

- Recommended repo name: `agentic-nexus`
- Recommended description: Multi-domain AI agent web app with chat and browser voice assistants for economics, finance, technology, medical, law, and media.

## Project structure

- `src/app` – routes, API handlers, pages
- `src/components` – UI and interaction components
- `src/lib` – agent routing, OpenAI, Supabase helpers
- `supabase/migrations` – SQL schema and policies
- `.github/workflows` – CI pipeline
- `docs` – case study, API reference, setup guides

## Environment variables

Copy `.env.example` to `.env.local` and fill:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Local development

1. Install dependencies
2. Set `.env.local`
3. Run app

```bash
npm install
npm run dev
```

## Database setup

Run migration in Supabase SQL editor:

- `supabase/migrations/20260426_initial.sql`

This creates:

- `profiles`
- `conversations`
- `messages`
- RLS policies for owner-only access
- User profile trigger on signup

## Deployment (Vercel)

1. Import repository into Vercel
2. Add environment variables
3. Deploy

Recommended post-deploy checks:

- Magic link sign-in works
- Chat response works
- Signed-in conversation reload works

## Security notes

- API keys are not committed
- `.env.local` is ignored by Git
- Supabase RLS restricts data to owner

## Documentation

- Case study: [docs/CASE_STUDY.md](docs/CASE_STUDY.md)
- API reference: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
- Repo setup: [docs/REPO_SETUP.md](docs/REPO_SETUP.md)
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)

## User case study (summary)

A consulting team handling cross-domain requests uses Agentic Nexus to avoid context switching between tools.

Result:

- faster first drafts,
- consistent domain-specific responses,
- persistent authenticated history for continuity,
- less friction in multi-role handoffs.

Full version in [docs/CASE_STUDY.md](docs/CASE_STUDY.md).

## License

MIT. See [LICENSE](LICENSE).
