import { NextResponse, NextRequest } from "next/server";
import { Stagehand } from "@browserbasehq/stagehand";

// Configure the route to use Node.js runtime and increase timeout
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    const { url, instruction } = await request.json();

    if (!url || !instruction) {
      return NextResponse.json(
        { success: false, error: "url and instruction are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID not configured",
        },
        { status: 500 }
      );
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY not configured",
        },
        { status: 500 }
      );
    }

    // Initialize Stagehand with Browserbase
    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: apiKey,
      projectId: projectId,
      enableCaching: false,
      modelName: "google/gemini-2.0-flash-exp",
      modelClientOptions: {
        apiKey: geminiApiKey,
      },
      verbose: 1,
    });

    await stagehand.init();
    const page = stagehand.page;

    // Navigate to the URL
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract data using the instruction
    const result = await page.extract({
      instruction: instruction,
    });

    await stagehand.close();

    return NextResponse.json({
      success: true,
      url: url,
      instruction: instruction,
      data: result,
    });
  } catch (error) {
    console.error("Error scraping website:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Web scraping failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
