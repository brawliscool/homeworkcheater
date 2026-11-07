import { NextResponse } from "next/server";
export const runtime = "nodejs";
const maxBody = 4100000;
function fail(error: string, status: number) { return NextResponse.json({error}, {status}); }
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return fail("AI is not configured. Set OPENAI_API_KEY in server environment variables.", 503);
  if (Number(request.headers.get("content-length") || 0) > maxBody) return fail("Request too large. Use fewer photos.", 413);
  let payload: {question?:unknown;images?:unknown;context?:unknown};
  try {
    const raw = await request.text();
    if (raw.length > maxBody) return fail("Request too large. Use fewer photos.", 413);
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return fail("Invalid request.",400);
  } catch { return fail("Invalid request body.",400); }
  if (payload.question !== undefined && typeof payload.question !== "string") return fail("Question must be text.",400);
  const question = (payload.question as string || "").trim();
  if (question.length > 6000) return fail("Question too long.",400);
  const images = payload.images === undefined ? [] : payload.images;
  if (!Array.isArray(images) || images.length > 3) return fail("Upload up to 3 photos.",400);
  if (!question && !images.length) return fail("Add a question or photo.",400);
  for (const image of images) {
    if (typeof image !== "string" || image.length > 1300000 || !/^data:image\/(?:jpeg|png|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(image)) return fail("An image is invalid or too large.",400);
  }
  const ctx = payload.context && typeof payload.context === "object" && !Array.isArray(payload.context) ? payload.context as {question?:unknown;answer?:unknown} : null;
  const oldQuestion = typeof ctx?.question === "string" ? ctx.question.slice(0, 2000) : "";
  const oldAnswer = typeof ctx?.answer === "string" ? ctx.answer.slice(0, 5000) : "";
  const contents = [{type:"text", text:question || "Read the homework photo and explain how to solve it."}, ...images.map((url: string) => ({type:"image_url", image_url:{url,detail:"auto"}}))];
  const messages: {role:string;content:unknown}[] = [{role:"system",content:"You are SolveShot AI, a patient and accurate tutor for high school and college students. Read photographed homework carefully, solve problems step by step, show calculations and reasoning, explain concepts clearly, acknowledge unclear images, and never invent unseen text. Use concise numbered steps."}];
  if (oldQuestion && oldAnswer) { messages.push({role:"user",content:oldQuestion}); messages.push({role:"assistant",content:oldAnswer}); }
  messages.push({role:"user",content:contents});
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),45000);
  try {
    const res = await fetch(process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer " + apiKey},
      body:JSON.stringify({model:process.env.AI_MODEL || "gpt-4o-mini",messages,max_tokens:2200,temperature:0.2}),
      signal:controller.signal,cache:"no-store"
    });
    if (!res.ok) {
      if (res.status === 429) return fail("AI usage limit reached or provider busy. Try again shortly.",429);
      if (res.status === 401 || res.status === 403) return fail("The AI provider rejected the server API key.",502);
      return fail("AI provider could not complete the request.",502);
    }
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return fail("The provider returned no answer.",502);
    return NextResponse.json({answer:answer.trim()},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return fail("The AI service timed out. Try again.",504);
    return fail("Could not contact the AI service.",502);
  } finally { clearTimeout(timer); }
}
