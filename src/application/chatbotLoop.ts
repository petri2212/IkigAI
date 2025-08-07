import { getMcpClient } from "@/infrastructure/mcp/McpClient";

// Questions
const flow = [
  { question: "What is your name?" },
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
