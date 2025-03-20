import Response from "next/server";
import Request from "next";
import { NextResponse } from "next/server";
import fs from "fs";
import * as dotenv from "dotenv";
import OpenAI from "openai";




const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {


  try {
    const formData = await req.formData();
    const file = formData.get("file");

    const data = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });




    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.error();
  }
}