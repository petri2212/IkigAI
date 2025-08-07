/*export const handleChatLoop = async (
  userInput: string,
  userId: string,
  sessionNumber: string
  
): Promise<string> => {
  const res = await fetch("/api/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, sessionNumber, userInput }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.result.message;
};*/
