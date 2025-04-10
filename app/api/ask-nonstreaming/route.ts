import { NextRequest, NextResponse } from "next/server";
import { modalFetch } from "@/app/utils/modal";
export const POST = async (req: NextRequest) => {
  const { question } = await req.json();
  const response = await modalFetch(
    "https://gotquestions-web-backend.fly.dev/ask",
    JSON.stringify({
      question,
    })
  );
  if (!response.ok) {
    console.log("Error in response:", response.status, response.statusText);
    return NextResponse.json(
      { error: "There was an error hitting api." },
      { status: 500 }
    );
  }
  const data = await response.json();
  return NextResponse.json(data);
};
