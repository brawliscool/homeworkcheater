# SolveShot AI

A mobile-first AI homework-solving website. **This is a reconstructed, independently maintainable implementation based on the published SolveShot AI interface, not an exact export of the original ChatGPT Sites source code.** The original Site remains at https://solveshot-ai.jmoney69420.chatgpt.site.

## Features

- Take a homework photo on a phone, select screenshots, or drag and drop up to three images.
- Enter a text question or ask a follow-up after a solution.
- Step-by-step answers for math, science, English, history, and other subjects using a configurable vision-capable AI model.
- Browser-local solution history (no account or server-side saved history).
- Responsive dark/purple layout with accessible desktop and mobile navigation.
- API credentials stay on the server; images are sent to the chosen AI provider only when the user submits a question.

## Run locally

```sh
npm ci
cp .env.example .env.local
# Edit .env.local and add your API key
npm run dev
```

Visit http://localhost:3000.

## Environment

Set `SOLVESHOT_API_KEY` or `OPENAI_API_KEY` (server-side, never `NEXT_PUBLIC_`).

- `SOLVESHOT_API_KEY` — API key for your OpenAI-compatible provider (recommended).
- `SOLVESHOT_API_URL` — full chat completions URL; default `https://api.openai.com/v1/chat/completions`.
- `SOLVESHOT_MODEL` — vision-capable model ID; default `gpt-4o-mini` for OpenAI.
- `OPENAI_API_KEY` — alternative to `SOLVESHOT_API_KEY` for OpenAI.
- `DEEPSEEK_API_KEY` — optional text model fallback; for image uploads use a provider and model that explicitly support image inputs.

Example using OpenAI:

```
OPENAI_API_KEY=your_key_here
SOLVESHOT_MODEL=gpt-4o-mini
```

The API will return an actionable configuration error if no key is set. Keys are never exposed to browser JavaScript or committed to this repository.

## Testing

```sh
npm run build
npm run lint
```

Try a text question and a JPG screenshot to verify that the configured model responds. No paid AI call is made as part of a build or lint run.

## Deployment and security notes

Provide the same server-side environment variables in your hosting provider. **Before opening a paid API to the general public, add durable rate limiting, user authentication, usage quotas, provider-spend alerts, and a privacy policy.** The demonstration is not a monetized subscription system; the Free Plan label is visual only. History is intentionally limited to the current browser/device. API photos are sent to the configured third-party provider; consult that provider's data retention policy.

## Migration provenance

- Source design reference: published SolveShot AI Site at `solveshot-ai.jmoney69420.chatgpt.site`, with source-text projection supplied by the user's ChatGPT library.
- Existing repository `brawliscool/homeworkcheater` was preserved in a backup branch before reconstruction.
- The original ChatGPT Sites database, uploads and other backend state were **not** imported.
