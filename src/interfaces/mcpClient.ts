//import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mcp } from "./client";
//let connected = false;
/*
async function ensureConnected() {
  if (!connected) {
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", "src/interfaces/server.ts"],
    });
    await mcp.connect(transport);
    connected = true;
  }
}*/
export async function uploadPdfToMongo(id: string, base64pdf: string) {
  return await mcp.callTool({
    name: "save-pdf-to-mongo",
    arguments: {
      id_unique: id,
      pdf: base64pdf,
    },
  });
}