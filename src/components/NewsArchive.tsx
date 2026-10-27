"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./NewsArchive.module.css";

import { ArrowUpRight } from "lucide-react";
export type ArchiveArticle = {
  slug: string;
  category: string;
  /** ISO date; rendered by formatArchiveDate below. */
  date: string;
  title: string;
  excerpt: string;
  image: string | null;
  imageAlt: string | null;
  isFeatured: boolean;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Renders an ISO date in the club's long form: "14 July 2026".
 *
 * Defined here rather than passed in from the server: a function is not
 * serialisable across the server/client boundary, so handing one to a client
 * component throws at render. Built from the parts rather than through Date, so
 * the output never shifts with the server's timezone - `new Date("2026-07-14")`
 * renders the 13th west of UTC.
 */
export function formatArchiveDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return iso;
  return `${Number(day)} ${monthName} ${year}`;
}

/**
 * The news archive: a lead story, category and year filters, then the rest of
 * the articles.
 *
 * Filtering runs in the browser rather than through the URL. The whole archive
 * arrives on one page, so a chip click should be instant rather than a round
 * trip. The trade-off worth knowing: a filtered view is not shareable. If the
 * club ever wants to link to "all transfer news", move this to searchParams the
 * way the match centre does.
 */
export default function NewsArchive({
  articles,
  categories,
}: {
  articles: ArchiveArticle[];
  /** Categories offered as filters, in display order. */
  categories: string[];
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);

  const years = useMemo(() => {
    const found = new Set(articles.map((a) => a.date.slice(0, 4)));
    return [...found].filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [articles]);

  // Only offer a category chip when something is actually in it, so the filter
  // row never presents a tab that leads to an empty list.
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const article of articles) map[article.category] = (map[article.category] ?? 0) + 1;
    return map;
  }, [articles]);
  const availableCategories = useMemo(
    () => categories.filter((item) => (counts[item] ?? 0) > 0),
    [categories, counts],
  );

  const filtered = useMemo(
    () =>
      articles.filter(
        (a) => (!category || a.category === category) && (!year || a.date.startsWith(year)),
      ),
    [articles, category, year],
  );

  // The lead story is only pulled out of the list in the unfiltered view; once a
  // filter is on, the reader wants a plain list of what matched.
  const isUnfiltered = category === null && year === null;
  const lead = isUnfiltered ? filtered[0] : undefined;
  const rest = isUnfiltered ? filtered.slice(1) : filtered;

  return (
    <div className={styles.newsroom}>
      <div className={styles.label}>
        <span className="eyebrow">The latest</span>
        <span>
          SHAITA ANGELS FC <i aria-hidden="true">/</i> NEWSROOM
        </span>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <span className={styles.filterLabel} id="news-category-label">
            Category
          </span>
          <ul className={styles.chips} aria-labelledby="news-category-label">
            <li>
              <button
                type="button"
                className={`${styles.chip} ${category === null ? styles.chipActive : ""}`}
                onClick={() => setCategory(null)}
                aria-current={category === null}
              >
                All
              </button>
            </li>
            {availableCategories.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className={`${styles.chip} ${category === item ? styles.chipActive : ""}`}
                  onClick={() => setCategory(item)}
                  aria-current={category === item}
                >
                  {item}
                  <span className={styles.count}>{counts[item]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {years.length > 1 && (
          <div className={styles.filterRow}>
            <span className={styles.filterLabel} id="news-year-label">
              Year
            </span>
            <ul className={styles.chips} aria-labelledby="news-year-label">
              <li>
                <button
                  type="button"
                  className={`${styles.chip} ${year === null ? styles.chipActive : ""}`}
                  onClick={() => setYear(null)}
                  aria-current={year === null}
                >
                  All
                </button>
              </li>
              {years.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className={`${styles.chip} ${year === item ? styles.chipActive : ""}`}
                    onClick={() => setYear(item)}
                    aria-current={year === item}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Announce the result count so a filter change is not silent for screen
          reader users. */}
      <p className={styles.status} role="status">
        {filtered.length} {filtered.length === 1 ? "story" : "stories"}
        {category ? ` in ${category}` : ""}
        {year ? ` from ${year}` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          Nothing published in this category yet. Try another filter.
        </p>
      ) : (
        <>
          {lead && (
            <Link className={`news-card news-card-featured news-lead-story`} href={`/news/${lead.slug}`}>
              <div className="news-image">
                <Image
                  src={lead.image ?? "/news-featured.jpg"}
                  alt={lead.imageAlt ?? "Shaita Angels FC"}
                  fill
                  priority
                  sizes="(max-width: 720px) 100vw, 60vw"
                />
              </div>
              <div className="news-copy">
                <span className="news-featured-tag">FEATURE STORY</span>
                <div className="news-meta">
                  <span>{lead.category}</span>
                  <time>{formatArchiveDate(lead.date)}</time>
                </div>
                <h2>{lead.title}</h2>
                <p>{lead.excerpt}</p>
                <span className="text-link">
                  Read the story <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span>
                </span>
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <>
              <div className="content-heading news-archive-heading">
                <div>
                  <p className="eyebrow">{isUnfiltered ? "From the archive" : "Filtered stories"}</p>
                  <h2>{isUnfiltered ? "More from the newsroom" : category ?? year ?? "Stories"}</h2>
                </div>
              </div>
              <div className="news-grid news-archive-grid">
                {rest.map((article) => (
                  <Link className="news-card" href={`/news/${article.slug}`} key={article.slug}>
                    <div className="news-image">
                      <Image
                        src={article.image ?? "/news-featured.jpg"}
                        alt={article.imageAlt ?? "Shaita Angels FC"}
                        fill
                        sizes="(max-width: 720px) 100vw, 50vw"
                      />
                    </div>
                    <div className="news-copy">
                      <div className="news-meta">
                        <span>{article.category}</span>
                        <time>{formatArchiveDate(article.date)}</time>
                      </div>
                      <h3>{article.title}</h3>
                      <p>{article.excerpt}</p>
                      <span className="text-link">
                        Read story <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <p className={styles.newsroomNote}>
        Stories are published as club updates are confirmed. Check back for more from the Angels.
      </p>
    </div>
  );
}
