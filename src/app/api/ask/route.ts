import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
console.log('OPENAI_KEY:', process.env.OPENAI_API_KEY);

export async function POST(req: Request) {
  const { question } = await req.json();

  // I simulate the context even if I have not implemented a retrival
  const fakeContext = "Nessuna base di conoscenza usata al momento.";

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', // o 'gpt-4 too expensive'
    messages: [
      {
        role: 'system',
        content: `Rispondi in modo utile. Usa questo contesto se rilevante:\n${fakeContext}`,
      },
      {
        role: 'user',
        content: question,
      },
    ],
  });

  return NextResponse.json({
    answer: response.choices[0].message.content,
  });
  //test branch
}
