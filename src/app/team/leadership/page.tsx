import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Club Leadership" };

export default function LeadershipPage() {
  return (
    <>
      <nav className="team-subnav" aria-label="Club sections">
        <div className="wrap team-subnav-inner">
          <span>SHAITA ANGELS</span>
          <Link href="/team">Squad</Link>
          <Link href="/team/staff">Staff</Link>
          <Link href="/team/leadership" aria-current="page">Leadership</Link>
          <Link href="/club#honours">Honours</Link>
        </div>
      </nav>
      <section className="squad-page-heading">
        <div className="wrap">
          <p className="eyebrow">Shaita Angels FC</p>
          <h1>Club leadership</h1>
          <p>The people guiding the club and building its future.</p>
        </div>
      </section>
      <main className="wrap page-content staff-page-content">
        <div className="note-panel">
          <strong>Leadership profiles coming soon</strong>
          <p>We’ll publish the leadership team here once the club confirms the names and roles.</p>
        </div>
      </main>
    </>
  );
}
