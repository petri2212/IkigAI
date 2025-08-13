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
    "what",
    "why",
    "how",
    "when",
    "where",
    "who",
    "che",
    "come",
    "perché",
    "quando",
    "dove",
    "chi",
    "cosa",
  ];
  if (trimmed.endsWith("?")) return true;
  const lower = trimmed.toLowerCase();
  for (const w of questionWords) {
    if (lower.startsWith(w + " ") || lower.startsWith(w + "?")) return true;
  }
  return false;
}

// Genera 4 domande dall'AI su argomenti dati
async function generateQuestions(   
  topics: string[] 
): Promise<{ question: string }[]> {   
  const prompt = `Ikigai (生き甲斐) è un termine giapponese che si traduce approssimativamente come "ragione di essere" o "scopo della vita". Non ha una traduzione diretta in italiano, ma racchiude il concetto di trovare gioia e significato nella vita, qualcosa che motiva ad alzarsi ogni mattina. È la combinazione di ciò che ami, ciò in cui sei bravo, ciò di cui il mondo ha bisogno e ciò per cui puoi essere pagato.

Ecco i punti chiave dell'ikigai:

Passione: Ciò che ami fare, che ti appassiona e ti motiva.
Missione: Ciò che serve al mondo, il tuo contributo alla società.
Vocazione: Ciò in cui sei bravo, le tue capacità e talenti.
Professione: Ciò per cui puoi essere pagato, la tua attività lavorativa.

GENERA ESATTAMENTE 12 DOMANDE, una per riga:
- 4 domande sulla PASSIONE
- 4 domande sulla MISSIONE  
- 4 domande sulla VOCAZIONE
- 4 domande sulla PROFESSIONE

Le domande devono essere medio-brevi, chiare e in italiano, adatte anche a ragazzi che non sanno cosa fare della loro vita.

FORMATO RICHIESTO:
Scrivi ogni domanda su una riga separata, senza numeri, senza punti elenco, senza separatori. Solo le domande pure.`;    

  const completion = await openai.chat.completions.create({     
    model: "gpt-3.5-turbo",     
    messages: [       
      { role: "system", content: "Sei un assistente che genera esattamente 12 domande, una per riga, senza numerazione." },       
      { role: "user", content: prompt },     
    ],     
    max_tokens: 800, // aumentato ancora di più
    temperature: 0.5, // ridotta per più coerenza
  });    

  const text = completion.choices[0].message.content ?? "";    
  
  // DEBUG: Stampa il testo grezzo
  console.log("🔍 Testo grezzo dall'AI:", text);
  console.log("🔍 Righe totali:", text.split("\n").length);

  const questions = text     
    .split("\n")     
    .map((q) => q.trim())     
    .filter((q) => q.length > 5) // filtro più permissivo
    .filter((q) => !/^[-–—\s]*$/.test(q)) // elimina linee vuote o di soli trattini
    .filter((q) => !q.toLowerCase().includes('passione') || q.includes('?')) // elimina intestazioni
    .filter((q) => !q.toLowerCase().includes('missione') || q.includes('?'))
    .filter((q) => !q.toLowerCase().includes('vocazione') || q.includes('?'))
    .filter((q) => !q.toLowerCase().includes('professione') || q.includes('?'))
    .map((q) => q.replace(/^[-•\d.\s]+/, "")) // rimuove bullet/numero iniziale     
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 12) // prendi massimo 12
    .map((q) => ({ question: q }));    

  console.log(" Domande finali parsate:", questions.length);
  console.log(" Domande parsate:", questions);

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

  return (
    completion.choices?.[0]?.message?.content?.trim() ??
    "Non so come rispondere a questa domanda."
  );
}

export async function chatbotLoopCompleted(
  userInput: string,
  userId: string,
  sessionNumber: string,
  path: string,
  topics: string[] = ["ingegneria meccanica"] // corretto il typo
): Promise<{ message: string; done: boolean }> {
  const mcp = await getMcpClient();
  const sessionKey = `${userId}-${sessionNumber}`;

  let session = sessions.get(sessionKey);

  // Domande aggiuntive fisse
  const additionalQuestions = [
    { question: "In che citta\paese\regione vorresti lavorare?" },
    { question: "Quanto vorresti essere pagato?" },
    { question: "Vorresti un lavoro part time?" },
    { question: "Hai in mente qualche azienda specifica, digita il nome?" },
    { question: "Come stai?" }
  ];

  // Se nuova sessione, genera domande dall'AI + domande aggiuntive
  if (!session) {
    const generatedQuestions = await generateQuestions(topics);
    const allQuestions = [...generatedQuestions, ...additionalQuestions];
    
    console.log(" Domande ikigai generate:", generatedQuestions.length);
    console.log(" Domande aggiuntive:", additionalQuestions.length);
    console.log(" Domande totali:", allQuestions.length);
    
    session = { step: 0, answers: [], flow: allQuestions };
    sessions.set(sessionKey, session);
  }

  // Se chiamata di inizializzazione (__INIT__) → restituisci la prima domanda senza salvare
  if (userInput === "__INIT__") {
    return {
      message: session.flow[0].question,
      done: false,
    };
  }

  // Se finite tutte le domande (ikigai + aggiuntive)
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
  
  // Determina il tipo di domanda per il log
  const questionType = session.step < 12 ? "ikigai" : "additional";

  console.log(" Salvataggio su Mongo:", {
    id: userId,
    number_session: sessionNumber,
    question: prevQuestion,
    answer: userInput,
    step: session.step + 1,
    totalQuestions: session.flow.length,
    questionType: questionType
  });

  try {
    await mcp.callTool({
      name: "save-session-data",
      arguments: {
        id: userId,
        number_session: sessionNumber,
        question: prevQuestion,
        answer: userInput,
        path: path,
      },
    });
  } catch (err) {
    console.error("Errore salvataggio dati MCP:", err);
  }

  session.answers.push(userInput);

  // Prossima domanda
  session.step += 1;
  sessions.set(sessionKey, session);

  // Messaggio di transizione tra ikigai e domande aggiuntive
  let nextMessage = "";
  if (session.step === 12) {
    nextMessage = "Perfetto! Ora ho alcune domande aggiuntive per conoscerti meglio. " + 
                 (session.flow[session.step]?.question ?? "");
  } else {
    nextMessage = session.flow[session.step]?.question ?? 
                 "Ottimo, hai finito le domande ora ti do la conclusione.";
  }

  console.log(` Step: ${session.step}/${session.flow.length} - Tipo: ${session.step <= 12 ? 'ikigai' : 'additional'}`);

  return {
    message: nextMessage,
    done: session.step >= session.flow.length,
  };
}

export async function chatbotLoopSimplified(
  userInput: string,
  userId: string,
  sessionNumber: string,
  isSimplified: string,
  topics: string[] = ["ingegenria meccanica"]
): Promise<void> {
  // TODO: implement function logic
}
