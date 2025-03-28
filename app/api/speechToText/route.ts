export async function POST(req: Request) {
  const formData = await req.formData();
  const audioFile = formData.get("audio") as Blob;
  //console.log("audioFile", audioFile);
  const arrayBuffer = await audioFile.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const response = await fetch("https://westbchris--speech-api-transcribe-audio.modal.run", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream", // Important!
    },
    body: bytes,
  });
  /*const response = await fetch("https://westbchris--speech-api-transcribe-audio.modal.run", {
    method: "POST",
    body: audioFile,
  });*/

  const text = await response.text();
  return new Response(JSON.stringify({"text": text }), {
    headers: { "Content-Type": "application/json" },
  });
}
