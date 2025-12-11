This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your DeepSeek credentials

Create a `.env.local` file in the project root and add your API key. The server reads the variables at build/start time.

```bash
DEEPSEEK_API_KEY=sk-your-key-here
# Optional overrides
# DEEPSEEK_API_URL=https://api.deepseek.com/v3.2_speciale_expires_on_20251215
# DEEPSEEK_MODEL=deepseek-v3.2_speciale_expires_on_20251215
```

> ⚠️ Never commit `.env.local` or share your real key publicly.

### 3. Run the development server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to use HomeworkHelper. Type a homework question (or add screenshots) and the app will call the `/api/solve` endpoint, which proxies the request to DeepSeek and streams back a step-by-step solution.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### 4. (Optional) Test the API route directly

```bash
curl -X POST http://localhost:3000/api/solve \
  -H "Content-Type: application/json" \
  -d '{"question":"Explain how to solve 2x + 5 = 15"}'
```

You should receive a JSON payload containing the generated answer.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
