import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "../components/LayoutWrapper";
import { SocketProvider } from "../context/SocketContext";
import { ToastProvider } from "../components/ToastProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { UserProvider } from "../contexts/UserContext";
import { ExchangeRateProvider } from "../contexts/ExchangeRateContext";
import { QueryProvider } from "../context/QueryProvider";
import { WorkspaceConfigProvider } from "../contexts/WorkspaceConfigContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deskii | Internal Portal",
  description: "Internal management portal for Deskii — manage tasks, payroll, and team communications.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Inline script ensures initial theme is applied before React hydrates to avoid flash/mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var r=document.documentElement;if(t==='light'){r.setAttribute('data-theme','light');r.classList.remove('dark');}else{r.setAttribute('data-theme','dark');r.classList.add('dark');}}catch(e){} })();`,
          }}
        />

        <ErrorBoundary>
          <QueryProvider>
            <WorkspaceConfigProvider>
              <UserProvider>
                <ExchangeRateProvider>
                  <SocketProvider>
                    <ToastProvider>
                      <LayoutWrapper>{children}</LayoutWrapper>
                    </ToastProvider>
                  </SocketProvider>
                </ExchangeRateProvider>
              </UserProvider>
            </WorkspaceConfigProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
