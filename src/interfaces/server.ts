import "dotenv/config";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import fs from "node:fs/promises";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { PdfDocument} from "../domain/pdf.ts";
import type { User} from "../domain/user.ts";
import type { Message} from "../domain/message.ts";

const server = new McpServer({
  name: "test",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

server.resource(
  "users",
  "user://all",
  {
    description: "Get all user data from a database",
    title: "Users",
    mimeType: "application/json",
  },
  async (uri) => {
    const users = await import("./data/users.json", {
      with: { type: "json" },
    }).then((m) => m.default);
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(users),
          mimeType: "application/json",
        },
      ],
    };
  }
);

server.resource(
  "user-details",
  new ResourceTemplate("users://{userId}/profile", { list: undefined }),
  {
    description: "Get a user's details from the database",
    title: "User Details",
    mimeType: "application/json",
  },
  async (uri, { userId }) => {
    const users = await import("./data/users.json", {
      with: { type: "json" },
    }).then((m) => m.default);

    const user = users.find((u) => u.id === parseInt(userId as string));
    if (user == null) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "User not found" }),
            mimeType: "application/json",
          },
        ],
      };
    }
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(user),
          mimeType: "application/json",
        },
      ],
    };
  }
);

server.resource(
  "get-jobs",
  "job://all",
  {
    description: "Get all jobs from a database",
    title: "jobs",
    mimeType: "application/json",
  },
  async (uri) => {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/it/search/1?app_id=${appId}&app_key=${appKey}&&results_per_page=20&what=javascript%20developer&content-type=application/json`
    );
    //http://api.adzuna.com/v1/api/jobs/gb/search/1?app_id={YOUR API ID}&app_key={YOUR API KEY}&results_per_page=20&what=javascript%20developer&content-type=application/json
    if (!response.ok) {
      throw new Error(
        `Failed to fetch jobs from Adzuna: ${response.statusText}`
      );
    }

    const data = await response.json();
    const jobs = data.results.map(
      (job: {
        title: any;
        company: { display_name: any };
        location: { display_name: any };
        description: any;
        redirect_url: any;
      }) => ({
        title: job.title,
        company: job.company.display_name,
        location: job.location.display_name,
        description: job.description,
        url: job.redirect_url,
      })
    );

    //content as [{ text: string }])[0].text
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(jobs, null, 2), //JSON.stringify(data), // or filter it before returning
          mimeType: "application/json",
        },
      ],
    };
  }
);

server.tool(
  "create-user",
  "Create a new user in the database",
  {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
  },
  {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true, //does interact with the external world?
  },
  async (params) => {
    try {
      const id = await createUser(params);
      return {
        content: [{ type: "text", text: `User ${id} created successfully` }],
      };
    } catch {
      return {
        content: [{ type: "text", text: "Failed to save user" }],
      };
    }
  }
);

server.tool(
  "create-random-user",
  "Create a random user with fake data",
  {
    title: "Create Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async () => {
    const res = await server.server.request(
      {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Generate fake user data. The user should have a realistic name, email, address, and phone number. Return this data as a JSON object with no other text or formatter so it can be used with JSON.parse.",
              },
            },
          ],
          maxTokens: 1024,
        },
      },
      CreateMessageResultSchema
    );

    if (res.content.type !== "text") {
      return {
        content: [{ type: "text", text: "Failed to generate user data" }],
      };
    }

    try {
      const fakeUser = JSON.parse(
        res.content.text
          .trim()
          .replace(/^```json/, "")
          .replace(/```$/, "")
          .trim()
      );

      const id = await createUser(fakeUser);
      return {
        content: [{ type: "text", text: `User ${id} created successfully` }],
      };
    } catch {
      return {
        content: [{ type: "text", text: "Failed to generate user data" }],
      };
    }
  }
);
//create pdf to mongo
server.tool(
  "save-pdf-to-mongo",
  "Save a local PDF file to MongoDB",
  {
    id_unique: z.string(), // unique id of the user
    pdf: z.string(), // base64 encoded PDF, right now i pass a path to test it
  },
  {
    title: "Save PDF to MongoDB",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id_unique, pdf }) => {
    const { MongoClient} = await import("mongodb");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db("Main");
      const collection = db.collection<PdfDocument>("CVs");

      const buffer = Buffer.from(pdf, "base64");

      const result = await collection.updateOne(
        { _id: id_unique }, // filter to find document with _id = id_unique
        {
          $set: {
            tipo: "application/pdf",
            file: buffer,
            uploadedAt: new Date(),
          },
        },
        { upsert: true } // if it doesnt exist it create a new document
      );

      return {
        content: [
          {
            type: "text",
            text: result.upsertedId
              ? `PDF saved with ID: ${result.upsertedId.toString()}`
              : "PDF updated (existing CV replaced).",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Errore: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    } finally {
      await client.close();
    }
  }
);
//retrieve pdf from mongo
server.tool(
  "get-pdf-from-mongo",
  "Retrieve a PDF from MongoDB by ID and return it as base64",
  {
    id: z.string(),
  },
  {
    title: "Get PDF by ID",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ id }) => {
    const { MongoClient} = await import("mongodb");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db("Main");
      const collection = db.collection<PdfDocument>("CVs");

      const doc = await collection.findOne({ _id: id }); // id is string

      if (!doc) {
        return {
          content: [{ type: "text", text: `PDF with ID ${id} don't found.` }],
        };
      }
      const buffer = doc.file instanceof Buffer ? doc.file : doc.file.buffer; // i have to do in this way because BSON bynary dont accept 
                                                                              // parameters on to string

      // Then convert to base64:
      const base64Pdf = buffer.toString("base64");

      return {
        content: [
          {
            type: "text",
            text: base64Pdf,
          },
        ],
      };
    } catch {
      return {
        content: [{ type: "text", text: "Error in retrieve the PDF." }],
      };
    } finally {
      await client.close();
    }
  }
);
//save user information in mongo(id,name,surname,email)
server.tool(
  "save-user-to-mongo",
  "Save user data to MongoDB",
  {
    id: z.string(),       // unique id of the user
    name: z.string(),
    surname: z.string(),
    email: z.string(),
  },
  {
    title: "Save User to MongoDB",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id, name, surname, email }) => {
    const { MongoClient } = await import("mongodb");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db("Main");
      const collection = db.collection<User>("user_information");

      await collection.updateOne(
        { _id: id }, // usa `id` come _id per garantire unicità
        {
          $set: {
            name,
            surname,
            email,
            updatedAt: new Date(),
          },
        },
        { upsert: true } // crea se non esiste
      );

      return {
        content: [
          {
            type: "text",
            text: `Success: user data saved for ID: ${id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    } finally {
      await client.close();
    }
  }
);
//save user profiling
server.tool(
  "save-user-profiling-mongo",
  "Save user profiling to MongoDB",
  {
    id: z.string(),       // unique id of the user
  },
  {
    title: "Save User profile to MongoDB",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id }) => {
    /**TODO
     * Implement the user profiling implementation
     */
    return {
      content: [
        {
          type: "text",
          text: `User profile for ID ${id} saved (dummy implementation).`,
        },
      ],
    };
  }
);
//save session data
server.tool(
  "save-session-data",
  "Save session question and answer to MongoDB (append to array)",
  {
    id: z.string(),
    number_session: z.string(),
    question: z.string(),
    answer: z.string(),
  },
  {
    title: "Save Session Data (with Q&A array)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id, number_session, question, answer }) => {
    const { MongoClient } = await import("mongodb");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db("Main");
      const collection = db.collection<Message>("Sessions");

      const filter = { _id: id, number_session };
      const update = {
        $push: {
          q_and_a: {
            question,
            answer,
            timestamp: new Date(),
          },
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      };

      const result = await collection.updateOne(filter, update, { upsert: true });

      return {
        content: [
          {
            type: "text",
            text: result.upsertedId
              ? `New session created for user ${id}, session ${number_session}`
              : `Q&A added to session ${number_session} for user ${id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    } finally {
      await client.close();
    }
  }
);
//get session data
server.tool(
  "get-session-data",
  "Retrieve session Q&A data for a specific user and session number",
  {
    id: z.string(),
    number_session: z.string(),
  },
  {
    title: "Get Session Data",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ id, number_session }) => {
    const { MongoClient } = await import("mongodb");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db("Main");
      const collection = db.collection<Message>("Sessions");

      const session = await collection.findOne({ _id: id, number_session });

      if (!session) {
        return {
          content: [
            {
              type: "text",
              text: `No session found for user "${id}" with session number ${number_session}.`,
            },
          ],
        };
      }

      const formattedQandA = (session.q_and_a ?? [])
        .map(
          (entry: any, index: number) =>
            `${index + 1}. Q: ${entry.question}\n   A: ${entry.answer}`
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Session ${number_session} for user "${id}":\n\n${formattedQandA || "No Q&A entries found."}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving session: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    } finally {
      await client.close();
    }
  }
);



server.prompt(
  "generate-fake-user",
  "Generate a fake user based on a given name",
  { name: z.string() },
  ({ name }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a fake user with the name ${name}. 
                        The user should have a realistic email, address, and a phone number.`,
          },
        },
      ],
    };
  }
);

async function createUser(user: {
  name: string;
  email: string;
  address: string;
  phone: string;
}) {
  const users = await import("./data/users.json", {
    with: { type: "json" },
  }).then((m) => m.default);
  const id = users.length + 1;
  users.push({ id, ...user });
  await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2));

  return id;
}

async function main() {
  // try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  //} catch (err) {
  // console.error("Fatal error in server:", err)
  // process.exit(1)
  //}
}

main();
