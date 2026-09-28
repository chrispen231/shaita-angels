import Link from "next/link";
import Image from "next/image";
import { navigation } from "@/data/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-main">
        <div>
          <div className="footer-brand-lockup"><Image src="/shaita-angels-logo.png" alt="Shaita Angels FC crest" width={70} height={70} /><div className="footer-brand">SHAITA<br /><span>ANGELS</span></div></div>
          <p>Women’s football from Careysburg, Liberia.<br />Founded in 2019.</p>
        </div>
        <div className="footer-links">
          <p className="footer-label">Explore</p>
          {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </div>
        <div className="footer-links">
          <p className="footer-label">Support the Angels</p>
          <Link href="/community">Community</Link>
          <Link href="/tickets">Match day</Link>
          <Link href="/shop">Merchandise</Link>
        </div>
      </div>
      <div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Shaita Angels FC</span><span>Careysburg · Liberia</span></div>
    </footer>
  );
}
