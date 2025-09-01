"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface TypewriterMarkdownProps {
  text: string;
  speed?: number;
}

export default function TypewriterMarkdown({ text, speed = 30 }: TypewriterMarkdownProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if(text.length > 200){
        speed = 5;
    }
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [index, text, speed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedText]);

  return (
    <div className="overflow-y-auto max-h-[80vh]">
      <ReactMarkdown>{displayedText}</ReactMarkdown>
      <div ref={bottomRef} />
    </div>
  );
}
