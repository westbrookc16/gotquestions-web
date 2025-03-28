export async function POST(req: Request) {
  const { text } = await req.json();

  const response = await fetch("https://westbchris--speech-api-synthesize-speech.modal.run", {
    method: "POST",
    body: JSON.stringify({ text }),
    headers: { "Content-Type": "application/json" },
  });

  const audioBuffer = await response.arrayBuffer();

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}
