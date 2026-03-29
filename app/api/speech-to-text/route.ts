import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 501 }
    );
  }

  const openai = new OpenAI();

  const formData = await request.formData();
  const audioFile = formData.get("audio") as File;

  if (!audioFile) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  // Reject tiny files — they're just silence/noise
  if (audioFile.size < 5000) {
    return NextResponse.json({ text: "" }, { status: 200 });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    // If Whisper can't process it (too short, corrupt, etc.), return empty
    const message = err instanceof Error ? err.message : "Transcription failed";
    console.error("Whisper error:", message);

    // Return empty text instead of 500 for audio-quality issues
    if (message.includes("audio") || message.includes("short") || message.includes("format")) {
      return NextResponse.json({ text: "" }, { status: 200 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
