'use client';
import { useState, useEffect } from 'react';
import { useCreateUserWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/config';
import Link from 'next/link';
import router from 'next/router';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [
    createUserWithEmailAndPassword,
    userCredential,
    loading,
    error,
  ] = useCreateUserWithEmailAndPassword(auth);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await createUserWithEmailAndPassword(email, password);
  };

  useEffect(() => {
    if (userCredential) {
      console.log('User created:', userCredential.user);
      setShowSuccess(true);
      setEmail('');
      setPassword('');
    }
  }, [userCredential]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-700">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl text-gray-700 font-bold mb-6 text-center">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="email"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-gray-700"
            required
          />
          <input
            id="password"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-gray-700"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-xl hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Registrazione in corso...' : 'Sign Up'}
          </button>
        </form>

        {error && (
          <p className="text-red-500 font-bold text-center mt-5">
            Errore: {error.message}
          </p>
        )}

        {showSuccess && (
          <p className="text-green-600 font-bold text-center mt-5">
            Registrazione completata!
          </p>
        )}

      </div>
    </div>
  );
}
