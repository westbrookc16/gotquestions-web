// app/api/text-to-speech/route.ts (App Router)

export async function POST(req: Request) {
  const bytes = new Uint8Array(await req.arrayBuffer());

  const response = await fetch(
    "https://gotquestions-web-backend.fly.dev/speech/transcribe_audio",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-api-key": process.env.API_KEY || "",
      },
      body: bytes,
    }
  );

  const text = await response.text();

  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json" },
  });
}
