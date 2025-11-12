import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toyota Research System",
  description: "Multi-agent AI platform for Toyota research",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
