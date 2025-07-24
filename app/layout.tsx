import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/auth-provider";
import AuthButton from "./components/AuthButton";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PermitPilot",
  description: "PermitPilot upload & AI summary tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <Toaster position="top-center" />
          <header style={{ padding: "1rem", display: "flex", justifyContent: "flex-end" }}>
            <AuthButton />
          </header>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
