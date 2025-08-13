// chatUtils.ts
import { Dispatch, SetStateAction } from "react";


type Message = {
  sender: "user" | "bot";
  text: string;
};

export function sendFirstBotMessage(
  setMessages: Dispatch<SetStateAction<Message[]>>,
  setStage: Dispatch<SetStateAction<"askCV" | "waitingForCV" | "chatting">>,
  time: number
  
) {
  const timer = setTimeout(() => {
    setMessages([
      {
        sender: "bot",
        text: "Hi! Do you have a CV to upload? You can upload a PDF or just type your answer here.",
      },
    ]);
    setStage("waitingForCV");
  }, time);

  return () => clearTimeout(timer);
}
