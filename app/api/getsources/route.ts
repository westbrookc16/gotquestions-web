import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const { question } = await req.json();

  const modalRes = await fetch(
    `https://gotquestions-web-backend.fly.dev/sources?question=${encodeURIComponent(
      question
    )}`,
    {
      headers: {
        "x-api-key": process.env.API_KEY || "", // don't expose with NEXT_PUBLIC
      },
    }
  );
  if (!modalRes.ok) {
    console.log("Error in response:", modalRes.status, modalRes.statusText);
    return NextResponse.json(
      { error: "There was an error hitting api." },
      { status: 500 }
    );
  }
  const json = await modalRes.json();
  return NextResponse.json(json);
};
