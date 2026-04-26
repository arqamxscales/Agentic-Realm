# Contributing

Thanks for contributing to Agentic Nexus.

## Local workflow

1. Install dependencies with `npm install`
2. Configure `.env.local` from `.env.example`
3. Run development server with `npm run dev`
4. Run production check with `npm run build`

## Pull request checklist

- Keep changes scoped and minimal
- Preserve secret hygiene (`.env.local` must never be committed)
- Ensure `npm run build` passes
- Update docs if behavior changes

## Coding standards

- Use TypeScript strict mode
- Keep server logic in API routes or server helpers
- Keep browser-only logic in client components
