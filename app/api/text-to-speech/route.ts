import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { text, voiceId } = await request.json();

  if (!text || !voiceId) {
    return NextResponse.json(
      { error: "Missing text or voiceId" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY not configured");
    return NextResponse.json(
      { error: "TTS service unavailable" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
        // ElevenLabs flash is usually <3s; 15s is a safe upper bound
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`ElevenLabs error (${response.status}):`, error);
      return NextResponse.json(
        { error: `ElevenLabs error: ${error.substring(0, 200)}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    console.error("TTS request error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
