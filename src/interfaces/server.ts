import "dotenv/config";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import fs from "node:fs/promises";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { PdfDocument } from "../domain/resume.js";
import type { User } from "../domain/user.ts";
import type {SessionDoc, QA } from "../domain/message.ts";
import { MongoClient, type Collection } from "mongodb";
import { Session } from "node:inspector/promises";
import { QAEntry, SessionData } from "@/app/api/getSessionMessages/route";
import OpenAI from "openai";
import { parsePdfBase64 } from "@/application/chatbotLoop.js";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
          text: JSON.stringify(jobs, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  }
);
//analyze-cv-for-skills
server.tool(
  "analyze-cv-for-skill",
  "Analyze the CV for a user in order to return a profession",
  {
    cvBase64: z.string(),
    paese: z.string().optional(),
    citta: z.string().optional(),
    tipoContratto: z.string().optional(),
    azienda: z.string().optional(),
    stipendio: z.string().optional(),
  },
  {
    title: "Analyze CV for skill/profession",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async ({ cvBase64, paese, citta, tipoContratto, azienda, stipendio }) => {
    if (!cvBase64) {
      return {
        content: [{ type: "text", text: "Error: CV missing." }],
      };
    }

    let cvText = "";
    if (cvBase64.startsWith("JVBER")) {
      cvText = await parsePdfBase64(cvBase64);
      if (!cvText) cvText = "CV not readable";
    } else {
      cvText = "CV it's not in PDF";
    }

    //openAI call in order to obtain work profession
    const prompt = `You are an experienced career coach. Analyze the following CV and return **only the name of the most suitable profession**, without additional phrases. 
CV: ${cvText}`;

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an experienced career coach." },
        { role: "user", content: prompt },
      ],
      max_tokens: 20, // in order to get 1-2 words
      temperature: 0,
    });

    const suggestedSkill =
      openaiResponse.choices?.[0]?.message?.content?.trim() ?? "";

    return {
      content: [{ type: "text", text: suggestedSkill || "Project Manager" }], // fallback if absent
    };
  }
);

// Search for jobs based on user preferences
server.tool(
  "search-jobs",
  "Search for jobs based on user preferences",
  {
    country: z.string().default("it"),
    location: z.string().default(""),
    jobType: z.string().default(""),
    company: z.string().default(""),
    salary: z.string().default(""),
    skills: z.string().default(""), // before default was javascript developer
  },
  {
    title: "Search Jobs",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ country, location, jobType, company, salary, skills }) => {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey)
      throw new Error("ADZUNA_APP_ID or ADZUNA_APP_KEY not set");

    const locationArg = location.toLowerCase().includes("non") ? "" : location;
    const jobTypeArg = jobType.toLowerCase().includes("non") ? "" : jobType;
    const companyArg = company.toLowerCase().includes("non") ? "" : company;
    const salaryArg = salary.toLowerCase().includes("non") ? "" : salary;

    let query = skills || ""; //javascript developer
    if (companyArg) query += ` ${companyArg}`;

    const clean = (str: string) => str.trim().replace(/\s+/g, " ");
    
    //prepare ural
    const baseUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "10",
      what: clean(query),
      where: clean(locationArg || ""),
    });

    if (jobTypeArg) {
      if (jobTypeArg.toLowerCase().includes("part")) {
        params.set("part_time", "1");
      } else if (jobTypeArg.toLowerCase().includes("full")) {
        params.set("full_time", "1");
      }
    }

    if (salaryArg && !isNaN(Number(salaryArg))) {
      params.set("salary_min", String(Number(salaryArg)));
    }

    const url = `${baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error in searching jobs: ${response.statusText}\nDEBUG URL: ${url}`,
            },
          ],
        };
      }

      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No jobs matching the criteria were found..\nDEBUG URL: ${url}`,
            },
          ],
        };
      }

      //mapping jobs found
      const jobs = data.results.map((job: any) => ({
        title: job.title,
        company: job.company?.display_name,
        location: job.location?.display_name,
        description: job.description
          ? job.description.replace(/\s+/g, " ").substring(0, 200) + "..."
          : "",
        contract_type: job.contract_type ?? "non specificato",
        salary_min: job.salary_min ?? "non specificato",
        salary_max: job.salary_max ?? "non specificato",
        url: job.redirect_url,
      }));

      return {
        content: [
          {
            type: "text",
            text: `DEBUG URL: ${url}\n${JSON.stringify(jobs, null, 2)}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error in searching jobs: ${err}\nDEBUG URL: ${url}`,
          },
        ],
      };
    }
  }
);

//create pdf to mongo
server.tool(
  "save-pdf-to-mongo",
  "Save an uploaded PDF file to MongoDB",
  {
    id: z.string(), // user id
    pdf: z.string(), // base64 encoded PDF
    session: z.string(), // session number or identifier
  },
  {
    title: "Save PDF to MongoDB",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id, pdf, session }) => {
    const { MongoClient } = await import("mongodb");

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

      const result = await collection.insertOne({
        id,
        session,
        tipo: "application/pdf",
        file: buffer,
        uploadedAt: new Date(),
      });

      return {
        content: [
          {
            type: "text",
            text: `PDF saved with Mongo _id: ${result.insertedId.toString()}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Errore: ${error instanceof Error ? error.message : "Unknown error"
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
    session: z.string(),
  },
  {
    title: "Get PDF by ID",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ id, session }) => {
    const { MongoClient } = await import("mongodb");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db("Main");
      const collection = db.collection<PdfDocument>("CVs");

      const doc = await collection.findOne({ id, session }); // id is string

      if (!doc) {
        return {
          content: [
            {
              type: "text",
              text: `PDF with ID ${id} and session ${session} don't found.`,
            },
          ],
        };
      }
      //const buffer = doc.file instanceof Buffer ? doc.file : doc.file.buffer; // i have to do in this way because BSON bynary dont accept
      // parameters on to string

      let buffer: Buffer;

      if (doc.file instanceof Buffer) {
        buffer = doc.file;
      } else if (doc.file?.buffer) {
        // if it is ArrayBuffer, convert it
        buffer = Buffer.from(doc.file.buffer);
      } else if (typeof doc.file === "string") {
        // if for some old record is a path convert it
        const fs = await import("fs");
        buffer = fs.readFileSync(doc.file);
      } else {
        throw new Error("Formato file non supportato");
      }

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

//save user information in mongo(id,name,surname,email)(NOT USED YET)
server.tool(
  "save-user-to-mongo",
  "Save user data to MongoDB",
  {
    id: z.string(), // unique id of the user
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
        { _id: id }, // ITS NOT CORRECT NOW, i have to generate the _id with mongo, then i save also the user id
        {
          $set: {
            name,
            surname,
            email,
            updatedAt: new Date(),
          },
        },
        { upsert: true } // create if not exist
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
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"
              }`,
          },
        ],
      };
    } finally {
      await client.close();
    }
  }
);

//save user profiling(NOT USED YET, INSTEAD WE USE SESSION DATA FOR ALL THE SESSION)
server.tool(
  "save-user-profiling-mongo",
  "Save user profiling to MongoDB",
  {
    id: z.string(), // unique id of the user
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
  "Save session question and answer to MongoDB (append or insert)",
  {
    id: z.string(), //user id
    number_session: z.string(), 
    question: z.string(),
    answer: z.string(),
    path: z.string(), // completed or simplified 
    careerCoach: z.boolean().optional(), // optional pharameter, to save the tag career coach for the messages in career coach phase
  },
  {
    title: "Save Session Data (Append or Insert)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ id, number_session, question, answer, path, careerCoach }) => {
    const { MongoClient } = await import("mongodb");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db("Main");

      const collection = db.collection<SessionDoc>("Sessions");
      const existingDoc = await collection.findOne({ id, number_session });
      //console.log("Cosa c’è in existing coso: ", existingDoc);

      // I build entry to save
      const newEntry: any = {
        question,
        answer,
        timestamp: new Date(),
      };

      if (typeof careerCoach === "boolean") {
        newEntry.careerCoach = careerCoach; //  i put the tag in Q&A
      }

      if (existingDoc) {
        // Append q_and_a
        await collection.updateOne(
          { id, number_session },
          {
            $push: {
              q_and_a: newEntry,
            },
          }
        );

        return {
          content: [
            {
              type: "text",
              text: `Q&A added to session ${number_session} for user ${id}`,
            },
          ],
        };
      } else {
        // Create new document
        const newDoc: SessionDoc = {
          id,
          number_session,
          createdAt: new Date(),
          path,
          q_and_a: [newEntry],
        };

        const insertResult = await collection.insertOne(newDoc);

        return {
          content: [
            {
              type: "text",
              text: `New session created with _id: ${insertResult.insertedId}`,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || "Unknown error"}`,
          },
        ],
      };
    } finally {
      await client.close();
    }
  }
);

// get session data
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
    idempotentHint: true,
  },
  async ({ id, number_session }) => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri)
      throw new Error("MONGODB_URI environment variable is not set");

    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const collection = client.db("Main").collection("Sessions");

      const session = await collection.findOne({ id, number_session });

      if (!session) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `No session found for user "${id}" with session number ${number_session}.`,
                q_and_a: [] as QAEntry[],
              }),
              _meta: {},
            },
          ],
        };
      }

      const q_and_a: QAEntry[] = (session.q_and_a || []).map((entry: any) => ({
        question: entry.question,
        answer: entry.answer,
        timestamp: entry.timestamp
          ? new Date(entry.timestamp).toISOString()
          : new Date().toISOString(),
        careerCoach: entry.careerCoach ?? undefined, //career coach tag
      }));

      const sessionData: SessionData = {
        id: session.id,
        number_session: session.number_session,
        q_and_a,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              session: sessionData,
            }),
            _meta: {},
          },
        ],
      };
    } finally {
      await client.close();
    }
  }
);

// get all user sessions(A BIT DEPRECATED)
server.tool(
  "get-all-user-sessions",
  "Retrieve all Q&A sessions for a specific user",
  { id: z.string() },
  {
    title: "Get All User Sessions",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ id }) => {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI!);

    try {
      await client.connect();
      const collection = client.db("Main").collection("Sessions");

      const sessions = await collection
        .find({ id })
        .sort({ createdAt: 1 })
        .toArray();

      if (!sessions.length) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No sessions found for user "${id}".`,
              _meta: {},
            },
          ],
        };
      }

      const content = sessions.map((session) => ({
        type: "text" as const,
        text: JSON.stringify({
          _id: session._id.toString(),
          id: session.id,
          number_session: session.number_session,
          createdAt: session.createdAt,
          path: session.path || "unknown",
          q_and_a: (session.q_and_a || []).map((qa: any) => ({
            question: qa.question,
            answer: qa.answer,
            timestamp: qa.timestamp || new Date().toISOString(),
          })),
        }),
        _meta: {},
      }));

      return { content };
    } finally {
      await client.close();
    }
  }
);

// fake prompt
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
