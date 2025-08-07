import { getMcpClient } from "@/infrastructure/mcp/McpClient";

//Questions
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

  let session = sessions.get(userId);
  if (!session) {
    session = { step: 0 };
    sessions.set(userId, session);
  }

  const currentStep = session.step;

  // if input exists save the answer with current Question
  if (userInput && currentStep > 0) {
    const prevQuestion = flow[currentStep - 1].question;

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

  // if the questions are over
  /*
  if (currentStep >= flow.length) {
    sessions.delete(userId);
    return {
      message: "Thanks you have completed the questions, now give me some time to find the best job for you",
      done: true,
    };
  }*/

  // if not go for the next question
  const nextQuestion = flow[currentStep].question;
  if( session.step == 3){
    session.step = 0;
  }else{
     session.step += 1;
  }
  sessions.set(userId, session);

  return {
    message: nextQuestion,
    done: false,
  };
};
