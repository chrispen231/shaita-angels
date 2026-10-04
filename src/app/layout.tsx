import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shaita-angels.vercel.app"),
  title: { default: "Shaita Angels FC | Careysburg, Liberia", template: "%s | Shaita Angels FC" },
  description: "The home of Shaita Angels FC: women’s football, match stories, and the community of Careysburg, Liberia.",
  openGraph: {
    title: "Shaita Angels FC",
    description: "From Careysburg. For the whole game.",
    type: "website",
    locale: "en_LR",
    siteName: "Shaita Angels FC",
  },
  twitter: { card: "summary_large_image", title: "Shaita Angels FC", description: "From Careysburg. For the whole game." },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><Navbar /><main id="main-content">{children}</main><Footer /></body></html>;
}
