import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "../components/LayoutWrapper";
import { SocketProvider } from "../context/SocketContext";
import { ToastProvider } from "../components/ToastProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { UserProvider } from "../contexts/UserContext";
import { ExchangeRateProvider } from "../contexts/ExchangeRateContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAVAGE LLC | Internal Portal",
  description: "Internal management portal for SAVAGE LLC operations and payroll.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Inline script ensures initial theme is applied before React hydrates to avoid flash/mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var r=document.documentElement;if(t==='dark'){r.setAttribute('data-theme','dark');r.classList.add('dark');}else if(t==='light'){r.setAttribute('data-theme','light');r.classList.remove('dark');}else{var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(m){r.setAttribute('data-theme','dark');r.classList.add('dark');}else{r.setAttribute('data-theme','light');r.classList.remove('dark');}}}catch(e){} })();`,
          }}
        />

        <ErrorBoundary>
          <UserProvider>
            <ExchangeRateProvider>
              <SocketProvider>
                <ToastProvider>
                  <LayoutWrapper>{children}</LayoutWrapper>
                </ToastProvider>
              </SocketProvider>
            </ExchangeRateProvider>
          </UserProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
