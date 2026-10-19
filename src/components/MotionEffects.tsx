"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_TARGETS = [
  "main > section:not(.hero)",
  "main > .champion-bar",
  "main .inner-hero-content",
  "main .page-content > *",
  "main .content-heading",
  "main .filters",
  "main .carouselSection",
  "main .grid > li",
];

/** Add small, one-time entrances to content as it enters the viewport. */
export default function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) return;

    const targets = document.querySelectorAll<HTMLElement>(REVEAL_TARGETS.join(","));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("motion-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );

    for (const target of targets) {
      target.classList.add("motion-reveal");
      if (target.getBoundingClientRect().top < window.innerHeight * 0.96) {
        target.classList.add("motion-visible");
      } else {
        observer.observe(target);
      }
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
