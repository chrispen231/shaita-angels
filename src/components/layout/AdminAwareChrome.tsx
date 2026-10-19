"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SponsorBand from "@/components/SponsorBand";
import type { SiteSettings, Sponsor } from "@/types/sponsors";

/** Keep the club website chrome out of the focused admin workspace. */
export function PublicHeader() {
  const pathname = usePathname();
  return pathname?.startsWith("/admin") ? null : <Navbar />;
}

export function PublicFooter({ sponsors, settings }: { sponsors: Sponsor[] | null; settings: SiteSettings | null }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <SponsorBand sponsors={sponsors} settings={settings} />
      <Footer />
    </>
  );
}
