import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IkigAI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        style={{
          backgroundColor: '#FEFEFE', 
          color: 'darkgray',
          margin: 0,
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
