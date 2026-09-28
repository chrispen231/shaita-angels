import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/site";

export function generateStaticParams() { return articles.map((article) => ({ slug: article.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  return article ? { title: article.title, description: article.excerpt } : {};
}

export default async function NewsArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  return <article className="article-page">
    <div className="article-header wrap"><Link className="back-link" href="/news">← All news</Link><div className="news-meta"><span>{article.category}</span><time>{article.date}</time></div><h1>{article.title}</h1><p className="article-deck">{article.excerpt}</p></div>
    <div className="article-image"><Image src={article.image} alt={article.imageAlt} fill priority sizes="100vw" /></div>
    <div className="article-body">{article.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="article-signoff"><span>SHAITA ANGELS FC</span><Link className="text-link" href="/news">More stories <span aria-hidden="true">↗</span></Link></div></div>
  </article>;
}
