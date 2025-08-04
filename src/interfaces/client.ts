import "dotenv/config"
import { input, select , confirm} from "@inquirer/prompts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, jsonSchema, ToolSet } from "ai" // or wherever `generateText` comes from
import {
  CreateMessageRequestSchema,
  Prompt,
  PromptMessage,
  Tool,
} from "@modelcontextprotocol/sdk/types.js"

const mcp = new Client(
  {
    name: "text-client-video",
    version: "1.0.0",
  },
  {
    capabilities: { sampling: {} },
  }
);
console.log("You are connected 1");
const transport = new StdioClientTransport({
  command: "node",
  args: ["build/interfaces/server.js"],
  stderr: "ignore",
  /*
  command: "npx",
  args: ["tsx", "src/interfaces/server.ts"],
  stderr: "ignore",*/

});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY, // or hardcode if testing: "sk-..."
});


async function main() {
  await mcp.connect(transport);
  const [{ tools }, { prompts }, { resources }, { resourceTemplates }] =
    await Promise.all([
      mcp.listTools(),
      mcp.listPrompts(),
      mcp.listResources(),
      mcp.listResourceTemplates(),
    ]);

     mcp.setRequestHandler(CreateMessageRequestSchema, async request => {
    const texts: string[] = []
    for (const message of request.params.messages) {
      const text = await handleServerMessagePrompt(message)
      if (text != null) texts.push(text)
    }

    return {
      role: "user",
      model: "gpt-3.5-turbo",
      stopReason: "endTurn",
      content: {
        type: "text",
        text: texts.join("\n"),
      },
    }
  })

  console.log("You are connected");
  while (true) {
    const option = await select({
      message: "what would you like to do",
      choices: ["Query", "Tools", "Resources", "Prompts"],
    });
    switch (option) {
      case "Tools":
        const toolName = await select({
          message: "Select a tool",
          choices: tools.map((tool) => ({
            name: tool.annotations?.title || tool.name,
            value: tool.name,
            description: tool.description,
          })),
        });
        const tool = tools.find((t) => t.name === toolName);
        if (tool == null) {
          console.error("Tool not found.");
        } else {
          await handleTool(tool);
        }
        break;
      case "Resources":
        const resourceUri = await select({
          message: "Select a resource",
          choices: [
            ...resources.map((resource) => ({
              name: resource.name,
              value: resource.uri,
              description: resource.description,
            })),
            ...resourceTemplates.map((template) => ({
              name: template.name,
              value: template.uriTemplate,
              description: template.description,
            })),
          ],
        });
        const uri =
          resources.find((r) => r.uri === resourceUri)?.uri ??
          resourceTemplates.find((r) => r.uriTemplate === resourceUri)
            ?.uriTemplate;
        if (uri == null) {
          console.error("Resource not found.");
        } else {
          await handleResource(uri);
        }
        break;
      case "Prompts":
        const promptName = await select({
          message: "Select a prompt",
          choices: prompts.map((prompt) => ({
            name: prompt.name,
            value: prompt.name,
            description: prompt.description,
          })),
        });
        const prompt = prompts.find((p) => p.name === promptName);
        if (prompt == null) {
          console.error("Prompt not found.");
        } else {
          await handlePrompt(prompt);
        }
        break;
      case "Query":
        await handleQuery(tools);
    }
  }
}

async function handleTool(tool: Tool) {
  const args: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    tool.inputSchema.properties ?? {}
  )) {
    args[key] = await input({
      message: `Enter value for ${key}(${(value as { type: string }).type}): `,
    });
  }

  const res = mcp.callTool({
    name: tool.name,
    arguments: args,
  });
  console.log(((await res).content as [{ text: string }])[0].text);
}

async function handleResource(uri: string) {
  let finalUri = uri;
  const paramMatches = uri.match(/{([^}]+)}/g); //matches what the content beetween 2 brakets like {}

  if (paramMatches != null) {
    for (const paramMatch of paramMatches) {
      const paramName = paramMatch.replace("{", "").replace("}", "");
      const paramValue = await input({
        message: `Enter value for ${paramName}:`,
      });
      finalUri = finalUri.replace(paramMatch, paramValue);
    }
  }

  const res = await mcp.readResource({
    uri: finalUri,
  });

  console.log(
    JSON.stringify(JSON.parse(res.contents[0].text as string), null, 2)
  );
}

async function handlePrompt(prompt: Prompt) {
  const args: Record<string, string> = {};
  for (const arg of prompt.arguments ?? []) {
    args[arg.name] = await input({
      message: `Enter value for ${arg.name}:`,
    });
  }

  const response = await mcp.getPrompt({
    name: prompt.name,
    arguments: args,
  });

  for (const message of response.messages) {
    console.log(await handleServerMessagePrompt(message));
  }
}

async function handleQuery(tools: Tool[]) {
  const query = await input({ message: "Enter your query" })

  const { text, toolResults } = await generateText({
    model: openai('gpt-3.5-turbo'),
    prompt: query,
    tools: tools.reduce(
      (obj, tool) => ({
        ...obj,
        [tool.name]: {
          description: tool.description,
          parameters: jsonSchema(tool.inputSchema as import("json-schema").JSONSchema7),
          execute: async (args: Record<string, any>) => {
            return await mcp.callTool({
              name: tool.name,
              arguments: args,
            })
          },
        },
      }),
      {} as ToolSet
    ),
  })

  console.log(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    text || toolResults[0]?.result?.content[0]?.text || "No text generated."
  )
}

async function handleServerMessagePrompt(message: PromptMessage) {
  if (message.content.type !== "text") return;

  console.log(message.content.text);
  const run = await confirm({
    message: "Would you like to run the above prompt",
    default: true,
  });

  if (!run) return;

  const { text } = await generateText({
    model: openai('gpt-3.5-turbo'),
    prompt: message.content.text,
  });

  return text;
}


main();
