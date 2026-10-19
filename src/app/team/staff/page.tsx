import type { Metadata } from "next";
import Link from "next/link";
import { getStaff } from "@/lib/content";
import StaffGrid from "@/components/StaffGrid";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <>
      <nav className="team-subnav" aria-label="Club sections">
        <div className="wrap team-subnav-inner">
          <span>SHAITA ANGELS</span>
          <Link href="/team">Squad</Link>
          <Link href="/team/staff" aria-current="page">Staff</Link>
          <Link href="/team/leadership">Leadership</Link>
          <Link href="/club#honours">Honours</Link>
        </div>
      </nav>
      <section className="squad-page-heading">
        <div className="wrap">
          <p className="eyebrow">Shaita Angels</p>
          <h1>Team staff</h1>
          <p>The people supporting the Angels, on and off the pitch.</p>
        </div>
      </section>
      <main className="wrap page-content staff-page-content">
        <StaffGrid staff={staff} />
        <Link className="text-link" href="/team">Back to the squad <span aria-hidden="true">↗</span></Link>
      </main>
    </>
  );
}
