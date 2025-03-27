//export const runtime = 'nodejs';
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const { text } = await req.json();

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "alloy",
      }),
    });

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS failed:", error);
    return new NextResponse(
      JSON.stringify({ error: "Audio generation failed" }),
      { status: 500 }
    );
  }
}
