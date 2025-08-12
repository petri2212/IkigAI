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
  const prompt = `Genera 4 domande pertinenti per un'intervista sui seguenti argomenti: ${topics.join(
    ", "
  )}.
Le domande devono essere brevi, chiare e in italiano. Rispondi solo con le domande, ciascuna su una nuova riga, senza numeri, senza punti elenco e senza separatori.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Sei un assistente che genera domande." },
      { role: "user", content: prompt },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  const text = completion.choices[0].message.content ?? "";

  const questions = text
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.length > 0 && !/^[-–—]+$/.test(q)) // elimina linee di soli trattini
    .map((q) => q.replace(/^[-•\d.]+\s*/, "")) // rimuove bullet/numero iniziale
    .slice(0, 4)
    .map((q) => ({ question: q }));

  return questions;
}

// Risponde a domande esterne con AI
async function answerExternalQuestion(question: string): Promise<string> {
  const prompt = `Sei un assistente virtuale esperto. Rispondi brevemente a questa domanda:\n${question}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Sei un assistente virtuale esperto." },
      { role: "user", content: prompt },
    ],
    max_tokens: 100,
    temperature: 0.6,
  });

 return completion.choices?.[0]?.message?.content?.trim() ?? "Non so come rispondere a questa domanda.";
}


export async function chatbotLoop(
  userInput: string,
  userId: string,
  sessionNumber: string,
  topics: string[] = ["ingegenria meccanica"] // argomenti di default
): Promise<{ message: string; done: boolean }> {
  const mcp = await getMcpClient();
  const sessionKey = `${userId}-${sessionNumber}`;

  let session = sessions.get(sessionKey);

  // Se nuova sessione, genera domande dall'AI
  if (!session) {
    const generatedQuestions = await generateQuestions(topics);
    session = { step: 0, answers: [], flow: generatedQuestions };
    sessions.set(sessionKey, session);
  }

  // Se chiamata di inizializzazione (__INIT__) → restituisci la prima domanda senza salvare
  if (userInput === "__INIT__") {
    return {
      message: session.flow[0].question,
      done: false,
    };
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
    message:
      session.flow[session.step]?.question ??
      "Ottimo, hai finito le domande ora ti do la conclusione.",
    done: session.step >= session.flow.length,
  };
}
