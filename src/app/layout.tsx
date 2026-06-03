import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CasaOS",
  description: "Tu sistema operativo del hogar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CasaOS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f0f0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="h-full bg-[#0f0f0f] text-white">
        <QueryProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: "#1a1a1a", color: "#f0f0f0", border: "1px solid rgba(255,255,255,0.08)" },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
