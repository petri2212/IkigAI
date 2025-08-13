"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { HiX, HiMenu } from "react-icons/hi";
import Link from "next/link";
import Image from "next/image";
import { FaArrowCircleRight, FaPlus, FaRobot, FaUser } from "react-icons/fa";
import { Manrope } from "next/font/google";
import { handlePdfUpload } from "@/application/uploadPdf";
//in order to get user id
import { auth } from "@/infrastructure/firebase/config";
//i need uuid for creating a unique session token
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { TbNewSection } from "react-icons/tb";
import { MdPictureAsPdf } from "react-icons/md";
import { VscNewFile } from "react-icons/vsc";
import { Typewriter } from 'react-simple-typewriter'
//const newSessionId = uuidv4();
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"], // pesi che ti servono
});

type Message = {
  sender: "user" | "bot";
  text: string;
};

type ChatHistoryItem = {
  id: string;
  title: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path");
  // Determino colore e nome percorso
  const isSimplified = path === "simplified";
  // uid and session token
  const [uid, setUid] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  //const [sessionNumber, setSessionNumber] = useState<string | null>(null);
  // Sidebar aperta/chiusa
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Chat history dummy
  const [chatHistory] = useState<ChatHistoryItem[]>([
    { id: "1", title: "Chat with IkigAI 1" },
    { id: "2", title: "Chat with IkigAI 2" },
  ]);

  //FLUSSO
  const [stage, setStage] = useState<"askCV" | "waitingForCV" | "chatting">(
    "askCV"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Messaggi chat
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setUid(user.uid);
        setSessionToken(token);

        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        console.log("🟢 Nuova sessione generata:", newSessionId);
      } else {
        setUid(null);
        setSessionToken(null);
        setSessionId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const timer = setTimeout(() => {
      setMessages([
        {
          sender: "bot",
          text: "Hi! Do you have a CV to upload? You can upload a PDF or just type your answer here.",
        },
      ]);
      setStage("waitingForCV");
    }, 3100);

    return () => clearTimeout(timer);
  }, [uid]);


  useEffect(() => {
    if (!hasStarted) {
      const timer0 = setTimeout(() => {
        setFadeOut(true);
      }, 2500);
      const timer1 = setTimeout(() => {
        setHasStarted(true);
      }, 3000);

      return () => {
        clearTimeout(timer0);
        clearTimeout(timer1);
      };
    }
  }, [hasStarted]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (!uid) return;

      if (stage === "waitingForCV") {
        // L'utente ha risposto a domanda CV in chat
        setStage("chatting");

        // Risposta bot che va avanti con domande AI
        const botResponse = await mockBotResponse("__INIT__", uid, sessionId, isSimplified);
        setMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
      } else {
        // Stadio chatting normale, continua con il mockBotResponse
        const botResponse = await mockBotResponse(input.trim(), uid, sessionId, isSimplified );
        setMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
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

  const handleNewChat = () => {
    setMessages([]);
  };

  // Classi dinamiche per colore principale e sfondo gradiente
  const accentColor = isSimplified ? "rgba(46, 105, 160, 1)" : "#2b9f55ff";
  const textColor = isSimplified ? "#1e3a8a" : "#2b9f55ff";
  const accentBg = isSimplified
    ? "var(--color-blue-light)"
    : "var(--color-green-light)";
  const accentHover = isSimplified ? "#1e3a8a" : "#16a34a"; // blu-700 o green-600
  const placeholderColor = isSimplified ? "#95a6d6ff" : "#a4d695ff";
  const lightBG = isSimplified ? "#1643c13a" : "#47d02139";
  const baseColor = "#6b7280";
  const imageSrc = isSimplified
    ? "/images/wallpaper1.png"
    : "/images/wallpaper2.png";

  return (
    <div className="flex h-screen bg-blue-200">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white border-r border-gray-300 transition-all duration-300 ${sidebarOpen ? "w-72" : "w-16"
          }`}
      >
        {/* Top bar: logo + toggle */}
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

        {/* New Chat button */}
        {sidebarOpen ? (
          <button
            onClick={handleNewChat}
            className="w-67 ml-2 px-3 py-2 text-left flex items-center gap-2 rounded-lg transition-colors duration-100 hover:bg-gray-100 text-lg font-medium"
            style={{ color: accentColor }}
          >
            <VscNewFile className="text-2xl" />
            New Chat
          </button>
        ) : (
          <button
            onClick={handleNewChat}
            className="w-67 ml-2 px-3 py-2 text-left flex items-center gap-2 rounded-lg transition-colors duration-100 hover:bg-gray-100 text-lg font-medium"
            style={{ color: accentColor }}
          >
            <VscNewFile className="text-2xl" />
          </button>
        )}

        {/* Chat History */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {chatHistory.length === 0 && sidebarOpen && (
            <p className="text-gray-400 italic px-2 mt-4">No chat history</p>
          )}
          {sidebarOpen ? (
            <p className="text-gray-400 italic px-3 mt-20">Chat</p>
          ) : (
            <p></p>
          )}
          {chatHistory.map(
            (chat) =>
              sidebarOpen && (
                <button
                  key={chat.id}
                  className="w-full text-left px-1 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-100 flex items-center gap-4"
                  style={{ color: accentColor }}
                  onClick={() =>
                    alert(`Switch to chat ${chat.title} (implement later)`)
                  }
                >

                  {/* Testo completo, sempre presente ma con transizione */}
                  <div className="flex gap-27">
                    <span
                      className={`overflow-hidden whitespace-nowrap ease-in-out ${sidebarOpen
                        ? "opacity-100 max-w-full ml-2"
                        : "opacity-0 max-w-0"
                        }`}
                    >
                      {chat.title}
                    </span>
                    {/* Pallini, colore da modificare in base all tipo di */}
                    <span>
                      {path && (
                        <span
                          className="inline-block rounded-full"
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: accentBg,
                            border: `1px solid ${accentColor}`,
                          }}
                        />
                      )}
                    </span>
                  </div>

                </button>
              )
          )}
        </nav>
      </aside>

      {/* Main chat area */}
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
        {/* Header titolo + badge */}
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

        {/* Messaggi scrollabili fino in alto o centrati */}
        {hasStarted && (
          <div className="flex-1 overflow-y-auto px-4 pb-20 transition-all duration-300">
            <div className="max-w-[60%] mx-auto space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start mt-10 gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                >
                  {/* Icona all'inizio del messaggio */}
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

                  {/* Testo del messaggio */}
                  <div
                    className="px-5 py-3 rounded-3xl text-base leading-relaxed shadow-md backdrop-blur-md"
                    style={{
                      backgroundColor:
                        msg.sender === "user"
                          ? lightBG
                          : "rgba(255, 255, 255, 0.4)",
                      color: "#111827",
                      maxWidth: "75%",
                    }}
                  >
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {isLoading && (
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

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {!hasStarted && (
          <div
            className={`flex-1 flex items-start justify-center transition-opacity duration-400`}
            style={{ opacity: fadeOut ? 0 : 1 }}
          >
            <div className="text-center max-w-md bg-white/70 backdrop-blur-md rounded-lg sticky top-[40%] text-4xl font-semibold mb-4 ">
              <Typewriter
                words={['Welcome to IkigAI']}
                loop={true}
                typeSpeed={100}
              />
            </div>
          </div>
        )}

        {/* Input centrato e fisso */}
        <form
          onSubmit={handleSubmit}
          className={`mx-auto flex items-center justify-center gap-2 w-full max-w-[60%] backdrop-blur-md bg-white/70 transition-all duration-500
                    ${hasStarted
              ? "sticky bottom-10"
              : "sticky bottom-[35%] translate-y"
            }
                    `}
          style={{
            borderColor: accentColor,
            minHeight: "60px",
          }}
        >
          <div className="relative flex-1">
            {/* Bottone upload */}
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
                    if (uid && sessionId) {
                      try {
                        const result = await handlePdfUpload(file, uid);
                        if (result.success) {
                          setMessages((prev) => [
                            ...prev,
                            { sender: "bot", text: "The PDF is uploaded." },
                          ]);
                          setStage("chatting"); // Avanza al prossimo step
                          setIsLoading(true);
                          try {
                            const botResponse = await mockBotResponse(
                              "__INIT__",
                              uid,
                              sessionId,
                              isSimplified
                            );
                            setMessages((prev) => [
                              ...prev,
                              { sender: "bot", text: botResponse },
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

            {/* Textarea multilinea */}
            <textarea
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
              className="w-full border rounded-lg pl-14 pr-14 py-2 focus:outline-none focus:ring-2 font-mono text-base resize-none whitespace-pre-wrap"
              rows={3}
              style={{
                borderColor: accentColor,
                backgroundColor: "transparent",
                color: textColor,
              }}
            />

            {/* Pulsante invio */}
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

async function mockBotResponse(
  userInput: string,
  uid: string | null,
  session: string | null,
  isSimplified: boolean 
): Promise<string> {
  const res = await fetch("/api/chatbot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userInput,
      userId: uid,
      session,
      isSimplified,
    }),
  });

  const data = await res.json();

  //data.response deve essere un oggetto con campo message
  return data.response?.message ?? "Nessuna risposta";
}
