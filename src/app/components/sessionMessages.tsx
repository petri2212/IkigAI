"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { FaUser } from "react-icons/fa";
import type { QAEntry, SessionData } from "@/app/api/getSessionMessages/route";
import { sendFirstBotMessage } from "./firstMessage";
import { Message } from "@/app/components/firstMessage";

type SessionMessagesProps = {
  uid: string;
  sessionId?: string;
};

export default function SessionMessages({
  uid,
  sessionId,
}: SessionMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<"askCV" | "waitingForCV" | "chatting">(
    "askCV"
  );
  const [isFetching, setIsFetching] = useState(false); // loading chat
  const [isTyping, setIsTyping] = useState(false); // bot typing
  const [hasStarted, setHasStarted] = useState(false); // For animation
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchSessionMessages = async (uid: string, sessionId: string) => {
    setIsFetching(true);

    try {
      const res = await fetch(
        `/api/getSessionMessages?uid=${uid}&sessionId=${sessionId}`
      );
      const data: SessionData = await res.json();

      if (data.q_and_a?.length) {
        const qnaMessages: Message[] = [];

        for (const entry of data.q_and_a) {
          console.log("CAREER COACH: ", entry.careerCoach);

          if (entry.careerCoach) {
            
            if (entry.answer && entry.answer.trim() !== "") {
              qnaMessages.push({ sender: "user", text: entry.answer });
            }
            qnaMessages.push({ sender: "bot", text: entry.question });
          } else {
           
            qnaMessages.push({ sender: "bot", text: entry.question });
            if (entry.answer && entry.answer.trim() !== "") {
              qnaMessages.push({ sender: "user", text: entry.answer });
            }
          }
        }

        setMessages(qnaMessages);
      } else {
        sendFirstBotMessage(setMessages, setStage, 0);
      }
    } catch (error) {
      console.error("Errore fetch session:", error);
      sendFirstBotMessage(setMessages, setStage, 0);
    } finally {
      setIsFetching(false);
      setHasStarted(true);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionMessages(uid, sessionId);
    } else {
      sendFirstBotMessage(setMessages, setStage, 2600);
    }
  }, [uid, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isFetching, isTyping]);

  return (
    <div>
      {/* Loader chat area */}
      {isFetching && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-lg font-semibold tracking-wide animate-pulse text-gray-700">
            Loading Chat...
          </p>
        </div>
      )}

      {!isFetching && (
        <>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start mt-10 gap-3 ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className="flex-shrink-0 w-9 h-9 mt-1 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-gray-700 shadow-sm">
                {msg.sender === "bot" ? (
                  <Image
                    src="/images/logo3.png"
                    alt="IkigAI Logo"
                    width={24}
                    height={20}
                    priority
                  />
                ) : (
                  <FaUser size={16} />
                )}
              </div>

              <div
                className="px-5 py-3 rounded-3xl text-base leading-relaxed shadow-md backdrop-blur-md"
                style={{
                  backgroundColor:
                    msg.sender === "user"
                      ? "#e5e7eb"
                      : "rgba(255, 255, 255, 0.4)",
                  color: "#111827",
                  maxWidth: "75%",
                }}
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}

          {/* Indicator typing */}
          {isTyping && (
            <div className="flex items-start gap-3 animate-pulse">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-gray-700 shadow-sm">
                <Image
                  src="/images/logo3.png"
                  alt="IkigAI Logo"
                  width={16}
                  height={16}
                  priority
                />
              </div>
              <div className="px-5 py-3 rounded-3xl text-base text-gray-600 italic bg-white/40 backdrop-blur-md shadow-md">
                Typing...
              </div>
            </div>
          )}
        </>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
