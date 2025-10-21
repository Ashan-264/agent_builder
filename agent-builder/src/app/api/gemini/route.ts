import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      systemInstruction,
      systemPrompt, // Keep for backward compatibility
      userMessage,
      temperature,
      maxOutputTokens,
      topK,
    } = await request.json();

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Parse optional parameters with defaults
    const parsedTemperature = temperature ? parseFloat(temperature) : 0.7;
    const parsedMaxOutputTokens = maxOutputTokens
      ? parseInt(maxOutputTokens)
      : 1024;
    const parsedTopK = topK ? parseInt(topK) : 40;

    // Use systemInstruction if provided, otherwise fall back to systemPrompt
    const instruction = systemInstruction || systemPrompt;

    // Build request body
    const requestBody: {
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: {
        temperature: number;
        topK: number;
        topP: number;
        maxOutputTokens: number;
      };
      systemInstruction?: { parts: Array<{ text: string }> };
    } = {
      contents: [
        {
          parts: [
            {
              text: userMessage,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: parsedTemperature,
        topK: parsedTopK,
        topP: 0.95,
        maxOutputTokens: parsedMaxOutputTokens,
      },
    };

    // Add system instruction if provided
    if (instruction) {
      requestBody.systemInstruction = {
        parts: [{ text: instruction }],
      };
    }

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: "Gemini API error", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const output =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated";

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
