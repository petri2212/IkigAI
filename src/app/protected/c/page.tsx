'use client';
import ChatPage from '@/app/components/chatbot';
import LoadingPage from '@/app/components/loading';
import useProtection from "@/app/hooks/pageProtector";

export default function Chat() {
  const loading = useProtection();

  if (loading) {
    return <LoadingPage />;
  }
  return (
    <ChatPage />
  );
}