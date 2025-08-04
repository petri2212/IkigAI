'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
    sender: 'user' | 'bot';
    text: string;
};

export default function ChatPage() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll automatico in basso quando arriva un nuovo messaggio
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            sender: 'user',
            text: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await mockBotResponse(input.trim());
            const botMessage: Message = {
                sender: 'bot',
                text: responseText,
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { sender: 'bot', text: 'Something went wrong. Please try again later.' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full">
            <aside className="min-w-[10%] max-w-[15%] w-full bg-gray-100 border-r border-gray-300">
                {/* Navbar / sidebar futura */}
            </aside>

            <main className="flex flex-col flex-1 bg-gray-50 p-6">

                <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6">
                    Chat with IkigAI
                </h1>

                {/* Lista messaggi: scrollabile, altezza flessibile */}
                <div className="flex-1 overflow-y-auto space-y-3 border border-gray-300 p-4 rounded-lg bg-white">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg max-w-[80%] ${msg.sender === 'user'
                                    ? 'ml-auto bg-blue-100 text-blue-900'
                                    : 'mr-auto bg-gray-200 text-gray-800'
                                }`}
                        >
                            {msg.text}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="mr-auto bg-gray-200 text-gray-500 p-3 rounded-lg max-w-[80%] italic">
                            Typing...
                        </div>
                    )}
                    {/* Ancora per scroll automatico */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Form invio messaggio */}
                <form onSubmit={handleSubmit} className="mt-4 flex space-x-2">
                    <input
                        type="text"
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
            </main>
        </div>
    );
}

// Simulazione di una risposta del bot
async function mockBotResponse(userInput: string): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`You said: "${userInput}"`);
        }, 1000);
    });
}
