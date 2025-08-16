import { NextResponse } from "next/server";
import {
  chatbotLoopCompleted,
  chatbotLoopSimplified,
  careerCoachChat,
} from "@/application/chatbotLoop";
import { resolveSoa } from "node:dns";

export async function POST(req: Request) {
  try {
    const { userInput, userId, session, path, stage } = await req.json();

    let response: any;
    console.log("USER INPUT ", userInput);
     console.log("STAGE ", stage);

    if (path == "simplified") {
      if (stage === "careerCoach") {
        response = await careerCoachChat(userInput, userId, session,"simplified");
      } else {
        response = await chatbotLoopSimplified(
          userInput,
          userId,
          session,
          "simplified"
        );
      }
    } else {
      if (stage === "careerCoach") {
        response = await careerCoachChat(userInput, userId, session, "completed");
      } else {
        response = await chatbotLoopCompleted(
          userInput,
          userId,
          session,
          "completed"
        );
      }
    }

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error("Chatbot API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
