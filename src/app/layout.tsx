import type { Metadata, Viewport } from "next";
import MotionEffects from "@/components/MotionEffects";
import ServiceWorker from "@/components/ServiceWorker";
import { PublicFooter, PublicHeader } from "@/components/layout/AdminAwareChrome";
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
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Shaita Angels" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
};

/*
 * Launch splash: the crest settles in for under a second when the installed app
 * opens. It runs before first paint, so it is decided here rather than in a React
 * effect, which would flash the page and then cover it. It only plays when:
 *   - the site is running as an installed app (display-mode: standalone, or iOS
 *     navigator.standalone), never in a browser tab;
 *   - this is the first page of the session, so in-app navigation never repeats it;
 *   - the visitor has not asked for reduced motion;
 *   - the page is not part of the admin.
 * The page renders underneath the whole time; the splash never delays content.
 */
const launchSplashScript = `(function(){try{
var d=document.documentElement,m=window.matchMedia;
if(!(m("(display-mode: standalone)").matches||navigator.standalone===true))return;
if(m("(prefers-reduced-motion: reduce)").matches)return;
if(location.pathname.indexOf("/admin")===0)return;
if(sessionStorage.getItem("sa-launched"))return;
sessionStorage.setItem("sa-launched","1");
d.classList.add("launching");
setTimeout(function(){d.classList.remove("launching")},1400);
}catch(e){}})();`;

// Tapping the splash skips it. Runs straight after the splash element exists.
const launchSplashSkipScript = `(function(){var s=document.getElementById("launch-splash");
if(s)s.addEventListener("click",function(){document.documentElement.classList.remove("launching")});})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [sponsors, settings] = await Promise.all([getActiveSponsors(), getSiteSettings()]);

  return (
    // The launch script may add a class to <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: launchSplashScript }} />
      </head>
      <body>
        <div id="launch-splash" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- must paint before hydration, without the image optimiser */}
          <img src="/icons/icon-512.png" alt="" width={168} height={168} />
        </div>
        <script dangerouslySetInnerHTML={{ __html: launchSplashSkipScript }} />
        <ServiceWorker />
        <MotionEffects />
        <a className="skip-link" href="#main-content">Skip to content</a>
        <PublicHeader />
        <main id="main-content">{children}</main>
        <PublicFooter sponsors={sponsors} settings={settings} />
      </body>
    </html>
  );
}
