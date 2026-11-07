# SolveShot AI

A mobile-first homework solver based on the active SolveShot AI site's design and text. It replaces the former HomeworkHelper frontend in this repository.

**Important:** This is a faithful reimplementation from the available site description and concept art, not an export of the ChatGPT Sites project's original source code.

## Features

- Take a photo on iPhone or Android, upload screenshots, or drag and drop homework images.
- Client-side photo compression for serverless hosting limits.
- AI vision solving with detailed steps and follow-up questions.
- Math, science, English, history, and other subjects.
- Local browser question history, with reopen and delete.
- Responsive dark-purple UI with Home, History, and Profile tabs.

## Setup

1. Install Node.js 20.9 or newer.
2. Run npm ci.
3. Copy .env.example to .env.local and set OPENAI_API_KEY.
4. Run npm run dev; open http://localhost:3000.

Environment variables:
- OPENAI_API_KEY: required server-only secret.
- AI_API_URL: optional OpenAI-compatible chat completions endpoint. Default: https://api.openai.com/v1/chat/completions
- AI_MODEL: optional vision-capable model. Default: gpt-4o-mini
- AI_API_KEY: optional alias for OPENAI_API_KEY.

On Vercel, set the API key in the project environment variables before deploying. Without a configured key, the solver intentionally shows a clear configuration error.

## Privacy and limits

Photos are sent to the configured third-party AI service to solve questions. Photos are not stored in the browser's history. Up to 40 text question-and-answer records are kept in localStorage on the device, without server-side account sync. No payments, free tier, or subscriptions are simulated. API usage is billed to the key owner according to the AI provider's rates.
