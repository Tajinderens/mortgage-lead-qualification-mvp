import type { Metadata } from "next";
import { ComplianceBanner } from "@/components/compliance-banner";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mortgage Lead Qualification MVP",
  description: "Preliminary mortgage lead-priority demo for fictional borrower data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ComplianceBanner />
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
