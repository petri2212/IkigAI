'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSignOut } from 'react-firebase-hooks/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase/config';
import { User as UserIcon } from 'lucide-react';

type HeaderProps = {
  loading?: boolean;
};

export default function Header({ loading = false }: HeaderProps) {
  const [atTop, setAtTop] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const showLoginButton = pathname !== '/sign-in' && pathname !== '/sign-up';
  const isProtectedPage = pathname.startsWith('/protected');
  const isChatPage = pathname === '/protected/career-match' || pathname === '/protected/career-coach';
  const [signOut, signOutLoading, signOutError] = useSignOut(auth);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Visuale effect of the header
  useEffect(() => {
    const handleScroll = () => setAtTop(window.scrollY < 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Logout
  const handleLogout = async () => {
    const success = await signOut();
    if (success) router.push('/');
  };

  // Page protection
  const handleUserClick = () => {
    if (isLoggedIn) {
      router.push('/protected');
    } else {
      router.push('/sign-in');
    }
  };

  // Hide header in chat page or in loading page
  if (isChatPage || loading) {
    return null;
  }

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 ${
        showLoginButton && !isProtectedPage
          ? 'bg-background/90'
          : 'bg-transparent'
      }`}
    >
      <div
        className={`flex items-center px-6 py-4 max-w-7xl mx-auto  ${
          showLoginButton ? 'justify-between' : 'justify-center'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo2.png"
            alt="IkigAI Logo"
            width={160}
            height={80}
            priority
          />
        </Link>

        {/* User Icon */}
        <div className="flex items-center gap-4">
          {showLoginButton && !isProtectedPage && (
          <button
            onClick={handleUserClick}
            className="p-2 rounded-full hover:backdrop-blur-sm transition cursor-pointer"
            aria-label="User profile"
          >
            <UserIcon className="w-6 h-6 text-gray-800" />
          </button>
          )}

          {/* Sign In button */}
          {showLoginButton && !isProtectedPage && (
            <button
              onClick={() => router.push('/sign-in')}
              className="bg-gray-600 hover:bg-gray-700 transition text-white font-semibold py-2 px-6 rounded-xl cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* Logout button */}
          {isProtectedPage && (
            <button
              onClick={handleLogout}
              disabled={signOutLoading}
              className="bg-red-600/80 hover:bg-red-700/90 text-white font-bold py-2 px-4 rounded-xl transition"
            >
              {signOutLoading ? 'Logout...' : 'Logout'}
            </button>
          )}
        </div>

        {signOutError && (
          <p className="text-red-400 mt-4">
            Logout Error: {signOutError.message}
          </p>
        )}
      </div>
    </header>
  );
}
