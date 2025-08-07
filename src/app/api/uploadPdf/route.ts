// File: /src/pages/api/uploadPdf.ts
import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const mcp = new Client({ name: "server-client", version: "1.0.0" }, {
  capabilities: { sampling: {} },
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/interfaces/server.ts"],
  stderr: "ignore",
});

let connected = false;

export async function POST(req: Request) {
  try {
    const { id, base64pdf } = await req.json();

    if (!connected) {
      await mcp.connect(transport);
      connected = true;
    }

    const result = await mcp.callTool({
      name: "save-pdf-to-mongo",
      arguments: {
        id_unique: id,
        pdf: base64pdf,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("MCP Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
