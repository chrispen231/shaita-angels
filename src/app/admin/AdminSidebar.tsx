"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Handshake,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Settings2,
  ShieldCheck,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ROLE_LABELS, canAccess, type Role, type ScreenKey } from "@/lib/admin/role-constants";
import { signOutAdmin } from "./actions";
import styles from "./AdminShell.module.css";

type NavItem = { screen: ScreenKey; href: string; label: string; group: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { screen: "fixtures", href: "/admin/fixtures", label: "Fixtures", group: "Matches", icon: CalendarDays },
  { screen: "matches", href: "/admin/matches", label: "Matches & lineups", group: "Matches", icon: ClipboardList },
  { screen: "news", href: "/admin/news", label: "News", group: "Content", icon: Newspaper },
  { screen: "squad", href: "/admin/squad", label: "Squad", group: "Content", icon: Users },
  { screen: "staff", href: "/admin/staff", label: "Staff", group: "Content", icon: Users },
  { screen: "leadership", href: "/admin/leadership", label: "Leadership", group: "Content", icon: ShieldCheck },
  { screen: "honors", href: "/admin/honours", label: "Honours", group: "Content", icon: Trophy },
  { screen: "media", href: "/admin/media", label: "Media library", group: "Content", icon: Images },
  { screen: "sponsors", href: "/admin/sponsors", label: "Sponsors", group: "Site", icon: Handshake },
  { screen: "settings", href: "/admin/settings", label: "Social & contact", group: "Site", icon: Settings2 },
  { screen: "users", href: "/admin/users", label: "Administrators", group: "Site", icon: ShieldCheck },
];

export default function AdminSidebar({ role, email, active }: { role: Role; email: string; active?: ScreenKey }) {
  const [open, setOpen] = useState(false);
  const groups = Array.from(new Set(NAV.map((item) => item.group)));
  const visible = NAV.filter((item) => canAccess(role, item.screen));

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link href="/admin" className={styles.brand} aria-label="Admin dashboard">
          <Image src="/shaita-angels-logo.png" alt="" width={40} height={40} priority />
          <span><strong>Shaita Angels</strong><small>Club admin</small></span>
        </Link>
        <div className={styles.account}>
          <span className={styles.role}>{ROLE_LABELS[role]}</span>
          <span className={styles.email}>{email}</span>
        </div>
        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="admin-navigation"
          aria-label={open ? "Close admin menu" : "Open admin menu"}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          <span>{open ? "Close" : "Menu"}</span>
        </button>
      </div>

      <nav id="admin-navigation" className={`${styles.navigation} ${open ? styles.navigationOpen : ""}`} aria-label="Admin sections">
        <div className={styles.mobileAccount}>
          <span className={styles.role}>{ROLE_LABELS[role]}</span>
          <span className={styles.email}>{email}</span>
        </div>
        <div className={styles.navigationGroups}>
          {groups.map((group) => {
            const items = visible.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <section className={styles.group} key={group} aria-label={group}>
                <h2 className={styles.groupLabel}>{group}</h2>
                <ul className={styles.navList}>
                  {items.map(({ screen, href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        className={`${styles.navLink} ${active === screen ? styles.navLinkActive : ""}`}
                        href={href}
                        aria-current={active === screen ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className={styles.foot}>
          <Link href="/admin" className={`${styles.utilityLink} ${active ? "" : styles.utilityActive}`} onClick={() => setOpen(false)}>
            <LayoutDashboard size={18} aria-hidden="true" /><span>Dashboard</span>
          </Link>
          <Link href="/" className={styles.utilityLink} onClick={() => setOpen(false)}>
            <ArrowUpRight size={18} aria-hidden="true" /><span>View public site</span>
          </Link>
          <form action={signOutAdmin}>
            <button className={styles.signOut} type="submit">
              <LogOut size={18} aria-hidden="true" /><span>Sign out</span>
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
