// /app/api/getSessionMessages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMcpClient } from "@/infrastructure/mcp/McpClient";

// Question/Answer model
export type QAEntry = {
  question: string;
  answer: string;
  timestamp: string;
};

// Session Data model
export type SessionData = {
  id: string;
  number_session: string;
  q_and_a: QAEntry[];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("uid");
    const number_session = searchParams.get("sessionId");

    if (!id || !number_session) {
      return NextResponse.json({ error: "Missing uid or sessionId" }, { status: 400 });
    }
    // MCP callToll
    const mcp = await getMcpClient();
    const response = await mcp.callTool({
      name: "get-session-data",
      arguments: { id, number_session },
    });

    const content = response?.content;
    if (!Array.isArray(content) || content.length === 0) {
      return NextResponse.json({ error: "No content returned from MCP" }, { status: 404 });
    }

    const firstBlock = content[0];
    
    // Responce from MCP
    let data: any;
    if (firstBlock.type === "json") {
      data = firstBlock.json;
    } else if (firstBlock.type === "text") {
      try {
        data = JSON.parse(firstBlock.text);
      } catch {
        return NextResponse.json({ error: "Failed to parse MCP response" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Invalid content type from MCP" }, { status: 500 });
    }
    
    if (!data.success) {
      return NextResponse.json({ error: data.error || "Session not found", q_and_a: [] }, { status: 404 });
    }

    const sessionData: SessionData = {
      id,
      number_session,
      q_and_a: ((data.q_and_a ?? data.session?.q_and_a ?? []) as QAEntry[])
        .filter((entry) => entry.question && entry.answer)
        .map((entry) => ({
          question: entry.question,
          answer: entry.answer,
          timestamp: entry.timestamp
            ? new Date(entry.timestamp).toISOString()
            : new Date().toISOString(),
        })),
    };

    return NextResponse.json(sessionData);
  } catch (err) {
    console.error("Error fetching session data:", err);
    return NextResponse.json({ error: "Failed to fetch session data" }, { status: 500 });
  }
}
