import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: "description is required." },
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

    // Call Gemini API to generate JSON schema from natural language
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
                  text: `Generate a valid JSON Schema based on this description: "${description}"
                  
Return ONLY the JSON Schema object, no explanations. The schema should be valid JSON Schema (draft-07 format) with:
- type
- properties (with types and descriptions)
- required fields if applicable

Example format:
{
  "type": "object",
  "properties": {
    "fieldName": {
      "type": "string",
      "description": "Field description"
    }
  },
  "required": ["fieldName"]
}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
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
    let schemaText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No schema generated";

    // Clean up the response - remove markdown code blocks if present
    schemaText = schemaText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    schemaText = schemaText.trim();

    // Try to parse to validate it's valid JSON
    try {
      JSON.parse(schemaText);
    } catch {
      return NextResponse.json(
        {
          error: "Generated schema is not valid JSON",
          schema: schemaText,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ schema: schemaText });
  } catch (error) {
    console.error("Error generating schema:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
