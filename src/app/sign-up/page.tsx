'use client';
import { useState } from "react";
import { useCreateUserWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/config';
import { create } from "domain";

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [createUserWithEmailAndPassword] = useCreateUserWithEmailAndPassword(auth);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const res = await createUserWithEmailAndPassword(email, password);
            console.log({ res });
            setEmail("");
            setPassword("");
        } catch (e) {
            console.error("Error creating user:", e);
            // Qui potresti mandare i dati a un backend
            console.log("Email:", email);
            console.log("Password:", password);
        };
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-700">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <h2 className="text-3xl text-gray-700 font-bold mb-6 text-center">Sign Up</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            id="email"
                            placeholder="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
                            required
                        />
                    </div>

                    <div>
                        <input
                            id="password"
                            placeholder="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gray-600 text-white py-2 px-4 rounded-xl hover:bg-gray-700 transition"
                    >
                        Sign Up
                    </button>
                </form>
            </div>
        </div>
    );
}

