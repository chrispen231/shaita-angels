/**
 * News and honours validation.
 *
 * Mirrors the CHECK constraints in
 * supabase/migrations/20261005160000_content.sql, the same relationship the
 * fixture and match-content validators have to the schema. Named here rather than
 * in src/lib/content/ because src/lib/content.ts already occupies that name.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type ArticleInput = {
  slug: string;
  category: string;
  published_on: string;
  title: string;
  excerpt: string;
  image_path: string;
  image_alt: string;
  body: string;
  is_featured: boolean;
};

function isBlank(value: string) {
  return value.trim().length === 0;
}

export function validateArticle(input: ArticleInput): string | null {
  // article_slug_format + article_slug_length
  if (isBlank(input.slug)) {
    return "Enter a web address for the story, in lowercase with hyphens.";
  }
  const slug = input.slug.trim();
  if (slug.length > 120) return "That web address is too long.";
  if (!SLUG.test(slug)) {
    return "Use lowercase letters, numbers and single hyphens only, so the address reads like orange-cup-2026.";
  }

  // article_title_length: 1..200
  if (isBlank(input.title)) return "Enter the headline.";
  if (input.title.trim().length > 200) return "Keep the headline under 200 characters.";

  // article_excerpt_length: 1..400
  if (isBlank(input.excerpt)) return "Enter a short summary for the newsroom card.";
  if (input.excerpt.trim().length > 400) return "Keep the summary under 400 characters.";

  // article_category_length: 1..60
  if (isBlank(input.category)) return "Enter a category, such as Match report.";
  if (input.category.trim().length > 60) return "Keep the category under 60 characters.";

  if (!ISO_DATE.test(input.published_on.trim())) {
    return "Enter the publication date as YYYY-MM-DD.";
  }
  if (Number.isNaN(Date.parse(`${input.published_on.trim()}T00:00:00Z`))) {
    return "That publication date is not a real date.";
  }

  // article_image_alt_length: <= 200 when present
  if (input.image_alt.length > 200) return "Keep the image description under 200 characters.";

  // article_body_present: array_length(body, 1) between 1 and 60
  //
  // Checked against the raw text, not the split result: a body of nothing but
  // spaces and blank lines splits to one empty paragraph, which would satisfy the
  // database constraint and render an empty story page.
  if (input.body.trim() === "") return "Write the story body.";

  const paragraphs = splitParagraphs(input.body);
  if (paragraphs.length === 0) return "Write the story body.";
  if (paragraphs.length > 60) return "That is more than 60 paragraphs. Split it into separate stories.";

  return null;
}

/**
 * Splits an editor textarea into paragraphs.
 *
 * A blank line separates paragraphs, which is what a writer expects. A blank line
 * inside an article is a deliberate break in the seed data too, so an empty string
 * is preserved as a paragraph rather than dropped, except at the very end where a
 * trailing blank is just the editor's cursor.
 */
export function splitParagraphs(body: string): string[] {
  return (
    body
      // Horizontal whitespace only. \n\s*\n would match across several newlines
      // and swallow a deliberate blank paragraph, because \s includes \n.
      .split(/[ \t]*\n[ \t]*\n[ \t]*/)
      .map((paragraph) => paragraph.replace(/[ \t]+$/gm, ""))
      // Normalise a whitespace-only paragraph to an empty string, so the trailing
      // check below is meaningful. Interior blanks stay, because they are the
      // section breaks the seed articles use.
      .map((paragraph) => (paragraph.trim() === "" ? "" : paragraph))
      .filter((paragraph, index, all) => !(paragraph === "" && index === all.length - 1))
  );
}

export type HonorInput = {
  year_label: string;
  name: string;
  detail: string;
};

export function validateHonor(input: HonorInput): string | null {
  // honor_year_length: 1..20
  if (isBlank(input.year_label)) return "Enter the year or season, such as 2024-25.";
  if (input.year_label.trim().length > 20) return "Keep the year under 20 characters.";

  // honor_name_length: 1..120
  if (isBlank(input.name)) return "Enter the name of the competition.";
  if (input.name.trim().length > 120) return "Keep the competition name under 120 characters.";

  // honor_detail_length: <= 200 when present
  if (input.detail.length > 200) return "Keep the detail under 200 characters.";

  return null;
}

/** A readable slug suggestion, for the news editor's "from headline" button. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}