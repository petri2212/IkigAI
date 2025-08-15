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
/*Ikigai (生き甲斐) è un termine giapponese che si traduce approssimativamente come "ragione di essere" o "scopo della vita". Non ha una traduzione diretta in italiano, ma racchiude il concetto di trovare gioia e significato nella vita, qualcosa che motiva ad alzarsi ogni mattina. È la combinazione di ciò che ami, ciò in cui sei bravo, ciò di cui il mondo ha bisogno e ciò per cui puoi essere pagato.

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
Scrivi ogni domanda su una riga separata, senza numeri, senza punti elenco, senza separatori. Solo le domande pure.*/

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

GENERA ESATTAMENTE 4 DOMANDE, una per riga, una su goni argomento dell'ikigai

Le domande devono essere medio-brevi, chiare e in italiano, adatte anche a ragazzi che non sanno cosa fare della loro vita.

FORMATO RICHIESTO:
Scrivi ogni domanda su una riga separata, senza numeri, senza punti elenco, senza separatori. Solo le domande pure.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "Sei un assistente che genera esattamente 12 domande, una per riga, senza numerazione.",
      },
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
    .filter((q) => !q.toLowerCase().includes("passione") || q.includes("?")) // elimina intestazioni
    .filter((q) => !q.toLowerCase().includes("missione") || q.includes("?"))
    .filter((q) => !q.toLowerCase().includes("vocazione") || q.includes("?"))
    .filter((q) => !q.toLowerCase().includes("professione") || q.includes("?"))
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
  const prompt = `Sei un assistente virtuale esperto. Rispondi in modo semplice e completo alla domanda:\n${question}`;

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

interface ToolResponse {
  content: { type: string; text: string }[];
}

export async function parsePdfBase64(cvBase64: string): Promise<string> {
  try {
    const PDFParser = (await import("pdf2json")).default;

    return new Promise<string>((resolve, reject) => {
      const pdfParser = new (PDFParser as any)();

      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error("Errore parse PDF:", errData);
        resolve("");
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          let text = "";
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts && Array.isArray(page.Texts)) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    textItem.R.forEach((textRun: any) => {
                      if (textRun.T) {
                        text += decodeURIComponent(textRun.T) + " ";
                      }
                    });
                  }
                });
              }
            });
          }
          resolve(text.slice(0, 3000));
        } catch (err) {
          console.error("Errore estrazione testo:", err);
          resolve("");
        }
      });

      const buffer = Buffer.from(cvBase64, "base64");
      pdfParser.parseBuffer(buffer);
    });
  } catch (err) {
    console.error("Errore parse PDF:", err);
    return "";
  }
}

async function getJobSuggestion(
  userId: string,
  sessionNumber: string
): Promise<string> {
  let cvBase64: string | null = null;
  let sessionData: string | null = null;

  const mcp = await getMcpClient();

  // Recupero CV
  try {
    const cvResponse = (await mcp.callTool({
      name: "get-pdf-from-mongo",
      arguments: { id: userId, session: sessionNumber },
    })) as ToolResponse;

    if (cvResponse.content?.[0]?.text) {
      cvBase64 = cvResponse.content[0].text;
    } else {
      console.warn(`CV non trovato per utente ${userId}`);
    }
  } catch (err) {
    console.error("Errore recupero CV MCP:", err);
  }

  // Recupero sessione
  try {
    const sessionResponse = (await mcp.callTool({
      name: "get-session-data",
      arguments: { id: userId, number_session: sessionNumber },
    })) as ToolResponse;

    if (sessionResponse.content?.[0]?.text) {
      sessionData = sessionResponse.content[0].text;
    } else {
      console.warn(
        `Sessione ${sessionNumber} non trovata per utente ${userId}`
      );
    }
  } catch (err) {
    console.error("Errore recupero sessione MCP:", err);
  }
  console.log(
    "DEBUG - tipo cvBase64:",
    typeof cvBase64,
    cvBase64?.substring(0, 100)
  );
  /*
console.log("DEBUG - CV Base64:", cvBase64?.substring(0, 100) + "..."); // Mostra solo i primi 100 caratteri
console.log("DEBUG - Session Data:", sessionData);
/*
  return `Perfetto! Hai completato la prima parte dell'ikigai.
CV recuperato: ${cvBase64 ? "✅" : "❌"}
Sessione recuperata: ${sessionData ? "✅" : "❌"}

CHE LAVORO SCEGLI`;*/
  // Decodifica PDF in testo
  let cvText = "";
  if (cvBase64 && cvBase64.startsWith("JVBER")) {
    // I PDF Base64 tipicamente iniziano con "JVBER"
    try {
      cvText = await parsePdfBase64(cvBase64);
      if (!cvText || cvText.trim().length === 0) {
        cvText = "CV non leggibile";
      }
    } catch (err) {
      console.error("Errore decodifica CV:", err);
      cvText = "Errore nella lettura del CV";
    }
  } else {
    console.warn("CV Base64 non valido o mancante, salto parsing PDF.");
    cvText = cvBase64 ? "CV non in formato PDF" : "CV non inserito";
  }
  /*
console.log("DEBUG - CV Base64:", cvText?.substring(0, 100) + "..."); // Mostra solo i primi 100 caratteri
console.log("DEBUG - Session Data:", sessionData);
*/
  if (!cvText && !sessionData) {
    return "Non ci sono dati sufficienti per generare suggerimenti di lavoro.";
  }

  // Prompt per l'AI
  const prompt = `
Hai a disposizione il CV dell'utente (testo) e i dati della sessione.
Analizza attentamente il CV e la sessione per capire competenze, esperienze, passioni e personalità.

Obiettivo: suggerire 3 lavori più pertinenti possibile al CV, e 3 lavoro aggiuntivo basato sulla personalità della sessione.

Restituisci solo i lavori, uno per riga, senza spiegazioni:
CV: ${cvText || "Non disponibile"}
Sessione: ${sessionData || "Non disponibile"}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Sei un assistente esperto nel career coaching.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 800,
    temperature: 0.6,
  });

  const jobsText = completion.choices[0].message.content ?? "";

  return `Perfetto! Ecco i suggerimenti di lavoro basati sul tuo CV e sulla sessione:\n\n${jobsText} \n\n Scegline uno, oppure chiedi maggiori informazioni`;
}
/*
async function generateJobConclusion(
  userId: string,
  sessionNumber: string
): /*Promise<string> {
  const mcp = await getMcpClient();
  try {
    // Recupera i dati della sessione
    const sessionResponse = (await mcp.callTool({
      name: "get-session-data",
      arguments: { id: userId, number_session: sessionNumber },
    })) as ToolResponse;
    console.log("session number", sessionNumber )
     console.log("userId", userId )
    if (!sessionResponse.content?.[0]?.text) {
      return "Non sono riuscito a recuperare i dati della sessione per la ricerca lavori.";
    }

    //const sessionData = JSON.parse(sessionResponse.content[0].text);
    const rawText = sessionResponse.content[0].text;

    // Regex per estrarre Q&A
    const matches = [
      ...rawText.matchAll(/Q: (.+?)\n\s*A: (.+?)(?=\n\d+\. Q:|\n*$)/gs),
    ];

    const sessionData = {
      responses: matches.map(([_, question, answer]) => ({ question, answer })),
    };
    /*
     { question: "In che città vorresti lavorare?" },
    { question: "Vorresti un lavoro part time o full time?(CONSIGLIO DI RISPONDERE no/non lo so se il paese scelto è l'italia)" },
    { question: "Hai in mente qualche azienda specifica, digita il nome?" },
    { question: "Quanto vorresti essere pagato(RAL anno)(CONSIGLIO DI RISPONDERE no/non lo so se il paese scelto è l'italia?)" },
    // Estrai le risposte alle ultime 5 domande
    const jobQuestions = [
      "Perfetto! Ecco i suggerimenti di lavoro basati sul tuo CV e sulla sessione:",
      "In che paese vorresti lavorare, scegli tra queste opzioni: italia, france, inghilterra, germania, polonia",
      "In che città vorresti lavorare?",
      "Vorresti un lavoro part time o full time?",
      "Hai in mente qualche azienda specifica, digita il nome?",
      "Quanto vorresti essere pagato?",
    ];

    const jobAnswers = jobQuestions.map((question) => {
      const found = sessionData.responses?.find((r: any) =>
        r.question?.includes(question.substring(0, 20))
      );
      return found?.answer || "Non specificato";
    });

    const [skills, paese, citta, tipoContratto, azienda, stipendio] =
      jobAnswers;

    // Funzione helper per normalizzare le risposte "vuote"
    function normalizeAnswer(answer: string) {
      const emptyValues = ["non specificato", "non lo so", "no", "nessuna", ""];
      return emptyValues.includes(answer.trim().toLowerCase()) ? "" : answer;
    }
    /*
console.log("DEBUG paese:", paese);
console.log("DEBUG normalizeAnswer(paese):", normalizeAnswer(paese));
console.log("DEBUG key usata per countryMap:", normalizeAnswer(paese).toLowerCase());

    
    // Mappa il paese
    const countryMap: { [key: string]: string } = {
      italia: "it",
      italy: "it",
      francia: "fr",
      france: "fr",
      inghilterra: "gb",
      england: "gb",
      germania: "de",
      germany: "de",
      polonia: "pl",
      poland: "pl",
    };
    /*
console.log("countryMap keys:", Object.keys(countryMap));
console.log("checking france:", countryMap["france"]);

    const normalizedPaese = normalizeAnswer(paese).toLowerCase().trim();
    const countryCode = countryMap[normalizedPaese] ?? "it";
    /*
console.log("DEBUG normalizedPaese:", normalizedPaese);
console.log("DEBUG countryCode:", countryCode);

    // Normalizza gli altri campi

    const locationArg = normalizeAnswer(citta);
    const jobTypeArg = normalizeAnswer(tipoContratto);
    const companyArg = normalizeAnswer(azienda);
    const salaryArg = normalizeAnswer(stipendio);
    const skillsArg = normalizeAnswer(skills);

console.log("DEBUG SKILLS:", skills);   
console.log("DEBUG countryCode:", countryCode);
console.log("DEBUG locationArg:", locationArg);
console.log("DEBUG jobTypeArg:", jobTypeArg);
console.log("DEBUG companyArg:", companyArg);
console.log("DEBUG salaryArg:", salaryArg);

    // Chiama il tool MCP
    const jobsResponse = (await mcp.callTool({
      name: "search-jobs",
      arguments: {
        country: countryCode,
        location: locationArg,
        jobType: jobTypeArg,
        company: companyArg,
        salary: salaryArg,
        skills: skillsArg, // Puoi renderlo dinamico
      },
    })) as ToolResponse;

    if (!jobsResponse.content?.[0]?.text) {
      return "Non sono riuscito a trovare lavori corrispondenti ai tuoi criteri.";
    }

    const responseText = jobsResponse.content?.[0]?.text || "";
    let jobs = [];
    try {
      // rimuovi la riga DEBUG se vuoi fare JSON.parse
      jobs = JSON.parse(responseText.replace(/^DEBUG URL:.*\n/, ""));
      console.log("DIO NELLO L'API: ", responseText);
    } catch (err) {
      //return `Errore parsing jobs.\nDEBUG RAW RESPONSE: ${responseText}`;
      console.log("DIO NELLO L'API: ", responseText);
    }
    Promise<string> {
  const mcp = await getMcpClient();
  try {
    // Recupera i dati della sessione
    const sessionResponse = (await mcp.callTool({
      name: "get-session-data",
      arguments: { id: userId, number_session: sessionNumber },
    })) as ToolResponse;

    console.log("session number", sessionNumber);
    console.log("userId", userId);

    if (!sessionResponse.content?.[0]?.text) {
      return "Non sono riuscito a recuperare i dati della sessione per la ricerca lavori.";
    }

    // Parse JSON del primo tool
    const sessionDataRaw = JSON.parse(sessionResponse.content[0].text);

    if (!sessionDataRaw.success) {
      return `Errore: ${sessionDataRaw.error}`;
    }

    const responses = sessionDataRaw.session.q_and_a.map((entry: any) => ({
      question: entry.question,
      answer: entry.answer,
    }));

    // Domande da estrarre
    const jobQuestions = [
      "Perfetto! Ecco i suggerimenti di lavoro basati sul tuo CV e sulla sessione:",
      "In che paese vorresti lavorare, scegli tra queste opzioni: italia, france, inghilterra, germania, polonia",
      "In che città vorresti lavorare?",
      "Vorresti un lavoro part time o full time?",
      "Hai in mente qualche azienda specifica, digita il nome?",
      "Quanto vorresti essere pagato?",
    ];

    const jobAnswers = jobQuestions.map((question) => {
      const found = responses.find((r: any) =>
        r.question.includes(question.substring(0, 20))
      );
      return found?.answer || "Non specificato";
    });

    const [skills, paese, citta, tipoContratto, azienda, stipendio] =
      jobAnswers;

    // Funzione helper per normalizzare le risposte "vuote"
    function normalizeAnswer(answer: string) {
      const emptyValues = ["non specificato", "non lo so", "no", "nessuna", ""];
      return emptyValues.includes(answer.trim().toLowerCase()) ? "" : answer;
    }

    // Mappa il paese
    const countryMap: { [key: string]: string } = {
      italia: "it",
      italy: "it",
      francia: "fr",
      france: "fr",
      inghilterra: "gb",
      england: "gb",
      germania: "de",
      germany: "de",
      polonia: "pl",
      poland: "pl",
    };

    const normalizedPaese = normalizeAnswer(paese).toLowerCase().trim();
    const countryCode = countryMap[normalizedPaese] ?? "it";

    // Normalizza gli altri campi
    const locationArg = normalizeAnswer(citta);
    const jobTypeArg = normalizeAnswer(tipoContratto);
    const companyArg = normalizeAnswer(azienda);
    const salaryArg = normalizeAnswer(stipendio);
    const skillsArg = normalizeAnswer(skills);

    console.log("DEBUG SKILLS:", skillsArg);
    console.log("DEBUG countryCode:", countryCode);
    console.log("DEBUG locationArg:", locationArg);
    console.log("DEBUG jobTypeArg:", jobTypeArg);
    console.log("DEBUG companyArg:", companyArg);
    console.log("DEBUG salaryArg:", salaryArg);

    // Chiama il tool MCP
    const jobsResponse = (await mcp.callTool({
      name: "search-jobs",
      arguments: {
        country: countryCode,
        location: locationArg,
        jobType: jobTypeArg,
        company: companyArg,
        salary: salaryArg,
        skills: skillsArg,
      },
    })) as ToolResponse;

    if (!jobsResponse.content?.[0]?.text) {
      return "Non sono riuscito a trovare lavori corrispondenti ai tuoi criteri.";
    }

    const responseText = jobsResponse.content?.[0]?.text || "";
    let jobs = [];
    try {
      jobs = JSON.parse(responseText.replace(/^DEBUG URL:.*\n/, ""));
      console.log("DEBUG JOBS API: ", responseText);
    } catch (err) {
      console.log("DEBUG RAW JOBS RESPONSE: ", responseText);
    }

    // Puoi restituire una sintesi o il JSON
    return JSON.stringify(jobs, null, 2);

  } catch (err) {
    console.error("Errore nel recupero sessione:", err);
    return "Errore durante la generazione della conclusione lavori.";
  }

    // Genera la conclusione con AI
    const prompt = `
Sei un career coach esperto. Basandoti sui seguenti dati:

PREFERENZE UTENTE:
- Paese: ${paese}
- Città: ${citta}  
- Tipo contratto: ${tipoContratto}
- Azienda preferita: ${azienda}
- Stipendio desiderato: ${stipendio}

LAVORI TROVATI:
${jobs.map((j: { title: any; company: any; location: any; contract_type: any; salary_min: any; salary_max: any; description: any; url: any; }) => 
  `Titolo: ${j.title}
Azienda: ${j.company}
Luogo: ${j.location}
Contratto: ${j.contract_type}
Stipendio: ${j.salary_min} - ${j.salary_max}
Descrizione: ${j.description}
URL: ${j.url}`
).join("\n\n")} \n\n

Scrivi una conclusione professionale che:
1. Riassuma le preferenze dell'utente
2. Presenti i lavori trovati in modo accattivante
3. Dia consigli pratici per candidarsi
4. Motivi l'utente nel percorso professionale

Mantieni un tono professionale ma amichevole. Limita a 400 parole.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Sei un career coach esperto." },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ??
      "Congratulazioni per aver completato il percorso Ikigai!"
    );
  } catch (err) {
    console.error("Errore generazione conclusione lavori:", err);
    return "Si è verificato un errore durante la ricerca dei lavori.";
  }
}*/

async function generateJobConclusion(
  userId: string,
  sessionNumber: string
): Promise<string> {
  const mcp = await getMcpClient();
  try {
    // Recupera i dati della sessione
    const sessionResponse = (await mcp.callTool({
      name: "get-session-data",
      arguments: { id: userId, number_session: sessionNumber },
    })) as ToolResponse;

    console.log("session number", sessionNumber);
    console.log("userId", userId);

    if (!sessionResponse.content?.[0]?.text) {
      return "Non sono riuscito a recuperare i dati della sessione per la ricerca lavori.";
    }

    // Parsing JSON della sessione
    const sessionDataRaw = JSON.parse(sessionResponse.content[0].text);
    const responses = sessionDataRaw.session.q_and_a.map((entry: any) => ({
      question: entry.question,
      answer: entry.answer,
    }));

    // Domande di interesse per lavori
    const jobQuestions = [
      "Perfetto! Ecco i suggerimenti di lavoro basati sul tuo CV e sulla sessione:",
      "In che paese vorresti lavorare, scegli tra queste opzioni: italia, france, inghilterra, germania, polonia",
      "In che città vorresti lavorare?",
      "Vorresti un lavoro part time o full time?",
      "Hai in mente qualche azienda specifica, digita il nome?",
      "Quanto vorresti essere pagato?",
    ];

    const jobAnswers = jobQuestions.map((question) => {
      const found = responses.find((r: any) =>
        r.question.includes(question.substring(0, 20))
      );
      return found?.answer || "Non specificato";
    });

    const [skills, paese, citta, tipoContratto, azienda, stipendio] = jobAnswers;

    // Helper per normalizzare risposte vuote
    const normalizeAnswer = (answer: string) => {
      const emptyValues = ["non specificato", "non lo so", "no", "nessuna", ""];
      return emptyValues.includes(answer.trim().toLowerCase()) ? "" : answer;
    };

    // Mapping paesi
    const countryMap: { [key: string]: string } = {
      italia: "it",
      italy: "it",
      francia: "fr",
      france: "fr",
      inghilterra: "gb",
      england: "gb",
      germania: "de",
      germany: "de",
      polonia: "pl",
      poland: "pl",
    };

    const normalizedPaese = normalizeAnswer(paese).toLowerCase().trim();
    const countryCode = countryMap[normalizedPaese] ?? "it";

    const locationArg = normalizeAnswer(citta);
    const jobTypeArg = normalizeAnswer(tipoContratto);
    const companyArg = normalizeAnswer(azienda);
    const salaryArg = normalizeAnswer(stipendio);
    const skillsArg = normalizeAnswer(skills);

    console.log("DEBUG SKILLS:", skillsArg);
    console.log("DEBUG countryCode:", countryCode);
    console.log("DEBUG locationArg:", locationArg);
    console.log("DEBUG jobTypeArg:", jobTypeArg);
    console.log("DEBUG companyArg:", companyArg);
    console.log("DEBUG salaryArg:", salaryArg);

    // Chiamata tool MCP per ricerca lavori
    const jobsResponse = (await mcp.callTool({
      name: "search-jobs",
      arguments: {
        country: countryCode,
        location: locationArg,
        jobType: jobTypeArg,
        company: companyArg,
        salary: salaryArg,
        skills: skillsArg,
      },
    })) as ToolResponse;

    if (!jobsResponse.content?.[0]?.text) {
      return "Non sono riuscito a trovare lavori corrispondenti ai tuoi criteri.";
    }

    const responseText = jobsResponse.content?.[0]?.text || "";
    let jobs: any[] = [];
    try {
      jobs = JSON.parse(responseText.replace(/^DEBUG URL:.*\n/, ""));
      console.log("DEBUG JOBS API:", jobs);
    } catch (err) {
      console.log("DEBUG RAW JOBS RESPONSE:", responseText);
    }

    // Generazione conclusione con AI
    const prompt = `
Sei un career coach esperto. Basandoti sui seguenti dati:

PREFERENZE UTENTE:
- Paese: ${paese}
- Città: ${citta}  
- Tipo contratto: ${tipoContratto}
- Azienda preferita: ${azienda}
- Stipendio desiderato: ${stipendio}

LAVORI TROVATI:
${jobs
      .map(
        (j) => `Titolo: ${j.title}
Azienda: ${j.company}
Luogo: ${j.location}
Contratto: ${j.contract_type}
Stipendio: ${j.salary_min} - ${j.salary_max}
Descrizione: ${j.description}
URL: ${j.url}`
      )
      .join("\n\n")}

Scrivi una conclusione professionale che:
1. Riassuma le preferenze dell'utente
2. Presenti i lavori trovati in modo accattivante
3. Dia consigli pratici per candidarsi
4. Motivi l'utente nel percorso professionale

Mantieni un tono professionale ma amichevole. Limita a 400 parole.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Sei un career coach esperto." },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ??
      "Congratulazioni per aver completato il percorso Ikigai!"
    );
  } catch (err) {
    console.error("Errore generazione conclusione lavori:", err);
    return "Si è verificato un errore durante la ricerca dei lavori.";
  }
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
    {
      question:
        "In che paese vorresti lavorare, scegli tra queste opzioni: italia, francia, inghilterra, germania, polonia",
    },
    { question: "In che città vorresti lavorare?" },
    { question: "Vorresti un lavoro part time o full time?(CONSIGLIO DI RISPONDERE no/non lo so se il paese scelto è l'italia)" },
    { question: "Hai in mente qualche azienda specifica, digita il nome?" },
    { question: "Quanto vorresti essere pagato(RAL anno)(CONSIGLIO DI RISPONDERE no/non lo so se il paese scelto è l'italia?)" },
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
  const questionType = session.step < 4 ? "ikigai" : "additional";

  console.log(" Salvataggio su Mongo:", {
    id: userId,
    number_session: sessionNumber,
    question: prevQuestion,
    answer: userInput,
    step: session.step + 1,
    totalQuestions: session.flow.length,
    questionType: questionType,
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

  let nextMessage = "";

  // Se abbiamo appena finito le 12 domande ikigai (cioè step == 4)
  if (session.step === 4) {
    const transitionText = await getJobSuggestion(userId, sessionNumber);

    // Inserisci getJobSuggestion nel flow
    session.flow.splice(session.step, 0, { question: transitionText });
    sessions.set(sessionKey, session);

    nextMessage = transitionText;
  } else if (session.step >= session.flow.length) {
    // Siamo all'ultima domanda dopo ikigai, genera la conclusione con lavori
    nextMessage = await generateJobConclusion(userId, sessionNumber);
  } else {
    // Normale passaggio di domanda
    nextMessage =
      session.flow[session.step]?.question ??
      "Ottimo, hai finito le domande ora ti do la conclusione.";
  }

  console.log(
    `Step: ${session.step}/${session.flow.length} - Tipo: ${
      session.step <= 4 ? "ikigai" : "additional"
    }`
  );

  return {
    message: nextMessage,
    done: session.step >= session.flow.length,
  };
}

/*export async function chatbotLoopSimplified(
  userInput: string,
  userId: string,
  sessionNumber: string,
  isSimplified: string,
  topics: string[] = ["ingegenria meccanica"]
): Promise<void> {
  // TODO: implement function logic
  
}*/

export async function chatbotLoopSimplified(
  userInput: string,
  userId: string,
  sessionNumber: string,
  path: string,
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

  return {
    message:
      session.flow[session.step]?.question ??
      "Ottimo, hai finito le domande ora ti do la conclusione.",
    done: session.step >= session.flow.length,
  };
}