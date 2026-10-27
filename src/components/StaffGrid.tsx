"use client";

import Image from "next/image";
import type { StaffMember } from "@/lib/content";

import { ArrowUpRight } from "lucide-react";
/**
 * Staff grid, mirroring the squad card layout.
 *
 * Each card shows the staff member's photo (or a placeholder), their name,
 * and their role. A second photo on hover matches the player card
 * double-photo effect.
 */
export default function StaffGrid({ staff }: { staff: StaffMember[] }) {
  if (staff.length === 0) {
    return (
      <div className="staff-empty-state">
        <span className="staff-empty-mark" aria-hidden="true">SA</span>
        <div>
          <p className="eyebrow">The team behind the team</p>
          <h2>Staff profiles coming soon.</h2>
          <p>We&rsquo;re preparing the club&rsquo;s staff listing. Names and roles will be published here once confirmed by Shaita Angels.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="squad-cards">
      {staff.map((member) => (
        <article className="player-card" key={member.id}>
          <div className="player-card-art">
            {member.photo ? (
              <div className={`player-photo-set ${member.photoAlternate ? "has-alternate" : ""}`}>
                <Image
                  className="player-photo player-photo-primary"
                  src={member.photo}
                  alt={member.photoAlt ?? `${member.name}, ${member.role} at Shaita Angels`}
                  fill
                  sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw"
                />
                {member.photoAlternate && (
                  <Image
                    className="player-photo player-photo-alternate"
                    src={member.photoAlternate}
                    alt={`${member.name}, alternate portrait`}
                    fill
                    sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw"
                  />
                )}
              </div>
            ) : (
              <>
                <span className="player-art-face player-art-front" aria-hidden="true">
                  <span className="player-art-kicker">SHAITA ANGELS FC</span>
                  <span className="player-shirt">
                    <Image src="/shaita-angels-logo.png" alt="" width={42} height={42} />
                  </span>
                  <strong className="player-art-number">{member.role}</strong>
                  <span className="player-art-mark">CAREYSBURG · LIBERIA</span>
                </span>
                <span className="player-art-face player-art-reverse" aria-hidden="true">
                  <span className="player-art-kicker">
                    THE ANGELS · {member.role.toUpperCase()}
                  </span>
                  <span className="player-shirt player-shirt-back">
                    <span>{member.name.split(" ").map(n => n[0]).join("")}</span>
                  </span>
                  <strong className="player-art-number">{member.role}</strong>
                  <span className="player-art-mark">STAFF <ArrowUpRight className="inline-icon" /></span>
                </span>
              </>
            )}
          </div>
          <div className="player-card-info">
            <span className="player-card-position">{member.role}</span>
            <h2>{member.name}</h2>
          </div>
        </article>
      ))}
    </div>
  );
}
