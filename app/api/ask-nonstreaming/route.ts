import { NextRequest, NextResponse } from "next/server";
import { modalFetch } from "@/app/utils/modal";
export const POST = async (req: NextRequest) => {
  const { question } = await req.json();
  const response = await modalFetch(
    "https://westbchris--rag-deepseek-gpu-nonstreaminganswer.modal.run",
    JSON.stringify({
      question,
    })
  );
  if (!response.ok) {
    return NextResponse.json(
      { error: "There was an error hitting modal api." },
      { status: 500 }
    );
  }
  const data = await response.json();
  return NextResponse.json(data);
};
