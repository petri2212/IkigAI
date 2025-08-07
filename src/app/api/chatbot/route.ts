import { NextResponse } from "next/server";
import { chatbotLoop } from "@/application/chatbotLoop";

export async function POST(req: Request) {
  try {
    const { userInput, userId, session } = await req.json();

        //const result = await chatbotLoop(userId, token, userInput);
    const response = await chatbotLoop(userInput, userId, session);

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error("Chatbot API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
