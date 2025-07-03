import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthLayout from "./AuthLayout";
import AuthButton from "./components/AuthButton";

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
<AuthLayout>
<header style={{ padding: "1rem", display: "flex", justifyContent: "flex-end" }}>
<AuthButton />
</header>
{children}
</AuthLayout>
</body>
</html>
);
}