'use client';
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useSignOut } from 'react-firebase-hooks/auth';
import { auth } from '@/infrastructure/firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div className="fixed inset-0 flex flex-col items-center justify-center text-white z-50 px-4">
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
    <main className="min-h-screen flex flex-col bg-white text-gray-800 overflow-y-auto">
      <section
        className="bg-white min-h-screen flex items-center justify-center px-6 md:px-12 lg:px-24 bg-cover bg-center bg-no-repeat text-center"
        style={{ backgroundImage: "url('/images/wallpaper1.png')" }}
      >
        <div className="max-w-5xl w-full">
          <div className="mb-16">
            <h3 className="text-6xl font-bold text-gray-900 mb-12">Career Match</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link
                href={{
                  pathname: "/protected/career-match",
                  query: { path: "simplified" },
                }}
                className="group relative bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all text-left"
              >
                <h4 className="text-2xl font-bold text-blue-800 mb-3 group-hover:underline">Simplified Path</h4>
                <p className="text-gray-700 text-base leading-relaxed">
                  Provide minimal information. Quick access, reduced personalization.
                </p>
                <span className="absolute bottom-4 right-6 text-blue-500 text-sm group-hover:underline">Continue →</span>
              </Link>

              <Link
                href={{
                  pathname: "/protected/career-match",
                  query: { path: "complete" },
                }}
                className="group relative bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all text-left"
              >
                <h4 className="text-2xl font-bold text-green-800 mb-3 group-hover:underline">Complete Path</h4>
                <p className="text-gray-700 text-base leading-relaxed">
                  Enter all your info and traits for an accurate profile and tailored coaching.
                </p>
                <span className="absolute bottom-4 right-6 text-green-500 text-sm group-hover:underline">Continue →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>

  );
}
