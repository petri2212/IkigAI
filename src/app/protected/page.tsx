'use client';
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useSignOut } from 'react-firebase-hooks/auth';
import { auth } from '@/infrastructure/firebase/config';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const [user, authLoading] = useAuthState(auth);
  const [signOut, signOutLoading, signOutError] = useSignOut(auth);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in'); // Redirect to sign-in if not authenticated
    }
  }, [user, authLoading, router]);

  // Se sto caricando lo stato auth, non mostrare ancora la pagina
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-700 text-white z-50 px-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-lg font-semibold tracking-wide animate-pulse">
          Caricamento in corso...
        </p>
      </div>
    );
  }

  // Se utente non c'è, renderizza null (o niente), perché stiamo già facendo redirect
  if (!user) {
    return null;
  }

  // Utente è autenticato, mostra la pagina protetta
  const handleLogout = async () => {
    const success = await signOut();
    if (success) router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">Benvenuto nella pagina protetta</h1>

        <button
          onClick={handleLogout}
          disabled={signOutLoading}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition"
        >
          {signOutLoading ? 'Logout...' : 'Logout'}
        </button>

        {signOutError && (
          <p className="text-red-400 mt-4">Errore durante il logout: {signOutError.message}</p>
        )}
      </div>
    </div>
  );
}
