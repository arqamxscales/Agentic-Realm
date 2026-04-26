# GitHub setup

## Recommended first commit

```bash
git add .
git commit -m "Initial Agentic Nexus build"
```

## Recommended remote setup

```bash
git remote add origin https://github.com/<your-org-or-username>/agentic-nexus.git
git push -u origin main
```

## What to keep private

- `.env.local`
- Supabase service role keys
- OpenAI API keys
- Any other deployment secrets
