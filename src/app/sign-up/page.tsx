'use client';
import { useState } from 'react';
import { useCreateUserWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '@/infrastructure/firebase/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendEmailVerification } from 'firebase/auth';

// Funzione per messaggi di errore chiari
const getFriendlyErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/missing-password':
      return 'Please enter a password.';
    case 'auth/internal-error':
      return 'An unexpected error occurred. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

// Funzione di validazione password client-side
const validatePassword = (password: string): string | null => {
  const minLength = /.{7,}/;
  const uppercase = /[A-Z]/;
  const lowercase = /[a-z]/;
  const number = /[0-9]/;
  const specialChar = /[^A-Za-z0-9]/;

  if (!minLength.test(password)) return 'Password must be at least 8 characters.';
  if (!uppercase.test(password)) return 'Password must include at least one uppercase letter.';
  if (!lowercase.test(password)) return 'Password must include at least one lowercase letter.';
  if (!number.test(password)) return 'Password must include at least one number.';
  if (!specialChar.test(password)) return 'Password must include at least one special character.';
  return null;
};

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customError, setCustomError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const [
    createUserWithEmailAndPassword,
    userCredential,
    loading,
    firebaseError,
  ] = useCreateUserWithEmailAndPassword(auth);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationMessage = validatePassword(password);
    if (validationMessage) {
      setCustomError(validationMessage);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(email, password);
      if (userCred?.user) {
        await sendEmailVerification(userCred.user);
        setShowSuccess(true);
        setCustomError('');
        setEmail('');
        setPassword('');
      }
    } catch (e) {
      console.error('Registration error:', e);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center pt-24 px-4"
      style={{ backgroundImage: "url('/images/wallpaper1.png')" }}
    >
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl text-gray-700 font-semibold mb-10 text-center">Create Account</h1>

        {showSuccess ? (
          <div className="text-center space-y-4">
            <p className="text-green-700 font-medium bg-green-100 border border-green-300 rounded-xl p-4">
              Registration successful!<br />Please check your email to verify your account.
            </p>
            <Link href="/sign-in" className="text-blue-600 hover:underline">
              Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              id="email"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-gray-700 placeholder-gray-400"
              required
            />
            <input
              id="password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 text-gray-700 placeholder-gray-400"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 text-white py-3 px-4 rounded-xl hover:bg-gray-900 transition mt-6"
            >
              {loading ? 'Registering...' : 'Sign Up'}
            </button>
          </form>
        )}

        {/* Errori utente */}
        {(customError || firebaseError) && (
          <div className="text-red-600 text-center font-medium mt-5 bg-red-100 p-4 rounded-xl border border-red-300">
            {customError || getFriendlyErrorMessage(firebaseError?.code || '')}
          </div>
        )}

        {!showSuccess && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
