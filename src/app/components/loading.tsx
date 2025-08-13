"use client";

export default function LoadingPage() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center text-gray-900 z-50 px-4 bg-backround">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-lg font-semibold tracking-wide animate-pulse">
        Loading...
      </p>
    </div>
  );
}