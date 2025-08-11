/*import { getMcpClient } from "@/infrastructure/mcp/McpClient";

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
