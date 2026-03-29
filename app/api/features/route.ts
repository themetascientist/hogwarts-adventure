import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasWhisper: !!process.env.OPENAI_API_KEY,
    hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
  });
}
