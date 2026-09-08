import type { Metadata, Viewport } from "next";
import { PT_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Кирилл дэмждэг фонтууд. PT Serif бол Кирилл үсэгт зориулж зохиогдсон. */
const serif = PT_Serif({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "latin"],
  display: "swap",
  variable: "--font-serif"
});
const sans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["cyrillic", "latin"],
  display: "swap",
  variable: "--font-sans"
});
const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["cyrillic", "latin"],
  display: "swap",
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "GoVi — Өмнөговь ХААЦУ нэгтгэл",
  description:
    "Өмнөговь аймгийн хөдөө аж ахуйн цаг уурын 14 станцын 10 хоногийн мэдээг нэг удаа шивж, " +
    "хүснэгт, график, тойм, тайланг автоматаар гаргана."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
