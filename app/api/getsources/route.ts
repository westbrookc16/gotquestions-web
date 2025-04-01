import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    const { question } = await req.json();

    const modalRes = await fetch(
        `https://westbchris--rag-deepseek-gpu-getsources.modal.run?question=${encodeURIComponent(question)}`,
        {
            headers: {
                "x-api-key": process.env.API_KEY || "", // don't expose with NEXT_PUBLIC
            },
        }
    );

    const json = await modalRes.json();
    return NextResponse.json(json);
};
