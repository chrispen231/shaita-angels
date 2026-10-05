import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, formatArticleDate } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * A single article.
 *
 * generateStaticParams is deliberately absent: articles now come from the
 * database and change without a deploy, so the route resolves the slug per request.
 * Leaving a stale static list here would 404 a newly published article.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Story not found" };
  return { title: article.title, description: article.excerpt };
}

export default async function NewsArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="article-page">
      <div className="article-header wrap">
        <Link className="back-link" href="/news">
          ← All news
        </Link>
        <div className="news-meta">
          <span>{article.category}</span>
          <time dateTime={article.date}>{formatArticleDate(article.date)}</time>
        </div>
        <h1>{article.title}</h1>
        <p className="article-deck">{article.excerpt}</p>
      </div>

      {article.image && (
        <div className="article-image">
          <Image
            src={article.image}
            alt={article.imageAlt ?? article.title}
            fill
            priority
            sizes="100vw"
          />
        </div>
      )}

      <div className="article-body">
        {article.body.map((paragraph, index) =>
          paragraph.trim() === "" ? (
            // An empty string is a deliberate paragraph break, kept from the seed
            // format where it separates sections of a longer story.
            <div className="article-break" key={index} aria-hidden="true" />
          ) : (
            <p key={index}>{paragraph}</p>
          ),
        )}
        <div className="article-signoff">
          <span>SHAITA ANGELS FC</span>
          <Link className="text-link" href="/news">
            More stories <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
