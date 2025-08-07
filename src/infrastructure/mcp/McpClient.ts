import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const mcp = new Client(
  { name: "server-client", version: "1.0.0" },
  {
    capabilities: { sampling: {} },
  }
);

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/interfaces/server.ts"],
  stderr: "ignore",
});

let connected = false;

/**
 * Singleton con connessione lazy
 */
export const getMcpClient = async () => {
  if (!connected) {
    await mcp.connect(transport);
    connected = true;
  }
  return mcp;
};
