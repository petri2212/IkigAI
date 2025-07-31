'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-gray-900 p-4 flex items-center shadow-md">
      <Link href="/" className="flex items-center">
        <Image
          src="/images/logo1.png"
          alt="IkigAI Logo"
          width={40}
          height={40}
          className="mr-3"
          priority
        />
        <span className="text-white font-bold text-xl">IkigAI</span>
      </Link>
    </header>
  );
}
