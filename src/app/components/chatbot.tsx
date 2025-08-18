"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation"; // lets you read the current URL's search parameters
import Link from "next/link";
import Image from "next/image";
import { Manrope } from "next/font/google"; // Font
import { handlePdfUpload } from "@/application/uploadPdf"; // Pdfhandler
import { auth } from "@/infrastructure/firebase/config"; // Get user id
import ReactMarkdown from "react-markdown"; // For indentation printing
// Icons
import { MdPictureAsPdf } from "react-icons/md";
import { VscNewFile } from "react-icons/vsc";
import { FaArrowCircleRight, FaUser } from "react-icons/fa";
import { HiX } from "react-icons/hi";

import { Typewriter } from "react-simple-typewriter"; // Typing animation

// Import chatHistory and Messages
import createNewSession from "../../application/createNewSession";
import ChatHistory, { ChatHistoryRef } from "./chatHistory";
import SessionMessages from "./sessionMessages";

import { Message } from "./firstMessage"; // Message model

// Main Chat Area Font
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});



export default function ChatPage() {
  const searchParams = useSearchParams();
  // Path determination
  const path = searchParams.get("path");
  const isSimplified = path === "simplified";
  // History refresh
  const historyRef = useRef<ChatHistoryRef>(null);
  // uid and session token
  const [uid, setUid] = useState<string | null>(null);
  // Session
  const sessionIdparam = searchParams.get("sessionId");
  const sessionID = sessionIdparam;
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Stages
  const [stage, setStage] = useState<
    "askCV" | "waitingForCV" | "chatting" | "careerCoach"
  >("waitingForCV");

  // Stick to the bottom when new chat messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Continuous focus on the textArea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // CHAT
  // Input textArea
  const [input, setInput] = useState("");
  // Chat messages
  const [messages, setMessages] = useState<Message[]>([]);
  // Loading bot answer
  const [isLoading, setIsLoading] = useState(false);
  // textArea Submit button
  const [hovered, setHovered] = useState(false);
  // Initial Animation
  const [hasStarted, setHasStarted] = useState(false);
  const [isFirst, setIsFirst] = useState(true);
  // New Chat Menu
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // PDF uploading animation
  const [PdfUploading, setPdfUploading] = useState(false);


  // Main colors based on path
  const accentColor = isSimplified ? "rgba(46, 105, 160, 1)" : "#2b9f55ff";
  const textColor = isSimplified ? "#1e3a8a" : "#2b9f55ff";
  const accentBg = isSimplified ? "var(--color-blue-light)" : "var(--color-green-light)";
  const accentHover = isSimplified ? "#1e3a8a" : "#16a34a";
  const placeholderColor = isSimplified ? "#95a6d6ff" : "#a4d695ff";
  const baseColor = "#6b7280";
  // BG images
  const imageSrc = isSimplified ? "/images/wallpaper1.png" : "/images/wallpaper2.png";

  // Clean chat messages and chatHistory refresh
  const handleSelectSession = () => {
    setMessages([]);
    setHasStarted(false);
    historyRef.current?.refresh();
  };

  // Hadle Submit of the input
  const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Set messages in the chat
    const userMessage: Message = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);

    // Clean Input
    setInput("");

    // Re-focus on Input after submit
    requestAnimationFrame(() => {
      const textArea = textareaRef.current;
      if (textArea) {
        textArea.focus();
        const len = textArea.value.length;
        textArea.setSelectionRange(len, len);
      }
    });

    // Await Bot response animation
    setIsLoading(true);

    try {
      if (!uid) return;

      if (stage === "waitingForCV") {
        setStage("chatting");
        console.log("sessionID");
        // First Universal Message
        const botResponse = await mockBotResponse(
          "__INIT__",
          uid,
          sessionID,
          path
        );
        // Print
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: botResponse.message },
        ]);
      } else if (stage === "chatting") {
        console.log("sessionID");
        // AI response
        const botResponse = await mockBotResponse(
          input.trim(),
          uid,
          sessionID,
          path
        );
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: botResponse.message },
        ]);

        // Carrer Coach
        if (botResponse.mode === "career_coach") {
          setStage("careerCoach");
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "OK, vuoi che ti faccia un piano personalizzato affinchè tu possa arrivare ai tuoi obiettivi?" },
          ]);
        }
      } else if (stage === "careerCoach") {
        // AI response
        const botResponse = await mockBotResponse(
          input.trim(),
          uid,
          sessionID,
          path,
          "careerCoach"
        );

        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: botResponse.message },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // New Chat
  const handleNewChat = () => {
    historyRef.current?.refresh();
    setMessages([]);
    setHasStarted(false);
  };

  // Scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Get uid
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        setUid(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Animation Effects
  useEffect(() => {
    if (!hasStarted && isFirst) {
      const timer0 = setTimeout(() => {
        setFadeOut(true);
      }, 2500);
      const timer1 = setTimeout(() => {
        setHasStarted(true);
        setIsFirst(false);
      }, 3000);

      return () => {
        clearTimeout(timer0);
        clearTimeout(timer1);
      };
    }
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted && !isFirst) {
      const timer0 = setTimeout(() => {
        setFadeOut(true);
      }, 200);
      const timer1 = setTimeout(() => {
        setHasStarted(true);
      }, 900);

      return () => {
        clearTimeout(timer0);
        clearTimeout(timer1);
      };
    }
  }, [hasStarted]);


  // Close "New Chat" Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // UI
  return (
    <div className="flex h-screen">
      {/* SIDEBAR */}
      <aside
        className={`flex flex-col bg-white border-r border-gray-300 transition-all duration-300 ${sidebarOpen ? "w-72" : "w-16"
          }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-2 h-16 border-gray-200 ">
          {sidebarOpen ? (
            <h2 className="text-xl font-bold">
              <Link
                href="/protected"
                className="flex items-center rounded-lg hover:bg-gray-100 transition p-2"
              >
                <Image
                  src="/images/logo3.png"
                  alt="IkigAI Logo"
                  width={35}
                  height={35}
                  priority
                />
              </Link>
            </h2>
          ) : (
            <p></p>
          )}
          {/* Sidebar: Open/Close */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1 rounded hover:bg-gray-200 transition"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <HiX className="h-7 w-7 text-stone-600" />
            ) : (
              <Image
                src="/images/logo3.png"
                alt="IkigAI Logo"
                width={35}
                height={35}
                priority
              />
            )}
          </button>
        </div>

        <div>
          {/* SIDEBAR OPEN */}
          {sidebarOpen ? (
            <div className="relative inline-block" ref={menuRef}>

              {/* Open Menu Button */}
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-67 ml-2 px-3 py-2 flex items-center gap-2 rounded-lg transition-colors duration-100 hover:bg-gray-100 text-lg font-medium"
                style={{ color: accentColor }}
              >
                <VscNewFile className="text-2xl" />
                New Chat
              </button>

              {/* Menu */}
              {isOpen && (
                <div className="w-67 ml-2 absolute left-0 mt-1 bg-white border rounded-lg shadow-lg">
                  <Link
                    href={{
                      pathname: "/protected/c",
                      query: { path: "simplified", sessionId: createNewSession() },
                    }}
                    onClick={handleNewChat}
                    className="block flex justify-center px-4 py-2 hover:bg-blue-100/80 text-blue-700"
                  >
                    Simplified
                  </Link>
                  <Link
                    href={{
                      pathname: "/protected/c",
                      query: { path: "completed", sessionId: createNewSession() },
                    }}
                    onClick={handleNewChat}
                    className="block flex justify-center px-4 py-2 hover:bg-green-100/80 text-green-700"
                  >
                    Completed
                  </Link>
                </div>
              )}
            </div>
          ) : (

            <div className="relative inline-block" ref={menuRef}>
              {/* SIDEBAR CLOSED */}

              {/* Open Menu Button */}
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="ml-2 px-3 py-2 flex items-center gap-2 rounded-lg transition-colors duration-100 hover:bg-gray-100 hover:w-12 text-lg font-medium"
                style={{ color: accentColor }}
              >
                <VscNewFile className="text-2xl" />
              </button>

              {/* Menu */}
              {isOpen && (
                <div className="w-67 ml-2 absolute left-0 mt-1 bg-white border rounded-lg shadow-lg z-60">
                  <Link
                    href={{
                      pathname: "/protected/c",
                      query: { path: "simplified", sessionId: createNewSession() },
                    }}
                    onClick={handleNewChat}
                    className="block flex justify-center px-4 py-2 hover:bg-blue-100/80 text-blue-700"
                  >
                    Simplified
                  </Link>
                  <Link
                    href={{
                      pathname: "/protected/c",
                      query: { path: "completed", sessionId: createNewSession() },
                    }}
                    onClick={handleNewChat}
                    className="block flex justify-center px-4 py-2 hover:bg-green-100/80 text-green-700"
                  >
                    Completed
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Chat Button */}
        {/* Is not shown when sidebar is closed */}
        {sidebarOpen ? (
          <ChatHistory uid={uid!} ref={historyRef} onSelectSession={handleSelectSession} />
        ) : (
          <p></p>
        )}
      </aside>

      {/* MAIN CHAT AREA */}
      <main
        className={`flex flex-col flex-1 ${manrope.className}`}
        style={{
          backgroundImage: `url('${imageSrc}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 shadow-sm backdrop-blur-sm z-50">
          <h1 className="text-2xl font-semibold text-gray-800">
            Chat with IkigAI
          </h1>

          {path && (
            <span
              className="px-4 py-1 rounded-full text-sm font-medium select-none whitespace-nowrap"
              style={{
                backgroundColor: accentBg,
                color: accentColor,
                border: `1px solid ${accentColor}`,
              }}
            >
              {isSimplified ? "Simplified Path" : "Complete Path"}
            </span>
          )}
        </div>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 transition-all duration-300 relative">
          <div className="max-w-[60%] mx-auto space-y-4">
            {/* IF is the fist time: Welcome message*/}
            {!hasStarted ? (
              <div
                className={`flex-1 flex items-start justify-center transition-opacity duration-400 mt-[40%]`}
                style={{ opacity: fadeOut ? 0 : 1 }}
              >
                <div className="text-center max-w-md bg-white/70 backdrop-blur-md rounded-lg text-4xl font-semibold mb-4 ">
                  {/* IF is the fist time: Welcome message*/}
                  {isFirst ? (
                    <Typewriter
                      words={["Welcome to IkigAI"]}
                      loop={true}
                      typeSpeed={100}
                    />
                  ) : (
                    <p></p>
                  )}

                </div>
              </div>
            ) : (
              <div>
                {/* Search for messages using sessionID and uid */}
                <SessionMessages uid={uid!} sessionId={sessionID!} />
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start mt-10 gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 mt-1 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-gray-700 shadow-sm">
                      {/* Icons */}
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
                    {/* Messages bg colors */}
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
                      {/* Output */}
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {/* Loading animation */}
                {isLoading && (
                  <div className="flex items-start gap-3 mt-10 animate-pulse">
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
                {/* PDF uploading animation */}
                {PdfUploading && (
                  <div className="flex items-start gap-3 mt-10 animate-pulse">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-gray-700 shadow-sm">
                      <Image
                        src="/images/logo3.png"
                        alt="IkigAI Logo"
                        width={16}
                        height={16}
                        priority
                      />
                    </div>
                    <div className="px-5 py-3 rounded-3xl text-base text-gray-600 italic bg-white/40 backdrop-blur-md shadow-md flex items-center gap-2">
                      <MdPictureAsPdf style={{ fontSize: "1.5rem" }} />
                      Uploading PDF
                    </div>

                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* INPUT AREA */}
        <form
          onSubmit={handleSubmit}
          className={`mx-auto flex items-center justify-center gap-2 w-full max-w-[60%] backdrop-blur-md bg-white/70 transition-all duration-450
                    ${!isFirst
              ? "sticky bottom-10"
              : "sticky bottom-[25%] translate-y"
            }
                    `}
          style={{
            borderColor: accentColor,
            minHeight: "60px",
          }}
        >
          <div className="relative flex-1">
            {/* Upload Button */}
            <label
              className="absolute left-3 top-8 cursor-pointer transition-colors"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <MdPictureAsPdf
                style={{
                  color: hovered ? accentHover : baseColor,
                  fontSize: "1.5rem",
                }}
              />
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files?.[0]) {
                    const file = e.target.files[0];
                    if (uid && sessionID) {
                      try {
                        setPdfUploading(true);
                        const result = await handlePdfUpload(
                          file,
                          uid,
                          sessionID
                        );

                        if (result.success) {
                          setPdfUploading(false);
                          setMessages((prev) => [
                            ...prev,
                            { sender: "bot", text: "The PDF is uploaded." },
                          ]);
                          setStage("chatting");
                          setIsLoading(true);
                          try {
                            const botResponse = await mockBotResponse(
                              "__INIT__",
                              uid,
                              sessionID,
                              path
                            );
                            setMessages((prev) => [
                              ...prev,
                              { sender: "bot", text: botResponse.message },
                            ]);
                          } catch {
                            setMessages((prev) => [
                              ...prev,
                              {
                                sender: "bot",
                                text: "Something went wrong. Please try again.",
                              },
                            ]);
                          } finally {
                            setIsLoading(false);
                          }
                        } else {
                          setPdfUploading(false);
                          setMessages((prev) => [
                            ...prev,
                            { sender: "bot", text: "Failed to upload PDF." },
                          ]);
                        }
                      } catch (err) {

                        setMessages((prev) => [
                          ...prev,
                          { sender: "bot", text: "Error uploading PDF." },
                        ]);
                      }
                    } else {
                      console.error(
                        "User ID or session ID is null. Cannot upload PDF."
                      );
                    }
                  }
                }}
              />
            </label>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              autoFocus
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="w-full border rounded-lg pl-14 pr-14 py-2 focus:outline-none focus:ring-2 font-mono text-base resize-none whitespace-pre-wrap"
              rows={3}
              style={{
                borderColor: accentColor,
                backgroundColor: "transparent",
                color: textColor,
              }}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl transition disabled:opacity-50"
              style={{
                color: input.trim() ? accentColor : placeholderColor,
                cursor: input.trim() ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (input.trim()) e.currentTarget.style.color = accentHover;
              }}
              onMouseLeave={(e) => {
                if (input.trim()) e.currentTarget.style.color = accentColor;
              }}
            >
              <FaArrowCircleRight />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

interface BotResponse {
  message: string;
  done: boolean;
  mode?: "career_coach";
}

async function mockBotResponse(
  userInput: string,
  uid: string | null,
  session: string | null,
  path: string | null,
  stage?: string
): Promise<BotResponse> {
  const res = await fetch("/api/chatbot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userInput,
      userId: uid,
      session,
      path,
      stage,
    }),
  });

  const data = await res.json();

  // Ritorna tutto l'oggetto, non solo il testo
  return data.response as BotResponse;
}
