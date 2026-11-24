import type { Metadata } from "next";
import CursorGlow from "@/components/CursorGlow";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palettai — AI brand designer",
  description: "Describe your business. Get a full brand kit in Thai and English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script and browser extensions change <html>/<body> before React loads
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;800&family=Inter:wght@400;500;600&family=Prompt:wght@400;600&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <CursorGlow />
            <div className="relative z-10">
              <div className="no-print">
                <NavBar />
              </div>
              <main className="px-5 py-10 sm:px-8 print:p-0">{children}</main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
