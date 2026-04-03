import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "SmartQueue – AI-Powered Virtual Queue Optimization System",
  description:
    "Production-ready SmartQueue SaaS platform for hospitals, banks and government offices."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="pb-20">{children}</main>
      </body>
    </html>
  );
}
