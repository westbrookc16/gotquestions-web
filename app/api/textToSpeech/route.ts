export async function POST(req: Request) {
  const { text, voice } = await req.json();

  const response = await fetch(
    "https://gotquestions-web-backend.fly.dev/speech/synthesize_speech",
    {
      method: "POST",
      body: JSON.stringify({ text, voice }),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.API_KEY || "",
      },
    }
  );

  const audioBuffer = await response.arrayBuffer();

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}
