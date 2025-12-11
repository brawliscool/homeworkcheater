import { NextResponse } from "next/server";

const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL ??
  "https://api.deepseek.com/v3.2_speciale_expires_on_20251215";
const DEFAULT_MODEL =
  process.env.DEEPSEEK_MODEL ?? "deepseek-v3.2_speciale_expires_on_20251215";

type SolveRequest = {
  question?: string;
};

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "DeepSeek API key is not configured on the server." },
      { status: 500 }
    );
  }

  let payload: SolveRequest;

  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body.", details: (error as Error).message },
      { status: 400 }
    );
  }

  const question = payload.question?.trim();

  if (!question) {
    return NextResponse.json(
      { error: "Please provide a question to solve." },
      { status: 400 }
    );
  }

  const completionResponse = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are HomeworkHelper, an AI tutor that explains every answer step-by-step.",
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!completionResponse.ok) {
    const errorDetails = await completionResponse.text();
    return NextResponse.json(
      {
        error: "DeepSeek API error.",
        details: errorDetails || completionResponse.statusText,
      },
      { status: completionResponse.status }
    );
  }

  const completionJson = await completionResponse.json();
  const answer =
    completionJson?.choices?.[0]?.message?.content?.trim() ??
    completionJson?.choices?.[0]?.text?.trim();

  if (!answer) {
    return NextResponse.json(
      { error: "DeepSeek did not return an answer." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    answer,
    usage: completionJson?.usage,
  });
}
