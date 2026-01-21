import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DotGrid from "@/components/dotgrid/dotgrid.component";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calorie Tracker",
  description: "Track your calorie intake and stay healthy",
  manifest: "/manifest.json",
  themeColor: "#372d66",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
      >
        <div className="fixed w-screen h-screen -z-10">
          <DotGrid
            dotSize={4}
            gap={13}
            baseColor="#372d66ff"
            activeColor="#5227FF"
            proximity={50}
            shockRadius={120}
            shockStrength={5}
            resistance={750}
            returnDuration={1.5}
          ></DotGrid>
        </div>
        <div className="w-screen h-screen z-10">{children}</div>
      </body>
    </html>
  );
}
