import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Shaita Angels FC | Careysburg, Liberia", template: "%s | Shaita Angels FC" },
  description: "The home of Shaita Angels FC: women’s football, match stories, and the community of Careysburg, Liberia.",
  openGraph: { title: "Shaita Angels FC", description: "From Careysburg. For the whole game.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><Navbar /><main id="main-content">{children}</main><Footer /></body></html>;
}
