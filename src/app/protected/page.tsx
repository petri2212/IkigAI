"use client";
import Link from "next/link";
import useProtection from "../hooks/pageProtector";
import LoadingPage from "@/app/components/loading";
import Header from "../components/header";
import createNewSession from "../../application/createNewSession";

export default function ProtectedPage() {
  const loading = useProtection();

  if (loading) {
    <Header loading={true} />;
    return <LoadingPage />;
  }

  return (
    <>
      <Header loading={false} />
      <main className="min-h-screen flex flex-col bg-white text-gray-800 overflow-y-auto">
        <section
          className="bg-white min-h-screen flex items-center justify-center px-6 md:px-12 lg:px-24 bg-cover bg-center bg-no-repeat text-center"
          style={{ backgroundImage: "url('/images/wallpaper1.png')" }}
        >
          <div className="max-w-5xl w-full">
            <div className="mb-16">
              <h3 className="text-6xl font-bold text-gray-900 mb-12">Career Match</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Simplified Path */}
                <Link
                  href={{
                    pathname: "/protected/c",
                    query: { path: "simplified", sessionId: createNewSession() },
                  }}
                  className="group relative bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all text-left link-simplified"
                >
                  <h4 className="text-2xl font-bold text-blue-800 mb-3 group-hover:underline">
                    Simplified Path
                  </h4>
                  <p className="text-gray-700 text-base leading-relaxed">
                    Provide minimal information. Quick access, reduced personalization.
                  </p>
                  <span className="absolute bottom-4 right-6 text-blue-500 text-sm group-hover:underline">
                    Continue →
                  </span>
                </Link>

                {/* Complete Path */}
                <Link
                  href={{
                    pathname: "/protected/c",
                    query: { path: "completed", sessionId: createNewSession() },
                  }}
                  className="group relative bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all text-left link-complete"
                >
                  <h4 className="text-2xl font-bold text-green-800 mb-3 group-hover:underline">
                    Complete Path
                  </h4>
                  <p className="text-gray-700 text-base leading-relaxed">
                    Enter all your info and traits for an accurate profile and tailored coaching.
                  </p>
                  <span className="absolute bottom-4 right-6 text-green-500 text-sm group-hover:underline">
                    Continue →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
