# RapidFlow Chatbot

RapidFlow Plumbing Services chatbot deployed with Cloudflare Pages and Cloudflare Pages Functions.

## Files

- `index.html`: chatbot UI
- `functions/api/connect.js`: backend connection check endpoint
- `functions/api/chat.js`: backend OpenAI chat endpoint
- `.env.example`: example secret names
- `.dev.vars.example`: optional local Cloudflare dev secrets example
- `wrangler.toml`: Cloudflare config

## Cloudflare Deployment

1. Push the repository to GitHub.
2. In Cloudflare Pages, connect the repository.
3. Set the production branch to `main`.
4. Leave the build command blank.
5. Add these environment variables / secrets in Cloudflare:

```text
OPENAI_API_KEY=sk-your-real-key-here
OPENAI_MODEL=gpt-4o-mini
6. Deploy the site.
Notes
- Do not commit real secrets.
- GitHub Pages alone is not enough because the OpenAI key must stay server-side.

5. Click:
   `Commit changes...`

6. Use a commit message like:
```text
Add README
