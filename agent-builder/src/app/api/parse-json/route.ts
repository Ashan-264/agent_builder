import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { inputText, jsonSchema } = await request.json();

    if (!inputText || !jsonSchema) {
      return NextResponse.json(
        { error: "inputText and jsonSchema are required." },
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

    // Validate JSON schema
    try {
      JSON.parse(jsonSchema);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON Schema format" },
        { status: 400 }
      );
    }

    // Call Gemini API to parse text according to schema
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract information from the following text and return it as a JSON object that matches this schema:

Schema:
${jsonSchema}

Text to parse:
${inputText}

Return ONLY the JSON object, no explanations or markdown formatting.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        }),
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
    let parsedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No output generated";

    // Clean up the response - remove markdown code blocks if present
    parsedText = parsedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    parsedText = parsedText.trim();

    // Try to parse to validate it's valid JSON
    let parsedJSON;
    try {
      parsedJSON = JSON.parse(parsedText);
    } catch {
      return NextResponse.json(
        {
          error: "Generated output is not valid JSON",
          output: parsedText,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      parsedData: parsedJSON,
      rawOutput: parsedText 
    });
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
