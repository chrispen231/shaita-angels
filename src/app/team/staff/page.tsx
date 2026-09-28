import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <>
      <nav className="team-subnav" aria-label="Women's team sections">
        <div className="wrap team-subnav-inner">
          <span>SHAITA ANGELS WOMEN</span>
          <Link href="/team">Squad</Link>
          <Link href="/team/staff" aria-current="page">Staff</Link>
          <Link href="/matches">Matches</Link>
          <Link href="/club#honours">Honours</Link>
        </div>
      </nav>
      <section className="squad-page-heading">
        <div className="wrap">
          <p className="eyebrow">Shaita Angels Women</p>
          <h1>Team staff</h1>
          <p>The people supporting the Angels, on and off the pitch.</p>
        </div>
      </section>
      <main className="wrap page-content staff-page-content">
        <div className="staff-empty-state">
          <span className="staff-empty-mark" aria-hidden="true">SA</span>
          <div>
            <p className="eyebrow">The team behind the team</p>
            <h2>Staff profiles coming soon.</h2>
            <p>We’re preparing the club’s staff listing. Names and roles will be published here once confirmed by Shaita Angels.</p>
          </div>
        </div>
        <Link className="text-link" href="/team">Back to the squad <span aria-hidden="true">↗</span></Link>
      </main>
    </>
  );
}
