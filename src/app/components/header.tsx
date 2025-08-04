'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useSignOut } from 'react-firebase-hooks/auth';
import { auth } from '@/infrastructure/firebase/config';

export default function Header() {
  const [atTop, setAtTop] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const showLoginButton = pathname !== '/sign-in' && pathname !== '/sign-up' && pathname !== '/sign-up';
  const isProtectedPage = pathname.startsWith('/protected');
  const [signOut, signOutLoading, signOutError] = useSignOut(auth);

  useEffect(() => {
    const handleScroll = () => {
      setAtTop(window.scrollY < 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    const success = await signOut();
    if (success) router.push('/');
  };

  return (
    <header className={`fixed top-0 left-0 w-full z-50 ${showLoginButton && !isProtectedPage? 'bg-background/90' : 'bg-transparent'}`}>
      <div
        className={`flex items-center px-6 py-4 max-w-7xl mx-auto ${showLoginButton ? 'justify-between' : 'justify-center'
          }`}
      >
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo2.png"
            alt="IkigAI Logo"
            width={160}
            height={80}
            priority
          />
        </Link>

        {showLoginButton && !isProtectedPage && (
          <button
            onClick={() => router.push('/sign-in')}
            className="bg-gray-600 hover:bg-gray-700 transition text-white font-semibold py-2 px-6 rounded-xl cursor-pointer"
          >
            Sign In
          </button>
        )}

        {isProtectedPage && (
          <button
            onClick={handleLogout}
            disabled={signOutLoading}
            className="bg-red-700/90 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-xl transition"
          >
            {signOutLoading ? 'Logout...' : 'Logout'}
          </button>
        )}

        {signOutError && (
          <p className="text-red-400 mt-4">Errore durante il logout: {signOutError.message}</p>
        )}

      </div>
    </header>


  );
}
