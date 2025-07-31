'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 text-white px-4">
      {/* Wrapper centrale */}
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/images/logo1.png"
            alt="Logo IkigAI"
            width={160}
            height={160}
            className="object-contain leading-none"
            priority
          />
        </div>

        <h1 className="text-4xl font-bold mb-3">Benvenuto su IkigAI</h1>
        <p className="text-lg text-gray-300 mb-8">
          Dove le idee si incontrano con l’azione.
        </p>

        <button
          onClick={() => router.push('/sign-in')}
          className="bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-3 px-8 rounded-xl"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
