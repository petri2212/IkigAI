import Link from "next/link";
import { Session } from "@/app/api/getUserSessions/route";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

type HistoryProps = {
    uid: string;
    onSelectSession?: (sessionId: string) => void; // callback quando si clicca su una chat
};

export type ChatHistoryRef = {
    refresh: () => void;
};

const ChatHistory = forwardRef<ChatHistoryRef, HistoryProps>(({ uid, onSelectSession }, ref) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/getUserSessions?uid=${uid}`);
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error("Errore fetch sessioni:", error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    // Espone la funzione di refresh al componente genitore
    useImperativeHandle(ref, () => ({
        refresh: fetchSessions
    }));

    useEffect(() => {
        if (uid) {
            fetchSessions();
        }
    }, [uid]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-700 px-4">
                <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mt-30"></div>
                <p className="text-sm font-medium tracking-wide animate-pulse">
                    Loading...
                </p>
            </div>
        );
    }

    if (!sessions.length) {
        return (
            <div className="flex flex-col justify-center h-20 text-gray-700 px-4">
                <p className="text-lg text-gray-500">No Chat History</p>
            </div>
        );
    }

    const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col justify-center mt-10 text-gray-700 px-4">
                <p className="text-lg text-gray-500">Chat History</p>
            </div>
            {sortedSessions.map((session, index) => (
                <Link
                    key={session.number_session}
                    href={{
                        pathname: "/protected/c",
                        query: { path: session.path, sessionId: session.number_session },
                    }}
                    onClick={() => {
                        if (onSelectSession) onSelectSession(session.number_session);
                    }}
                    className={`flex items-center justify-between bg-white border border-transparent rounded-xl shadow-sm px-4 py-3 
                            hover:shadow-md transition-all duration-100 group
                            ${session.path === "simplified" ? "hover:bg-blue-50 text-blue-800" : "hover:border-green-800 text-green-800"}`}
                >
                    <div className="flex flex-col">
                        <span
                            className={`font-semibold duration-100 ${session.path === "simplified"
                                ? "text-gray-800 group-hover:text-blue-800"
                                : "text-gray-800 group-hover:text-green-700"
                                }`}
                        >
                            Chat {index + 1}
                        </span>
                        <span className="text-sm text-gray-500">
                            {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <svg
                        className={`w-5 h-5 ${session.path === "simplified"
                            ? "text-gray-800 group-hover:text-blue-800"
                            : "text-gray-800 group-hover:text-green-700"
                            } transition-colors`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            ))}
        </div>
    );
});

ChatHistory.displayName = "ChatHistory";
export default ChatHistory;
