import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

// Configure the route to use Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 60;

// Initialize Pinecone client
const getPineconeClient = () => {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not configured");
  }
  return new Pinecone({ apiKey });
};

// Generate embeddings using Pinecone's Inference API with llama-text-embed-v2 (1024 dimensions)
const generateEmbedding = async (text: string): Promise<number[]> => {
  const pc = getPineconeClient();

  // Use Pinecone's embed method with llama-text-embed-v2 model
  const embeddings = await pc.inference.embed("llama-text-embed-v2", [text], {
    inputType: "passage",
  });

  // Access the first embedding's values - check for dense vector type
  const embeddingData = embeddings.data?.[0];
  if (!embeddingData) {
    throw new Error("Failed to generate embedding");
  }

  // Handle dense embeddings
  if (embeddingData.vectorType === "dense" && "values" in embeddingData) {
    return embeddingData.values;
  }

  throw new Error("Unexpected embedding format");
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "embed") {
      // ===== EMBEDDING GENERATOR =====
      const { text, source, info, tag, workflow, nodeId } = body;

      if (!text) {
        return NextResponse.json(
          { error: "Text is required for embedding" },
          { status: 400 }
        );
      }

      const pc = getPineconeClient();
      const indexName = process.env.PINECONE_INDEX_NAME || "agent-builder";

      console.log(
        "📝 Generating embedding for text:",
        text.substring(0, 100) + "..."
      );

      // Generate embedding using llama-text-embed-v2 (1024 dimensions)
      const embedding = await generateEmbedding(text);

      console.log("✅ Embedding generated, dimension:", embedding.length);

      // Prepare metadata
      const metadata: Record<string, string> = {
        text: text.substring(0, 40000), // Pinecone has metadata size limits
        nodeId: nodeId || "unknown",
        timestamp: new Date().toISOString(),
      };

      // Add optional metadata fields
      if (source) metadata.source = source;
      if (info) metadata.info = info;
      if (tag) metadata.tag = tag;
      if (workflow) metadata.workflow = workflow;

      // Generate unique ID
      const id = `emb_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log("💾 Storing embedding in Pinecone with ID:", id);

      // Store in Pinecone
      const index = pc.index(indexName);
      await index.upsert([
        {
          id,
          values: embedding,
          metadata,
        },
      ]);

      console.log("✅ Embedding stored successfully");

      return NextResponse.json({
        success: true,
        id,
        dimension: embedding.length,
        metadata,
        message: "Embedding created and stored in Pinecone",
      });
    } else if (action === "search") {
      // ===== SIMILARITY SEARCH =====
      const { query, topK } = body;

      if (!query) {
        return NextResponse.json(
          { error: "Query is required for similarity search" },
          { status: 400 }
        );
      }

      const pc = getPineconeClient();
      const indexName = process.env.PINECONE_INDEX_NAME || "agent-builder";
      const topKResults = parseInt(topK) || 5;

      console.log("🔍 Searching for:", query);
      console.log("📊 Top K:", topKResults);

      // Generate query embedding using llama-text-embed-v2 (1024 dimensions)
      const queryEmbedding = await generateEmbedding(query);

      console.log(
        "✅ Query embedding generated, dimension:",
        queryEmbedding.length
      );

      // Search Pinecone
      const index = pc.index(indexName);
      const searchResults = await index.query({
        vector: queryEmbedding,
        topK: topKResults,
        includeMetadata: true,
        includeValues: false,
      });

      console.log(
        "✅ Search completed, found:",
        searchResults.matches?.length || 0,
        "results"
      );

      // Format results
      const matches =
        searchResults.matches?.map((match) => ({
          id: match.id,
          score: match.score,
          text: match.metadata?.text || "",
          source: match.metadata?.source || "",
          info: match.metadata?.info || "",
          tag: match.metadata?.tag || "",
          workflow: match.metadata?.workflow || "",
          nodeId: match.metadata?.nodeId || "",
          timestamp: match.metadata?.timestamp || "",
        })) || [];

      return NextResponse.json({
        success: true,
        query,
        topK: topKResults,
        resultsCount: matches.length,
        matches,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'embed' or 'search'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in Pinecone API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Pinecone operation failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
