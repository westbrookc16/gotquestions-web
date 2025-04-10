import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const modalRes = await fetch("https://gotquestions-web-backend.fly.dev/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.API_KEY || "",
    },
    body: JSON.stringify(body),
  });

  if (!modalRes.ok || !modalRes.body) {
    return new Response("Failed to fetch from Modal", { status: 500 });
  }

  return new Response(modalRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
