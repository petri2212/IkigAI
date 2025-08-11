import { getMcpClient } from "@/infrastructure/mcp/McpClient";

// Questions
const flow = [
  { question: "How old are you?" },
  { question: "Where do you live?" },
  { question: "What do you like?" },
];

type SessionState = {
  step: number;
};

const sessions = new Map<string, SessionState>();

export const chatbotLoop = async (
  userInput: string,
  userId: string,
  sessionNumber: string
): Promise<{ message: string; done: boolean }> => {
  const mcp = await getMcpClient();

  const sessionKey = `${userId}-${sessionNumber}`;

  let session = sessions.get(sessionKey);
  if (!session) {
    session = { step: 0 };
    sessions.set(sessionKey, session);
  }

  const currentStep = session.step;

  // Salva la risposta alla domanda precedente (se NON è la prima)
  if (currentStep > 0) {
    const prevQuestion = flow[currentStep - 1].question;

    console.log("💾 Salvataggio su Mongo:", {
      id: userId,
      number_session: sessionNumber,
      question: prevQuestion,
      answer: userInput,
    });

    await mcp.callTool({
      name: "save-session-data",
      arguments: {
        id: userId,
        number_session: sessionNumber,
        question: prevQuestion,
        answer: userInput,
      },
    });
  }

  // Se abbiamo finito le domande
  if (currentStep >= flow.length) {
    sessions.delete(sessionKey);
    return {
      message:
        "Thank you! You've completed the questions. I'll now use this info to help you find the best job.",
      done: true,
    };
  }

  // Prossima domanda
  const nextQuestion = flow[currentStep].question;

  // Incremente step SOLO dopo avere usato currentStep
  session.step += 1;
  sessions.set(sessionKey, session);

  return {
    message: nextQuestion,
    done: false,
  };
};

/*
import { getMcpClient } from "@/infrastructure/mcp/McpClient";

const flow = [
  { question: "How old are you?" },
  { question: "Where do you live?" },
  { question: "What do you like?" },
];

const AI_START_PREFIX = "START_AI:";
const DEFAULT_AI_QUESTION_COUNT = 4;

type SessionState = {
  step: number;
  type?: "static" | "ai";
  questions?: string[];
  topics?: string[];
};

const sessions = new Map<string, SessionState>();

export const chatbotLoop = async (
  userInput: string,
  userId: string,
  sessionNumber: string
): Promise<{ message: string; done: boolean }> => {
  const mcp = await getMcpClient();
  const sessionKey = `${userId}-${sessionNumber}`;

  let session = sessions.get(sessionKey);
  if (!session) {
    session = { step: 0, type: "static" };
    sessions.set(sessionKey, session);
  }

  const currentStep = session.step;

  if (currentStep === 0 && userInput.trim().startsWith(AI_START_PREFIX)) {
    const topics = userInput
      .slice(AI_START_PREFIX.length)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    session.topics = topics;
    session.type = "ai";

    const aiQuestions = await generateAiQuestions(mcp, topics);
    session.questions = aiQuestions;

    const nextQuestion = session.questions[0] ?? "(No questions generated)";
    session.step = 1;
    sessions.set(sessionKey, session);

    return { message: nextQuestion, done: false };
  }

  const questions = session.questions ?? flow.map((q) => q.question);

  if (currentStep > 0) {
    const prevQuestion = questions[currentStep - 1];
    const isExternal = await isExternalQuery(mcp, prevQuestion, userInput);

    if (isExternal) {
      try {
        const toolRes = await mcp.callTool({
          name: "answer-query",
          arguments: { query: userInput, userId, sessionNumber },
        });
        const text = extractText(toolRes) ??
          "Mi dispiace, non ho capito la domanda — puoi riformularla?";
        return { message: text, done: false };
      } catch (err) {
        console.error("answer-query tool failed:", err);
        return { message: "Mi dispiace, ho avuto un errore nel rispondere alla tua domanda. Riprova.", done: false };
      }
    }

    console.log("💾 Salvataggio su Mongo:", {
      id: userId,
      number_session: sessionNumber,
      question: prevQuestion,
      answer: userInput,
    });

    try {
      await mcp.callTool({
        name: "save-session-data",
        arguments: {
          id: userId,
          number_session: sessionNumber,
          question: prevQuestion,
          answer: userInput,
        },
      });
    } catch (err) {
      console.error("save-session-data failed:", err);
    }
  }

  if (currentStep >= questions.length) {
    sessions.delete(sessionKey);
    return {
      message: "Congratulazioni! Hai finito le domande — ora ti do il risultato, dammi un paio di minuti.",
      done: true,
    };
  }

  const nextQuestion = questions[currentStep];
  session.step += 1;
  sessions.set(sessionKey, session);

  return {
    message: nextQuestion,
    done: false,
  };
};

async function generateAiQuestions(mcp: any, topics: string[]) {
  try {
    const res = await mcp.callTool({
      name: "generate-questions",
      arguments: { topics, count: DEFAULT_AI_QUESTION_COUNT },
    });

    let questions: string[] | undefined;
    if (res?.questions && Array.isArray(res.questions)) questions = res.questions;
    else if (res?.result?.questions && Array.isArray(res.result.questions)) questions = res.result.questions;
    else if (typeof res === "string") {
      try {
        const parsed = JSON.parse(res);
        if (Array.isArray(parsed.questions)) questions = parsed.questions;
      } catch {
        questions = res.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      }
    }

    if (!questions || questions.length === 0) {
      const t = topics && topics[0] ? topics[0] : "the topic";
      questions = [
        `What made you choose ${t}?`,
        `Tell me about a recent ${t} project you worked on.`,
        `What are the biggest challenges you face when working on ${t}?`,
        `How do you keep your ${t} skills up to date?`,
      ];
    }

    return questions.slice(0, DEFAULT_AI_QUESTION_COUNT);
  } catch (err) {
    console.error("generateAiQuestions failed:", err);
    const t = topics && topics[0] ? topics[0] : "the topic";
    return [
      `What made you choose ${t}?`,
      `Tell me about a recent ${t} project you worked on.`,
      `What are the biggest challenges you face when working on ${t}?`,
      `How do you keep your ${t} skills up to date?`,
    ];
  }
}

async function isExternalQuery(mcp: any, question: string, userInput: string) {
  try {
    const res = await mcp.callTool({
      name: "classify-input",
      arguments: { question, input: userInput },
    });
    if (typeof res?.isAnswer === "boolean") return !res.isAnswer;
    if (typeof res?.is_answer === "boolean") return !res.is_answer;
    if (typeof res === "string") {
      const lower = res.toLowerCase();
      if (lower.includes("answer") || lower.includes("yes")) return false;
      if (lower.includes("question") || lower.includes("no")) return true;
    }
  } catch (err) {
    console.warn("classify-input failed:", err);
  }

  const trimmed = userInput.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  const questionWords = ["what", "why", "how", "when", "where", "who", "che", "come", "perché", "quando", "dove", "chi", "cosa"];

  if (trimmed.endsWith("?")) return true;
  for (const w of questionWords) {
    if (lower.startsWith(w + " ") || lower.startsWith(w + "?")) return true;
  }
  return false;
}

function extractText(toolResult: any): string | null {
  if (!toolResult) return null;
  if (typeof toolResult === "string") return toolResult;
  if (typeof toolResult === "object") {
    if (typeof toolResult.text === "string") return toolResult.text;
    if (typeof toolResult.answer === "string") return toolResult.answer;
    if (typeof toolResult.result === "string") return toolResult.result;
    if (typeof toolResult.output === "string") return toolResult.output;
  }
  return null;
}
*/