'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [atTop, setAtTop] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const showLoginButton = pathname !== '/sign-in' && pathname !== '/sign-up';

  useEffect(() => {
    const handleScroll = () => {
      setAtTop(window.scrollY < 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50">
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

        {showLoginButton && (
          <button
            onClick={() => router.push('/sign-in')}
            className="bg-gray-500 hover:bg-gray-600 transition text-white font-semibold py-2 px-6 rounded-xl cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>


  );
}
