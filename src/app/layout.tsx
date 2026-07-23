import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Background3D from "@/components/Background3D";
import Cursor from "@/components/Cursor";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Codemates",
  description: "Real-time multiplayer coding platform with multiple game modes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jbMono.variable} antialiased min-h-screen text-white font-sans overflow-hidden bg-[#0B0F19]`}>
        <AuthProvider>
          <Cursor />
          <Background3D />
          <main className="relative z-10 h-screen w-screen overflow-hidden">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
