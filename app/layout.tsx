import type { Metadata } from "next";
import { Archivo, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-ui",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-doc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Redline",
  description:
    "Redline ranks the clauses in your SaaS or vendor agreement by what they could cost, and quotes the exact sentence each one comes from.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
