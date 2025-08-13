import { NextResponse } from "next/server";
import { chatbotLoopCompleted, chatbotLoopSimplified } from "@/application/chatbotLoop";

export async function POST(req: Request) {
  try {
    const { userInput, userId, session , isSimplified } = await req.json();

    let response: any;

    if(isSimplified){
        response = await chatbotLoopSimplified(userInput, userId, session, isSimplified);
    }else{
     response = await chatbotLoopCompleted(userInput, userId, session, isSimplified);
    }
   

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error("Chatbot API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
