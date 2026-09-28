import Link from "next/link";
import Image from "next/image";
import { navigation } from "@/data/site";

function Crest() {
  return (
    <span className="crest" style={{ width: 50, height: 50, padding: 4, borderRadius: "50%", clipPath: "none", background: "#fff" }}>
      <Image src="/shaita-angels-logo.png" alt="" width={52} height={52} priority style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </span>
  );
}

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="header-inner wrap">
        <Link className="brand" href="/" aria-label="Shaita Angels Football Club home">
          <Crest />
          <span className="brand-copy">
            <strong>SHAITA ANGELS FC</strong>
            <small>PRIDE OF CAREYSBURG</small>
          </span>
        </Link>
        <details className="mobile-nav">
          <summary aria-label="Open navigation"><span /><span /><span /></summary>
          <nav className="mobile-menu" aria-label="Main navigation">
            {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
            <Link className="mobile-cta" href="/matches">Match centre</Link>
          </nav>
        </details>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          <Link className="nav-cta" href="/matches">Match centre <span aria-hidden="true">↗</span></Link>
        </nav>
      </div>
    </header>
  );
}
