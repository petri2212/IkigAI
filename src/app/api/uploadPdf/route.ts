import { NextResponse } from "next/server";
import { getMcpClient } from "@/infrastructure/mcp/McpClient";

export async function POST(req: Request) {
  try {
    const { id, base64pdf, session } = await req.json();

    // MCP
    const mcp = await getMcpClient();
    const result = await mcp.callTool({
      name: "save-pdf-to-mongo",
      arguments: {
        id,
        pdf: base64pdf,
        session,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("MCP Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
