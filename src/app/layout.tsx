import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SponsorBand from "@/components/SponsorBand";
import { getActiveSponsors, getSiteSettings } from "@/lib/sponsors";
import "./globals.css";

// Sponsors and social handles change rarely, so there is no reason to refetch
// them on every navigation.
export const revalidate = 300;

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [sponsors, settings] = await Promise.all([getActiveSponsors(), getSiteSettings()]);

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Navbar />
        <main id="main-content">{children}</main>
        <SponsorBand sponsors={sponsors} settings={settings} />
        <Footer />
      </body>
    </html>
  );
}
