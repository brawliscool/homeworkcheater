import { NextResponse } from "next/server";

type SolveInput = { question?: unknown; images?: unknown; previousQuestion?: unknown; previousAnswer?: unknown };

const MAX_IMAGES = 3;
const MAX_IMAGE_DATA_LENGTH = 6_000_000;
const MAX_BODY_BYTES = 20_000_000;
const imagePattern = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export async function POST(request: Request) {
  const key = process.env.SOLVESHOT_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "AI is not configured yet. Set SOLVESHOT_API_KEY (or OPENAI_API_KEY) in the server environment." }, { status: 503 });
  }

  let input: SolveInput;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "The upload is too large." }, { status: 413 });
    input = JSON.parse(raw) as SolveInput;
    if (!input || typeof input !== "object") throw new Error("Not an object");
  } catch {
    return NextResponse.json({ error: "Invalid request. Try again with a smaller photo." }, { status: 400 });
  }

  const question = typeof input.question === "string" ? input.question.trim().slice(0, 4000) : "";
  const images = Array.isArray(input.images) ? input.images : [];
  if (!question && !images.length) return NextResponse.json({ error: "Add a photo or enter your question." }, { status: 400 });
  if (images.length > MAX_IMAGES || images.some((image) => typeof image !== "string" || image.length > MAX_IMAGE_DATA_LENGTH || !imagePattern.test(image))) {
    return NextResponse.json({ error: "Upload up to 3 JPG, PNG, or WebP images smaller than 4 MB each." }, { status: 400 });
  }

  const previousQuestion = typeof input.previousQuestion === "string" ? input.previousQuestion.slice(0, 1500) : "";
  const previousAnswer = typeof input.previousAnswer === "string" ? input.previousAnswer.slice(0, 5000) : "";
  const useDeepSeek = !process.env.SOLVESHOT_API_KEY && !process.env.OPENAI_API_KEY && Boolean(process.env.DEEPSEEK_API_KEY);
  const endpoint = process.env.SOLVESHOT_API_URL || (useDeepSeek ? "https://api.deepseek.com/chat/completions" : "https://api.openai.com/v1/chat/completions");
  const model = process.env.SOLVESHOT_MODEL || (useDeepSeek ? "deepseek-chat" : "gpt-4o-mini");

  const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } }> = [
    { type: "text", text: question || "Read every question visible in the attached image(s). Explain the solution(s) clearly." },
    ...images.map((url: string) => ({ type: "image_url" as const, image_url: { url, detail: "high" as const } })),
  ];

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are SolveShot AI, a careful, friendly tutor for high-school and college students. Read uploaded photos carefully, including handwriting, equations, diagrams, and multiple-choice options. Identify each question, give the correct answer, then show accurate, concise, numbered reasoning steps and a final verification when possible. If text or an image is unclear, explain exactly what is unclear instead of guessing. For multiple questions, clearly separate their answers. Respond in readable plain text. Help students learn rather than pretend to have performed school submissions." },
          ...(previousQuestion && previousAnswer ? [{ role: "assistant", content: `Prior question: ${previousQuestion}\nPrior explanation: ${previousAnswer}` }] : []),
          { role: "user", content: userContent },
        ],
        max_tokens: 2200,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(50000),
      cache: "no-store",
    });
    if (!upstream.ok) {
      console.error("SolveShot AI provider error", upstream.status);
      return NextResponse.json({ error: upstream.status === 429 ? "The AI is busy. Try again shortly." : "The AI provider could not process this question. Confirm the selected model supports images if you're uploading photos." }, { status: upstream.status === 429 ? 429 : 502 });
    }
    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    const answer = typeof content === "string" ? content.trim() : "";
    if (!answer) return NextResponse.json({ error: "The AI did not return an answer. Please try again." }, { status: 502 });
    return NextResponse.json({ answer, model }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("SolveShot AI request failure", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "The AI request timed out or could not connect. Try again." }, { status: 502 });
  }
}
