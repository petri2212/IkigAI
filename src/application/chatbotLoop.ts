import { ToolResponse } from "@/domain/toolResponse";
import { getMcpClient } from "@/infrastructure/mcp/McpClient";
import { parsePdfBase64 } from "@/tools/parsePdf";
import { OpenAI } from "openai";

let conclusion = false;
const careerPlanGenerated: Map<string, boolean> = new Map();
let message: string;
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

// detects user request
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
    "?",
  ];
  if (trimmed.endsWith("?")) return true;
  const lower = trimmed.toLowerCase();
  for (const w of questionWords) {
    if (lower.startsWith(w + " ") || lower.startsWith(w + "?")) return true;
  }
  return false;
}

/*Ikigai (生き甲斐) is a Japanese term that roughly translates as “reason for being” or “purpose in life.” It has no direct translation in English, but it encompasses the concept of finding joy and meaning in life, something that motivates you to get up every morning. It is the combination of what you love, what you are good at, what the world needs, and what you can be paid for.

Here are the key points of ikigai:

Passion: What you love to do, what you are passionate about and what motivates you.
Mission: What the world needs, your contribution to society.
Vocation: What you are good at, your skills and talents.
Profession: What you can be paid for, your job.

GENERATE EXACTLY 12 QUESTIONS, one per line:
- 4 questions about PASSION
- 4 questions about MISSION
- 4 questions about VOCATION
- 4 questions about PROFESSION

The questions should be medium-short, clear, and in English, suitable for young people who don't know what to do with their lives.

REQUIRED FORMAT:
Write each question on a separate line, without numbers, bullet points, or separators. Just the questions themselves.*/

// Genera 4 domande dall'AI su argomenti dati
async function generateQuestions(
  topics: string[]
): Promise<{ question: string }[]> {
  const prompt = `Ikigai (生き甲斐) is a Japanese term that roughly translates as “reason for being” or “purpose in life.” 
  It has no direct translation in English, but it encompasses the concept of finding joy and meaning in life, 
  something that motivates you to get up every morning. It is the combination of what you love, what you are good at,
  what the world needs, and what you can be paid for.

Here are the key points of ikigai:

Passion: What you love to do, what you are passionate about and what motivates you.
Mission: What the world needs, your contribution to society.
Vocation: What you are good at, your skills and talents.
Profession: What you can be paid for, your job.

GENERATE EXACTLY 12 QUESTIONS, one per line:
- 4 questions about PASSION
- 4 questions about MISSION
- 4 questions about VOCATION
- 4 questions about PROFESSION

The questions should be medium-short, clear, and in English, suitable for young people who don't know what to do with their lives.

REQUIRED FORMAT:
Write each question on a separate line, without numbers, bullet points, or separators. Just the questions themselves.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant who generates exactly 12 questions, one per line, without numbering.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 800, 
    temperature: 0.5, // reducted for more coherence
  });

  const text = completion.choices[0].message.content ?? "";

  // DEBUG: Stampa il testo grezzo
  //console.log("🔍 Testo grezzo dall'AI:", text);
  //console.log("🔍 Righe totali:", text.split("\n").length);

  const questions = text
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.length > 5) 
    .filter((q) => !/^[-–—\s]*$/.test(q)) // eliminate empty strings or with only dashes
    .filter((q) => !q.toLowerCase().includes("passione") || q.includes("?")) // remove headers
    .filter((q) => !q.toLowerCase().includes("missione") || q.includes("?"))
    .filter((q) => !q.toLowerCase().includes("vocazione") || q.includes("?"))
    .filter((q) => !q.toLowerCase().includes("professione") || q.includes("?"))
    .map((q) => q.replace(/^[-•\d.\s]+/, "")) // removes bullet/initial number
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 12) // take a maximum of 12
    .map((q) => ({ question: q }));

 // console.log(" Domande finali parsate:", questions.length);
   console.log(" Questions parsed:", questions);

  return questions;
}

// Responds to external questions with AI (deprecated)
async function answerExternalQuestion(question: string): Promise<string> {
  const prompt = `You are an experienced virtual assistant. Answer the question simply and comprehensively:\n${question}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are an experienced virtual assistant." },
      { role: "user", content: prompt },
    ],
    max_tokens: 100,
    temperature: 0.6,
  });

  return (
    completion.choices?.[0]?.message?.content?.trim() ??
    "I don't know how to answer to this question."
  );
}

//job suggestion with CV and session information
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
      console.warn(`CV dont found for user ${userId}`);
    }
  } catch (err) {
    console.error("Error retrieve CV MCP:", err);
  }

  // recovery session
  try {
    const sessionResponse = (await mcp.callTool({
      name: "get-session-data",
      arguments: { id: userId, number_session: sessionNumber },
    })) as ToolResponse;

    if (sessionResponse.content?.[0]?.text) {
      sessionData = sessionResponse.content[0].text;
    } else {
      console.warn(
        `Session ${sessionNumber} not found for user ${userId}`
      );
    }
  } catch (err) {
    console.error("Error recovery session MCP:", err);
  }
  /*
  console.log(
    "DEBUG - tipo cvBase64:",
    typeof cvBase64,
    cvBase64?.substring(0, 100)
  );

  
console.log("DEBUG - CV Base64:", cvBase64?.substring(0, 100) + "..."); // Mostra solo i primi 100 caratteri
console.log("DEBUG - Session Data:", sessionData);
/*
  return `Perfetto! Hai completato la prima parte dell'ikigai.
CV recuperato: ${cvBase64 ? "✅" : "❌"}
Sessione recuperata: ${sessionData ? "✅" : "❌"}

CHE LAVORO SCEGLI`;*/


  // Decode PDF in Text
  let cvText = "";
  if (cvBase64 && cvBase64.startsWith("JVBER")) {
    // The PDF Base64 typically begin with "JVBER"
    try {
      cvText = await parsePdfBase64(cvBase64);
      if (!cvText || cvText.trim().length === 0) {
        cvText = "CV not readable";
      }
    } catch (err) {
      console.error("Error decode CV:", err);
      cvText = "Error in reading CV";
    }
  } else {
    console.warn("CV Base64 non valid or absent, skip parsing PDF.");
    cvText = cvBase64 ? "CV in PDF format" : "CV not inserted";
  }
  /*
console.log("DEBUG - CV Base64:", cvText?.substring(0, 100) + "..."); // Mostra solo i primi 100 caratteri
console.log("DEBUG - Session Data:", sessionData);
*/
  if (!cvText && !sessionData) {
    return "There is insufficient data to generate job suggestions.";
  }

  // Prompt for AI
  const prompt = `
You have access to the user's CV (text) and session data.
Carefully analyze the CV and session to understand skills, experience, passions, and personality.

Objective: suggest 3 jobs that are as relevant as possible to the CV, and 3 additional jobs based on the personality of the session.

Return only the jobs, one per line, without explanations:
CV: ${cvText || "Not available "}
Session: ${sessionData || "Not available"}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an experienced career coaching assistant..",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 800,
    temperature: 0.6,
  });

  const jobsText = completion.choices[0].message.content ?? "";

  return `Perfect! Here are the job suggestions based on your CV and session:\n\n${jobsText} \n\n\n\n Choose one, or request more information about a specific job.`;
}

// Find a profession through session information if the user don't upload CV
async function inferSkillsFromCV(
  userId: string,
  sessionNumber: string
): Promise<string | null> {
  const mcp = await getMcpClient();
  let cvBase64 = "";

  // Retrieve CV
  try {
    const cvResponse = (await mcp.callTool({
      name: "get-pdf-from-mongo",
      arguments: { id: userId, session: sessionNumber },
    })) as ToolResponse;

    if (cvResponse.content?.[0]?.text) {
      cvBase64 = cvResponse.content[0].text;
    } else {
      console.warn(`CV absent for user ${userId}`);
      return null;
    }
  } catch (err) {
    console.error("Error retrieve CV MCP:", err);
    return null;
  }

  // If CV is available we request to mcp tool to give us a profession
  try {
    const aiResponse = (await mcp.callTool({
      name: "analyze-cv-for-skill",
      arguments: {
        cvBase64: cvBase64,
      },
    })) as ToolResponse;

    if (aiResponse.content?.[0]?.text) {
      return aiResponse.content[0].text.trim();
    } else {
      console.warn(`AI did not suggest any skills for users. ${userId}`);
      return null;
    }
  } catch (err) {
    console.error("CV analysis error with AI:", err);
    return null;
  }
}

//generate Jobconclusion
async function generateJobConclusion(
  userId: string,
  sessionNumber: string
): Promise<string> {
  const mcp = await getMcpClient();
  try {
    // Retrieve session data
    const sessionResponse = (await mcp.callTool({
      name: "get-session-data",
      arguments: { id: userId, number_session: sessionNumber },
    })) as ToolResponse;

    console.log("session number", sessionNumber);
    console.log("userId", userId);

    if (!sessionResponse.content?.[0]?.text) {
      return "I was unable to retrieve the session data for the job search.";
    }

    // Parsing JSON of session
    const sessionDataRaw = JSON.parse(sessionResponse.content[0].text);
    const responses = sessionDataRaw.session.q_and_a.map((entry: any) => ({
      question: entry.question,
      answer: entry.answer,
    }));

    // Questions of interest for jobs
    const jobQuestions = [
      "Perfect! Here are some job suggestions based on your CV and session: ",
      "In which country would you like to work? Choose from these options: Italy, France, England, Germany, Poland ",
      "In which city would you like to work? ",
      "Would you like a part-time or full-time job? ",
      "Do you have a specific company in mind? Enter the name. ",
      "How much would you like to be paid? ",
    ];

    const jobAnswers = jobQuestions.map((question) => {
      const found = responses.find((r: any) =>
        r.question.includes(question.substring(0, 20))
      );
      return found?.answer || "";
    });

    const [skills, paese, citta, tipoContratto, azienda, stipendio] =
      jobAnswers;

    //Helper for normalizing empty responses
    const normalizeAnswer = (answer: string) => {
      const emptyValues = ["n","non specificato", "non lo so", "no", "nessuna", "", "idk", "i don't know", "nothing", "i don't have preferencies"];
      return emptyValues.includes(answer.trim().toLowerCase()) ? "" : answer;
    };

    // Mapping countries
    const countryMap: { [key: string]: string } = {
      italia: "it",
      italy: "it",
      francia: "fr",
      france: "fr",
      inghilterra: "gb",
      gb:"gb",
      de:"de",
      pl:"pl",
      it:"it",
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
    let skillsArg = normalizeAnswer(skills);

    console.log("DEBUG SKILLS:", skillsArg);
    console.log("DEBUG countryCode:", countryCode);
    console.log("DEBUG locationArg:", locationArg);
    console.log("DEBUG jobTypeArg:", jobTypeArg);
    console.log("DEBUG companyArg:", companyArg);
    console.log("DEBUG salaryArg:", salaryArg);

    if (!skillsArg) {
      const inferredSkill = await inferSkillsFromCV(userId, sessionNumber);
      if (inferredSkill) {
        skillsArg = inferredSkill;
        console.log(`Skills inferred from CV: ${skillsArg}`);
      } else {
        console.warn("No skills inferred from CV, skillsArg remains empty");
      }
    }

    // Call tool MCP for search Job
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
      return "I couldn't find any jobs matching your criteria.";
    }

    const responseText = jobsResponse.content?.[0]?.text || "";
    let jobs: any[] = [];
    try {
      jobs = JSON.parse(responseText.replace(/^DEBUG URL:.*\n/, ""));
      console.log("DEBUG JOBS API:", jobs);
    } catch (err) {
      console.log("DEBUG RAW JOBS RESPONSE:", responseText);
    }

    // Generation conclusion with AI
    const prompt = `
You are an experienced career coach. Based on the following data:

USER PREFERENCES:
- Country: ${paese}
- City: ${citta}  
- Contract type: ${tipoContratto}
- Preferred company: ${azienda}
- Desired salary: ${stipendio}

JOBS FOUND:
${jobs
  .map(
    (j) => `Title: ${j.title}
Company: ${j.company}
Location: ${j.location}
Contract: ${j.contract_type}
Salary: ${j.salary_min} - ${j.salary_max}
Description: ${j.description}
URL: ${j.url}`
  )
  .join("\n\n")}

Write a professional conclusion that:
1. Summarizes the user's preferences
2. Presents the jobs found in an appealing way
3. Gives practical advice for applying
Put the most important information in bold.


Keep the tone professional but friendly. Limit it to 500 words (so summarize if necessary). As the last sentence of the message, ask them, “OK, would you like me to create a personalized plan for you to achieve your goals?”".
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an experienced career coach." },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ??
      "Congratulations on completing the Ikigai journey!"
    );
  } catch (err) {
    console.error("Errore generazione conclusione lavori:", err);
    return "An error occurred while searching for jobs.";
  }
}

// Retrieve user DATA
async function getUserData(
  userId: string,
  sessionNumber: string
): Promise<{ cvText: string; sessionData: string }> {
  const mcp = await getMcpClient();
  let cvBase64: string | undefined;
  let sessionData: string = "";

  // retrieve CV
  try {
    const cvResponse = (await mcp.callTool({
      name: "get-pdf-from-mongo",
      arguments: { id: userId, session: sessionNumber },
    })) as ToolResponse;
    cvBase64 = cvResponse.content?.[0]?.text;
  } catch (err) {
    console.error("Error retrieve CV MCP:", err);
  }

  // Retrieve session
  try {
    const sessionResponse = (await mcp.callTool({
      name: "get-session-data",
      arguments: { id: userId, number_session: sessionNumber },
    })) as ToolResponse;
    sessionData = sessionResponse.content?.[0]?.text ?? "";
  } catch (err) {
    console.error("Errore retrieve session MCP:", err);
  }

  // decoding PDF
  let cvText = "";
  if (cvBase64 && cvBase64.startsWith("JVBER")) {
    try {
      cvText = await parsePdfBase64(cvBase64);
      if (!cvText || cvText.trim().length === 0) cvText = "CV not readable";
    } catch (err) {
      console.error("Error Decod CV:", err);
      cvText = "Error reading CV";
    }
  } else {
    cvText = cvBase64 ? "CV not in PDF format" : "CV not entered";
  }

  return { cvText, sessionData };
}

// Generate Career Plan
async function generateCareerPlan(
  cvText: string,
  sessionData: string
): Promise<string> {
  const prompt = `
You are an experienced virtual career coach.
You have access to the user's CV and session data.
Carefully analyze and draw up a personalized plan to achieve the user's goals.
Respond in a clear, practical, and detailed manner. (The entire text must be less than 1000 words.)
Put the most important information in bold. 

CV: ${cvText || "Not available"}
Session: ${sessionData || "Not available"}
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an experienced virtual career coach." },
      { role: "user", content: prompt },
    ],
    max_tokens: 1000,
    temperature: 0.6,
  });

  return (
    completion.choices?.[0]?.message?.content?.trim() ??
    "I was unable to generate a plan."
  );
}

// answer user question 
async function answerUserQuestion(
  userInput: string,
  sessionData: string
): Promise<string> {
  const prompt = `
You are an experienced virtual career coach.
You have access to the user's session data.
Answer the following question clearly and practically:

Question: ${userInput}

Session: ${sessionData || "Not available"}
If the question is a thank you or something similar, thank them, and then ask if they need anything else.
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an experienced virtual career coach." },
      { role: "user", content: prompt },
    ],
    max_tokens: 400,
    temperature: 0.6,
  });

  return (
    completion.choices?.[0]?.message?.content?.trim() ??
   "I don't know how to answer that question. "
  );
}

//chatbotLoopCompleted
export async function chatbotLoopCompleted(
  userInput: string,
  userId: string,
  sessionNumber: string,
  path: string,
  topics: string[] = ["ingegneria meccanica"] // corretto il typo
): Promise<{ message: string; done: boolean; mode?: "career_coach" }> {
  const mcp = await getMcpClient();
  const sessionKey = `${userId}-${sessionNumber}`;

  let session = sessions.get(sessionKey);

  // Additional questions
  const additionalQuestions = [
     {
      question:
        "In which country would you like to work? Choose from the following options: Italy, France, England, Germany, Poland",
    },
    { question: "In which city would you like to work?" },
    {
      question:
        "Would you like a part-time or full-time job? (RECOMMENDED ANSWER: no/I don't know if the country chosen is Italy)"
    },
    { question: "Do you have a specific company in mind? Enter the name (otherwaise write no)." },
    {
      question:
        "How much would you like to be paid (annual gross salary)? (RECOMMENDED ANSWER: no/I don't know if the country selected is Italy.)"
    },
  ];

  // If new session, generate questions from AI + additional questions
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
  if (userInput === "__INIT__" || userInput === "__INIT__1") {
    return {
      message: session.flow[0].question,
      done: false,
    };
  }
   
 if (isUserAskingQuestion(userInput)) {
    const { sessionData } = await getUserData(userId, sessionNumber);
    const aiAnswer = await answerUserQuestion(userInput, sessionData);
    return { message: aiAnswer, done: false};
  }

  // Unless previously answered in MCP
  const prevQuestion = session.flow[session.step].question;

  // Determine the type of query for the log
  const questionType = session.step < 4 ? "ikigai" : "additional";

  console.log(" Salvataggio su Mongo:", {
    id: userId,
    number_session: sessionNumber,
    question: prevQuestion,
    answer: userInput,
    step: session.step + 1,
    totalQuestions: session.flow.length,
    questionType: questionType,
  }, "conclusione: ", conclusion);

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
    console.error("MCP data saving error:", err);
  }

   // If you finish all the questions (ikigai + additional)
  if (conclusion) {
    console.log("SIAMO AL CAREER COACH BABY, session stesp ", session.step)
    sessions.delete(sessionKey);
    return {
       message: "I will proceed to create the personalized plan...",
        done: true,
        mode: "career_coach", // <--- new flag
      };
  }

  session.answers.push(userInput);

  // next question
  session.step += 1;
  sessions.set(sessionKey, session);

  let nextMessage = "";

  // If we have just finished the 12 ikigai questions (i.e., step == 12)
  if (session.step === 12) {
    const transitionText = await getJobSuggestion(userId, sessionNumber);

    // Insert getJobSuggestion in the flow
    session.flow.splice(session.step, 0, { question: transitionText });
    sessions.set(sessionKey, session);

    nextMessage = transitionText;
  } else if (session.step >= session.flow.length) {
    // We are at the last question after ikigai, generate the conclusion with jobs
    const conclusionText = await generateJobConclusion(userId, sessionNumber);
    session.flow.splice(session.step, 0, { question: conclusionText });
    sessions.set(sessionKey, session);
    nextMessage = conclusionText;
    conclusion = true; console.log("conclusione: ", conclusion)
  } else {
    // Normal application process
    nextMessage =
      session.flow[session.step]?.question ??
      "Great, you've finished the questions, now I'll give you the conclusion.";
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

//chatbotLoopSimplified
export async function chatbotLoopSimplified(
  userInput: string,
  userId: string,
  sessionNumber: string,
  path: string
): Promise<{ message: string; done: boolean; mode?: "career_coach" }> {
  const mcp = await getMcpClient();
  const sessionKey = `${userId}-${sessionNumber}`;

  let session = sessions.get(sessionKey);

   const preQuestions = [
    { question: "Can you tell me about your main skills?" },
    { question: "What are your main interests?" },
    { question: "Can you tell me a little about your professional background?" },
  ];


  const additionalQuestions = [
    {
      question:
        "In which country would you like to work? Choose from the following options: Italy, France, England, Germany, Poland",
    },
    { question: "In which city would you like to work?" },
    {
      question:
        "Would you like a part-time or full-time job? (RECOMMENDED ANSWER: no/I don't know if the country chosen is Italy)"
    },
    { question: "Do you have a specific company in mind? Enter the name (otherwaise write no)." },
    {
      question:
        "How much would you like to be paid (annual gross salary)? (RECOMMENDED ANSWER: no/I don't know if the country selected is Italy.)"
    },
  ];

  // new session
  if (!session) {
    const flow = userInput === "__INIT__" ? [...preQuestions, ...additionalQuestions] : [...additionalQuestions];
    session = { step: 0, answers: [], flow };
    sessions.set(sessionKey, session);
  }

  // Initialization
  if (userInput === "__INIT__" || userInput === "__INIT__1" ) {
    return { message: session.flow[0].question, done: false };
  }

  // External question
  if (isUserAskingQuestion(userInput)) {
    const { sessionData } = await getUserData(userId, sessionNumber);
    const aiAnswer = await answerUserQuestion(userInput, sessionData);
    return { message: aiAnswer, done: false};
  }

  // Unless previously answered in MCP
  const prevQuestion = session.flow[session.step].question;

  // Determine the type of query for the log
  const questionType = session.step < 4 ? "ikigai" : "additional";

  console.log(" Salvataggio su Mongo:", {
    id: userId,
    number_session: sessionNumber,
    question: prevQuestion,
    answer: userInput,
    step: session.step + 1,
    totalQuestions: session.flow.length,
    questionType: questionType,
  }, "conclusione: ", conclusion);

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
    console.error("MCP data saving error:", err);
  }

   // Se finite tutte le domande (ikigai + aggiuntive)
  if (conclusion) {
    console.log("SIAMO AL CAREER COACH BABY, session stesp ", session.step)
    sessions.delete(sessionKey);
    return {
       message: "I will proceed to create the personalized plan...",
        done: true,
        mode: "career_coach", 
      };
  }

  session.answers.push(userInput);

  // next question
  session.step += 1;
  sessions.set(sessionKey, session);

  let nextMessage = "";
if (session.step >= session.flow.length) {
    // We are at the last question after ikigai, generate the conclusion with jobs
    const conclusionText = await generateJobConclusion(userId, sessionNumber);
    session.flow.splice(session.step, 0, { question: conclusionText });
    sessions.set(sessionKey, session);
    nextMessage = conclusionText;
    conclusion = true; console.log("conclusione: ", conclusion)
  } else {
    // Normal application process
    nextMessage =
      session.flow[session.step]?.question ??
      "Great, you've finished the questions, now I'll give you the conclusion.";
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

//careerCoach phase function
export async function careerCoachChat(
  userInput: string,
  userId: string,
  sessionNumber: string,
  path: string,
  careerCoach: boolean
): Promise<{ message: string }> {
  const key = `${userId}-${sessionNumber}`;
  const mcp = await getMcpClient();
  conclusion = false; console.log("conclusione: ", conclusion)

  // 1. Recover user data
  const { cvText, sessionData } = await getUserData(userId, sessionNumber);

  

  // 2. If it's your first time, I'll create the plan.
  if (!careerPlanGenerated.get(key)) {
    
    message = await generateCareerPlan(cvText, sessionData);
    careerPlanGenerated.set(key, true);

    console.log(" Salvataggio su Mongo:", {
      id: userId,
      number_session: sessionNumber,
      question: message,
      answer: "__GENERATE_CAREER_PLAN__: on mongo i save +",
      path: path,
    });

    // Saving on sesison MCP
    try {
      await mcp.callTool({
        name: "save-session-data",
        arguments: {
          id: userId,
          number_session: sessionNumber,
          question: message,
          answer: "+",
          path: path,
        },
      });
      console.log("Plan saved on MCP:", message);
    } catch (err) {
      console.error("Error saving plan on MCP:", err);
    }

    return { message };
  }

  // 3. After the first time, I only answer the user's questions.
  message = await answerUserQuestion(userInput, sessionData);

   // Saving question/answer in session
  try {
    await mcp.callTool({
      name: "save-session-data",
      arguments: {
        id: userId,
        number_session: sessionNumber,
        question: message,
        answer: userInput,
        path: path,
        careerCoach:careerCoach,
      },
    });
    console.log("Question/answer saved on MCP:", {
      question: userInput,
      answer: message,
    });
  } catch (err) {
    console.error("Error saving question/answer on MCP:", err);
  }

  return { message };
}

export { parsePdfBase64 };

