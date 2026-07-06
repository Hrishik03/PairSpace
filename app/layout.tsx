import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PairSpace",
  description: "Disposable real-time collaborative coding rooms for interviews and pair programming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
