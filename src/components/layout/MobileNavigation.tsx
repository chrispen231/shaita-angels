"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navigation } from "@/data/site";
import styles from "./MobileNavigation.module.css";

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root}>
      <button
        ref={toggleRef}
        className={`${styles.toggle} ${open ? styles.toggleOpen : ""}`}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span /><span /><span />
      </button>
      {open && (
        <>
          <button className={styles.scrim} type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
          <nav
            ref={panelRef}
            id="mobile-navigation-panel"
            className={styles.panel}
            aria-label="Main navigation"
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.panelHeading}>
              <div><span>SHAITA ANGELS FC</span><strong>Where to?</strong></div>
              <button ref={closeRef} className={styles.close} type="button" onClick={() => setOpen(false)} aria-label="Close menu">×</button>
            </div>
            <div className={styles.links}>
              {navigation.map((item, index) => (
                <Link
                  href={item.href}
                  key={item.href}
                  className={`${styles.link} ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? styles.active : ""}`}
                  aria-current={pathname === item.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
                  <span>{item.label}</span>
                  <span className={styles.arrow} aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
            <Link href="/shop" className={styles.shop} onClick={() => setOpen(false)}>Visit the shop <span aria-hidden="true">↗</span></Link>
            <p className={styles.footer}>PRIDE OF CAREYSBURG · EST. 2019</p>
          </nav>
        </>
      )}
    </div>
  );
}
