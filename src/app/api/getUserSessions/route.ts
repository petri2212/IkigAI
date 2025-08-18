import { NextRequest, NextResponse } from "next/server";
import { getMcpClient } from "@/infrastructure/mcp/McpClient";

// Session Data model
export type Session = {
  id: string;
  number_session: string;
  createdAt: string;
  path: string;
  q_and_a: {
    question: string;
    answer: string;
    timestamp: string;
  }[];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    if (!uid) return NextResponse.json({ error: "Missing UID" }, { status: 400 });

    // MCP
    const mcp = await getMcpClient();
    const response = await mcp.callTool({
      name: "get-all-user-sessions",
      arguments: { id: uid },
    });

    const content = Array.isArray(response?.content) ? response.content : [];

    const sessions: Session[] = content
      .map((block) => {
        try {
          return JSON.parse(block.text);
        } catch {
          return null;
        }
      })
      .filter((s): s is Session => s !== null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Error fetching sessions:", err);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

