"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  saveArticle,
  toggleArticlePublished,
  retractArticle,
} from "./actions";
import type { FixtureActionState } from "@/types/fixtures";
import { slugify } from "@/lib/content-validation";
import styles from "./NewsManager.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export type ArticleRow = {
  id: string;
  slug: string;
  category: string;
  published_on: string;
  title: string;
  excerpt: string;
  image_path: string | null;
  image_alt: string | null;
  body: string[];
  is_featured: boolean;
  is_published: boolean;
};

export default function NewsManager({ articles }: { articles: ArticleRow[] }) {
  const [saveState, saveAction, savePending] = useActionState(saveArticle, initial);
  const [toggleState, toggleAction] = useActionState(toggleArticlePublished, initial);
  const [retractState, retractAction, retractPending] = useActionState(retractArticle, initial);

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {articles.length} {articles.length === 1 ? "story" : "stories"}
        </h2>
        <p className={styles.hint}>
          Stories are saved as drafts until you publish them. Retracting a story keeps it as a
          draft rather than deleting it, so a shared link stays meaningful.
        </p>

        {articles.length === 0 ? (
          <p className={styles.hint}>No stories yet. Write the first one below.</p>
        ) : (
          <ul className={styles.list}>
            {articles.map((article) => {
              const isEditing = editing === article.id;
              return (
                <li className={styles.row} key={article.id}>
                  <div className={styles.identity}>
                    <span className={styles.title}>{article.title}</span>
                    <span className={styles.meta}>
                      {article.category} · {article.published_on} · /news/{article.slug}
                    </span>
                    <span className={styles.flags}>
                      {article.is_published ? (
                        <span className={styles.published}>Published</span>
                      ) : (
                        <span className={styles.draft}>Draft</span>
                      )}
                      {article.is_featured && <span className={styles.featured}>Featured</span>}
                    </span>
                  </div>

                  <div className={styles.rowActions}>
                    {article.is_published && (
                      <Link
                        href={`/news/${article.slug}`}
                        className={styles.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </Link>
                    )}
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => {
                        setEditing(isEditing ? null : article.id);
                        setSlug(article.slug);
                        setSlugTouched(true);
                      }}
                      aria-expanded={isEditing}
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>

                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <input
                        type="hidden"
                        name="publish"
                        value={article.is_published ? "false" : "true"}
                      />
                      <button type="submit" className={styles.secondary}>
                        {article.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </form>

                    {article.is_published && (
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => setConfirming(confirming === article.id ? null : article.id)}
                        aria-expanded={confirming === article.id}
                      >
                        Retract
                      </button>
                    )}
                  </div>

                  {confirming === article.id && (
                    <form action={retractAction} className={styles.confirm}>
                      <input type="hidden" name="id" value={article.id} />
                      <p className={styles.confirmText}>
                        Retract &ldquo;{article.title}&rdquo;? It disappears from the newsroom and the
                        homepage, and is kept as a draft.
                      </p>
                      <div className={styles.confirmActions}>
                        <button type="submit" className={styles.danger} disabled={retractPending}>
                          {retractPending ? "Retracting…" : "Yes, retract"}
                        </button>
                        <button
                          type="button"
                          className={styles.secondary}
                          onClick={() => setConfirming(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {isEditing && (
                    <form action={saveAction} className={styles.editForm}>
                      <input type="hidden" name="id" value={article.id} />
                      <ArticleFields
                        article={article}
                        slug={slug}
                        setSlug={setSlug}
                        slugTouched={slugTouched}
                        setSlugTouched={setSlugTouched}
                      />
                      <div className={styles.actions}>
                        <button type="submit" disabled={savePending}>
                          {savePending ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className={toggleState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {toggleState.message}
        </p>
        <p className={retractState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {retractState.message}
        </p>
      </section>

      <form action={saveAction} className={styles.card}>
        <h2 className={styles.cardTitle}>Write a story</h2>
        <p className={styles.hint}>
          Leave &ldquo;Publish&rdquo; unticked to save a draft. A story with no image uses the club
          artwork on its card.
        </p>

        <ArticleFields
          slug={slug}
          setSlug={setSlug}
          slugTouched={slugTouched}
          setSlugTouched={setSlugTouched}
        />

        <div className={styles.actions}>
          <button type="submit" disabled={savePending}>
            {savePending ? "Saving…" : "Save story"}
          </button>
        </div>

        <p className={saveState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {saveState.message}
        </p>
      </form>
    </div>
  );
}

function ArticleFields({
  article,
  slug,
  setSlug,
  slugTouched,
  setSlugTouched,
}: {
  article?: ArticleRow;
  slug: string;
  setSlug: (value: string) => void;
  slugTouched: boolean;
  setSlugTouched: (value: boolean) => void;
}) {
  const id = (name: string) => `${article ? "edit" : "new"}-${name}`;

  return (
    <>
      <div className={styles.fields}>
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label htmlFor={id("title")}>Headline</label>
          <input
            id={id("title")}
            name="title"
            required
            maxLength={200}
            defaultValue={article?.title ?? ""}
            // Only fill the slug from the headline while the writer has not typed
            // one. Overwriting a deliberate slug would break an existing link.
            onChange={(event) => {
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
          />
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label htmlFor={id("slug")}>Web address</label>
          <div className={styles.slugRow}>
            <span className={styles.slugPrefix}>/news/</span>
            <input
              id={id("slug")}
              name="slug"
              required
              maxLength={120}
              value={article ? article.slug : slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugTouched(true);
              }}
            />
          </div>
          <p className={styles.fieldHint}>
            Lowercase letters, numbers and single hyphens. This is the link the club shares.
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor={id("category")}>Category</label>
          <input
            id={id("category")}
            name="category"
            required
            maxLength={60}
            defaultValue={article?.category ?? ""}
            placeholder="Match report"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={id("date")}>Publication date</label>
          <input
            id={id("date")}
            name="published_on"
            type="date"
            required
            defaultValue={article?.published_on ?? ""}
          />
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label htmlFor={id("excerpt")}>Summary</label>
          <textarea
            id={id("excerpt")}
            name="excerpt"
            required
            rows={2}
            maxLength={400}
            defaultValue={article?.excerpt ?? ""}
          />
          <p className={styles.fieldHint}>Shown on the newsroom card and used as the page summary.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor={id("image")}>Image path</label>
          <input
            id={id("image")}
            name="image_path"
            defaultValue={article?.image_path ?? ""}
            placeholder="/orange-cup-2026.jpg"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={id("alt")}>Image description</label>
          <input
            id={id("alt")}
            name="image_alt"
            maxLength={200}
            defaultValue={article?.image_alt ?? ""}
          />
          <p className={styles.fieldHint}>Describe the photo for someone who cannot see it.</p>
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label htmlFor={id("body")}>Story</label>
          <textarea
            id={id("body")}
            name="body"
            required
            rows={12}
            defaultValue={article?.body.join("\n\n") ?? ""}
          />
          <p className={styles.fieldHint}>
            Leave a blank line between paragraphs. Two blank lines insert a section break.
          </p>
        </div>
      </div>

      <div className={styles.toggles}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={article?.is_featured ?? false}
          />
          <span>Feature story</span>
        </label>
        <label className={styles.checkbox}>
          <input type="checkbox" name="is_published" />
          <span>Publish now</span>
        </label>
      </div>
    </>
  );
}
