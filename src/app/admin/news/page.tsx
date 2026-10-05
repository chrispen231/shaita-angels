import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import NewsManager, { type ArticleRow } from "./NewsManager";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "News" };

export default async function NewsAdminPage() {
  const context = requireScreen(await getAdminContext(), "news");

  const { data } = await context.supabase
    .from("articles")
    .select("id, slug, category, published_on, title, excerpt, image_path, image_alt, body, is_featured, is_published")
    .order("published_on", { ascending: false })
    .order("sort_order", { ascending: true });

  const articles: ArticleRow[] = (data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    category: String(row.category),
    published_on: String(row.published_on),
    title: String(row.title),
    excerpt: String(row.excerpt),
    image_path: row.image_path === null ? null : String(row.image_path),
    image_alt: row.image_alt === null ? null : String(row.image_alt),
    body: Array.isArray(row.body) ? row.body.map(String) : [],
    is_featured: Boolean(row.is_featured),
    is_published: Boolean(row.is_published),
  }));

  const live = articles.filter((article) => article.is_published).length;
  const featured = articles.filter((article) => article.is_featured && article.is_published).length;

  return (
    <AdminShell
      context={context}
      active="news"
      title="News"
      description="Write, revise and publish club stories. Nothing reaches the homepage until you publish it."
    >
      <ul className={styles.summary}>
        <li>
          <span className={styles.count}>{live}</span>
          <span className={styles.label}>Published</span>
        </li>
        <li>
          <span className={styles.count}>{articles.length - live}</span>
          <span className={styles.label}>Drafts</span>
        </li>
        <li>
          <span className={styles.count}>{featured}</span>
          <span className={styles.label}>Featured</span>
        </li>
      </ul>

      <NewsManager articles={articles} />
    </AdminShell>
  );
}
