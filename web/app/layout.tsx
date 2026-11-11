import type { Metadata } from "next";
import { Inter, Noto_Naskh_Arabic, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LegalEase · Statutory Legal Assistant & Research Workspace",
  description: "LegalEase AI for statutory research, verbatim citations, document intelligence, and legal drafting",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} ${playfair.variable} ${notoArabic.variable} dark`}>
      <body className="antialiased selection:bg-[#D4FF58]/30 bg-[#080718] text-white">{children}</body>
    </html>
  );
}
