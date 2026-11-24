import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Brand Studio",
  description: "Describe your business. Get a full brand kit in Thai and English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;800&family=Inter:wght@400;500;600&family=Prompt:wght@400;600&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <div className="relative z-10">
            <NavBar />
            <main className="px-5 py-10 sm:px-8">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
