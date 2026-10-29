import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deutsch DTZ",
  description: "Немецкий с нуля до B1: DTZ и Leben in Deutschland",
};

export const viewport: Viewport = { themeColor: "#120c2e", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">
        <div className="aurora" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
