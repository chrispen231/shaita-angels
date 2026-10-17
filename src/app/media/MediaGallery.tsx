"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./media.module.css";

export type GalleryPhoto = {
  id: string;
  public_url: string;
  original_filename: string | null;
  uploaded_at: string;
};

export function MediaGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  return (
    <>
      <div className="content-heading">
        <div>
          <p className="eyebrow">From the archive</p>
          <h2>Moments in red.</h2>
        </div>
        <span className="data-note">{photos.length} {photos.length === 1 ? "photo" : "photos"}</span>
      </div>

      {photos.length === 0 ? (
        <p className={styles.empty}>No gallery photos published yet. Check back soon.</p>
      ) : (
        <>
          <ul className={styles.grid}>
            {photos.map((photo) => (
              <li key={photo.id} className={styles.card}>
                <button
                  type="button"
                  className={styles.figure}
                  onClick={() => setActivePhoto(photo)}
                  aria-label={`View ${photo.original_filename ?? "photo"}`}
                >
                  <div className={styles.thumb}>
                    <Image
                      src={photo.public_url}
                      alt={photo.original_filename ?? "Shaita Angels gallery photo"}
                      fill
                      unoptimized
                      sizes="(max-width: 720px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption>
                    <span className={styles.caption}>Shaita Angels FC</span>
                    <span className={styles.date}>
                      {new Date(photo.uploaded_at).toLocaleDateString("en-GB")}
                    </span>
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
              aria-label={activePhoto.original_filename ?? "Photo viewer"}
              onClick={() => setActivePhoto(null)}
            >
              <button
                type="button"
                className={styles.lightboxClose}
                onClick={() => setActivePhoto(null)}
                aria-label="Close"
              >
                ×
              </button>
              <figure
                className={styles.lightboxFigure}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.lightboxImage}>
                  <Image
                    src={activePhoto.public_url}
                    alt={activePhoto.original_filename ?? "Shaita Angels gallery photo"}
                    fill
                    unoptimized
                    sizes="100vw"
                    priority
                  />
                </div>
                <figcaption className={styles.lightboxFigcaption}>
                  <span className={styles.lightboxCaption}>Shaita Angels FC</span>
                  <span className={styles.lightboxDate}>
                    {new Date(activePhoto.uploaded_at).toLocaleDateString("en-GB")}
                  </span>
                </figcaption>
              </figure>
            </div>
          )}
        </>
      )}

      <p className="data-note gallery-note">
        Photos supplied with the project. Dates and match captions will be added when confirmed by the
        club.
      </p>
    </>
  );
}
