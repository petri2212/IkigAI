'use client';
import { useState } from "react";
import { useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '@/infrastructure/firebase/config';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import Header from "../components/header";

export default function SignInPage() {
    // State for email and password inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [signInWithEmailAndPassword] = useSignInWithEmailAndPassword(auth);
    
    const router = useRouter();
    const provider = new GoogleAuthProvider();

    const signInGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential) {
            } else {
                console.error("No credential found");
            }


            router.push("/protected/"); 
        } catch (error: any) {
            const errorMessage = error.message;
            console.error("Google sign-in error:", errorMessage);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const res = await signInWithEmailAndPassword(email, password);
            console.log(res);
            setEmail("");
            setPassword("");
            // Redirect to home page after successful sign-in
            router.push("/protected/"); 
        } catch (e) {
            console.error("Error signing in:", e);
        }
    };

    return (
        <><Header loading={false} /><div
            className="min-h-screen flex items-center justify-center bg-cover bg-center pt-24"
            style={{ backgroundImage: "url('/images/wallpaper1.png')" }}
        >
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <h1 className="text-4xl text-gray-700 font-bold mb-12 text-center ">Log In</h1>
                <button className="flex items-center justify-center gap-2 w-full bg-white border border-gray-300 hover:shadow-lg px-4 py-3 mb-8 rounded-2xl shadow cursor-pointer text-gray-400 hover:text-gray-700"
                    onClick={signInGoogle}>
                    <FcGoogle className="text-xl" />
                    <span className="font-medium">Sign in with Google</span>
                </button>
                <hr className="border-t-2 border-gray-300 m-4 mb-8" />
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            id="email"
                            placeholder="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-gray-700 placeholder-gray-400"
                            required />
                    </div>

                    <div>
                        <input
                            id="password"
                            placeholder="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-gray-700 placeholder-gray-400"
                            required />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gray-800 text-white py-3 px-4 rounded-xl hover:bg-gray-900 transition mt-6"
                    >
                        Login
                    </button>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?{' '}
                        <Link href="/sign-up" className="text-blue-600 hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </form>
            </div>
        </div></>
    );
}