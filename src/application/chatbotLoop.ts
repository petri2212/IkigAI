/*
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
*/
// chatbot.ts
/*
import { getMcpClient } from "@/infrastructure/mcp/McpClient";

const flow = [
  { question: "How old are you?" },
  { question: "Where do you live?" },
  { question: "What do you like?" },
];

type SessionState = {
  step: number;
  answers: string[];
};

const sessions = new Map<string, SessionState>();

function isUserAskingQuestion(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const questionWords = [
    "what", "why", "how", "when", "where", "who",
    "che", "come", "perché", "quando", "dove", "chi", "cosa"
  ];
  if (trimmed.endsWith("?")) return true;
  const lower = trimmed.toLowerCase();
  for (const w of questionWords) {
    if (lower.startsWith(w + " ") || lower.startsWith(w + "?")) return true;
  }
  return false;
}

export async function chatbotLoop(
  userInput: string,
  userId: string,
  sessionNumber: string
): Promise<{ message: string; done: boolean }> {
  const mcp = await getMcpClient();

  const sessionKey = `${userId}-${sessionNumber}`;
  let session = sessions.get(sessionKey);

  if (!session) {
    session = { step: 0, answers: [] };
    sessions.set(sessionKey, session);
  }

  // Se ho finito tutte le domande
  if (session.step >= flow.length) {
    sessions.delete(sessionKey);
    return {
      message: "Ottimo, hai finito le domande ora ti do la conclusione.",
      done: true,
    };
  }

  // Se l'utente fa una domanda (input esterno)
  if (isUserAskingQuestion(userInput)) {
    return {
      message: "Bella domanda! Per ora ti rispondo io: questa è una risposta simulata dall'AI.",
      done: false,
    };
  }

  // Salvo la risposta precedente in Mongo tramite MCP
  const prevQuestion = flow[session.step].question;

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
    console.error("Errore salvataggio dati MCP:", err);
  }

  // Registro la risposta
  session.answers.push(userInput);

  // Prossima domanda
  const nextQuestion = flow[session.step].question;

  session.step += 1;
  sessions.set(sessionKey, session);

  return {
    message: nextQuestion,
    done: false,
  };
}
*/

import { getMcpClient } from "@/infrastructure/mcp/McpClient";
import { OpenAI } from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

type SessionState = {
  step: number;
  answers: string[];
  flow: { question: string }[];
};

const sessions = new Map<string, SessionState>();

// Rileva domanda utente
function isUserAskingQuestion(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const questionWords = [
    "what", "why", "how", "when", "where", "who",
    "che", "come", "perché", "quando", "dove", "chi", "cosa"
  ];
  if (trimmed.endsWith("?")) return true;
  const lower = trimmed.toLowerCase();
  for (const w of questionWords) {
    if (lower.startsWith(w + " ") || lower.startsWith(w + "?")) return true;
  }
  return false;
}

// Genera 4 domande dall'AI su argomenti dati
async function generateQuestions(topics: string[]): Promise<{ question: string }[]> {
  const prompt = `Genera 4 domande pertinenti per un'intervista su questi argomenti: ${topics.join(
    ", "
  )}. Le domande devono essere brevi e chiare. Rispondi solo con le domande, separate da linee nuove.`;

  const completion = await openai.completions.create({
    model: "text-davinci-003",
    prompt,
    max_tokens: 150,
    temperature: 0.7,
  });

  const text = completion.choices[0].text ?? "";
  // Divido per linea e filtro
  const questions = text
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 4)
    .map((q) => ({ question: q }));

  return questions;
}

// Risponde a domande esterne con AI
async function answerExternalQuestion(question: string): Promise<string> {
  const prompt = `Sei un assistente virtuale esperto. Rispondi brevemente a questa domanda:\n${question}`;

  const completion = await openai.completions.create({
    model: "text-davinci-003",
    prompt,
    max_tokens: 100,
    temperature: 0.6,
  });

  return completion.choices[0].text?.trim() ?? "Non so come rispondere a questa domanda.";
}

export async function chatbotLoop(
  userInput: string,
  userId: string,
  sessionNumber: string,
  topics: string[] = ["programmazione"] // argomenti di default
): Promise<{ message: string; done: boolean }> {
  const mcp = await getMcpClient();
  const sessionKey = `${userId}-${sessionNumber}`;

  let session = sessions.get(sessionKey);

  // Se nuova sessione, genero le domande dall'AI
  if (!session) {
    const generatedQuestions = await generateQuestions(topics);
    session = { step: 0, answers: [], flow: generatedQuestions };
    sessions.set(sessionKey, session);
  }

  // Se finite le domande
  if (session.step >= session.flow.length) {
    sessions.delete(sessionKey);
    return {
      message: "Ottimo, hai finito le domande ora ti do la conclusione.",
      done: true,
    };
  }

  // Se l'utente fa domanda esterna
  if (isUserAskingQuestion(userInput)) {
    const aiAnswer = await answerExternalQuestion(userInput);
    return {
      message: aiAnswer,
      done: false,
    };
  }

  // Salvo risposta precedente in MCP
  const prevQuestion = session.flow[session.step].question;

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
    console.error("Errore salvataggio dati MCP:", err);
  }

  session.answers.push(userInput);

  // Prossima domanda
  session.step += 1;
  sessions.set(sessionKey, session);

  return {
    message: session.flow[session.step]?.question ?? "Ottimo, hai finito le domande ora ti do la conclusione.",
    done: session.step >= session.flow.length,
  };
}
