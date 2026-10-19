"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { type GalleryCategory, type GalleryPhoto } from "@/lib/gallery";
import styles from "./media.module.css";

const FILTERS: { value: GalleryCategory | "all"; label: string }[] = [
  { value: "all", label: "All photos" },
  { value: "stories", label: "News" },
  { value: "players", label: "Squad" },
  { value: "staff", label: "Staff" },
  { value: "gallery", label: "Gallery uploads" },
];

function formatDate(value: string | null) {
  if (!value) return "";
  const date = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "";
  return `${Number(match[3])} ${new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toLocaleString("en-GB", { month: "short", timeZone: "UTC" })} ${match[1]}`;
}

export function MediaGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const visiblePhotos = filter === "all" ? photos : photos.filter((photo) => photo.category === filter);
  // Index rather than the object itself, so prev/next can step through the set.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex === null ? null : visiblePhotos[activeIndex];

  const close = useCallback(() => setActiveIndex(null), []);
  const step = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        if (current === null || visiblePhotos.length === 0) return current;
        // Wrap around so the arrows never dead-end.
        return (current + delta + visiblePhotos.length) % visiblePhotos.length;
      });
    },
    [visiblePhotos.length],
  );

  // Escape closes; arrows step through. Bound only while the lightbox is open.
  useEffect(() => {
    if (activeIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, close, step]);

  // Stop the page behind the lightbox from scrolling.
  useEffect(() => {
    if (activeIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeIndex]);

  return (
    <>
      <div className="content-heading">
        <div>
          <p className="eyebrow">From the archive</p>
          <h2>Moments in red.</h2>
        </div>
        <span className="data-note">{visiblePhotos.length} {visiblePhotos.length === 1 ? "photo" : "photos"}</span>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter gallery by source">
        {FILTERS.map((item) => {
          const count = item.value === "all" ? photos.length : photos.filter((photo) => photo.category === item.value).length;
          return (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? styles.filterActive : styles.filter}
              onClick={() => { setFilter(item.value); setActiveIndex(null); }}
              aria-pressed={filter === item.value}
            >
              {item.label}<span className={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {visiblePhotos.length === 0 ? (
        <p className={styles.empty}>{photos.length === 0 ? "No published photos yet. Images added to published news, squad profiles, staff profiles, or the gallery will appear here." : "There are no photos in this category yet."}</p>
      ) : (
        <>
          <ul className={styles.grid}>
            {visiblePhotos.map((photo, index) => (
              <li key={photo.id} className={styles.card}>
                <button
                  type="button"
                  className={styles.figure}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View ${photo.title} photo full size`}
                >
                  <div className={styles.thumb}>
                    <Image
                      src={photo.public_url}
                      alt={photo.alt}
                      fill
                      unoptimized
                      sizes="(max-width: 720px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption className={styles.figcaption}>
                    <span className={styles.caption}>{photo.title}</span>
                    <span className={styles.date}>{formatDate(photo.date)}</span>
                  </figcaption>
                </button>
              </li>
            ))}
          </ul>

          {activePhoto && (
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label={`${activePhoto.title} photo viewer`}
              onClick={close}
            >
              <button
                type="button"
                className={styles.lightboxClose}
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>

              {visiblePhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      step(-1);
                    }}
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      step(1);
                    }}
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                </>
              )}

              <figure
                className={styles.lightboxFigure}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.lightboxImage}>
                  {/* `fill` + object-fit: contain scales the photo up to the
                      viewport-sized box while preserving its aspect ratio. */}
                  <Image
                    src={activePhoto.public_url}
                    alt={activePhoto.alt}
                    fill
                    unoptimized
                    sizes="92vw"
                    priority
                  />
                </div>
                <figcaption className={styles.lightboxFigcaption}>
                  <span className={styles.lightboxCaption}>{activePhoto.title}</span>
                  <span className={styles.lightboxDate}>{formatDate(activePhoto.date)}</span>
                  {visiblePhotos.length > 1 && (
                    <span className={styles.lightboxCount}>
                      {(activeIndex ?? 0) + 1} / {visiblePhotos.length}
                    </span>
                  )}
                </figcaption>
              </figure>
            </div>
          )}
        </>
      )}

      <p className="data-note gallery-note">Published news, squad, and staff photos appear here automatically, alongside gallery uploads.</p>
    </>
  );
}
