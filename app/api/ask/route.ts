import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const modalRes = await fetch("https://westbchris--rag-deepseek-gpu-streamanswer.modal.run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!modalRes.body) {
    return new Response("No body from Modal", { status: 500 });
  }

  return new Response(modalRes.body, {
    headers: {
      "Content-Type": "text/plain"
      
    },
  });
}
