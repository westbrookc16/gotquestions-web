import  Request from 'next' // Import types from Next.js
import Response from "next";
import axios from "axios";
import { NextRequest,NextResponse } from "next/server";

export async function POST(req:Request) {
    if (req.method !== "POST") {
        return NextResponse.json({ error: "Invalid method" },{"status":500});
    }
console.log(req.body);
    const { text } =  await req.json();
    if (!text) {
        return NextResponse.json({ error: "Text is required" },{"status":400});
    }

    try {
        const apiKey = process.env.OPENAI_API_KEY; // Set this in your .env.local file

        const response = await axios.post(
            "https://api.openai.com/v1/audio/speech",
            {
                model: "gpt-4o-mini-tts", // Choose model (use "tts-1-hd" for higher quality)
                input: text,
                voice: "alloy", // Other voices: echo, fable, onyx, nova, shimmer
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                responseType: "arraybuffer", // Important to receive audio data
            }
        );

        const headers="Content-Type:audio/mpeg";
        //res.setHeader("Content-Type", "audio/mpeg");
        //res.send(response.data);
        //res.headers.append("Content-Type", "audio/mpeg");
        return new NextResponse(response.data, { headers: { "Content-Type": "audio/mpeg" } });
    } catch (error) {
        console.error("Error fetching audio:", error);
        //res.status(500).json({ error: "Failed to generate speech" });
    }
}
