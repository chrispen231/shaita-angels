import { describe, it, expect } from "vitest";
import {
  validateArticle,
  validateHonor,
  splitParagraphs,
  slugify,
  type ArticleInput,
} from "@/lib/content-validation";

const base: ArticleInput = {
  slug: "orange-cup-2026",
  category: "Trophy room",
  published_on: "2026-07-14",
  title: "The Angels bring the Orange Cup home",
  excerpt: "A 2-1 win over World Girls.",
  image_path: "/orange-cup-2026.jpg",
  image_alt: "The team celebrate",
  body: "First paragraph.\n\nSecond paragraph.",
  is_featured: false,
};

describe("validateArticle", () => {
  it("accepts a complete article", () => {
    expect(validateArticle(base)).toBeNull();
  });

  it("requires a body", () => {
    expect(validateArticle({ ...base, body: "" })).toMatch(/Write the story body/);
    // Whitespace on either side of the break is still one blank paragraph.
    expect(validateArticle({ ...base, body: "   \n\n  " })).toMatch(/Write the story body/);
    // A single newline is not a paragraph break, but the body is still only
    // whitespace, so it is still empty as far as the reader is concerned.
    expect(validateArticle({ ...base, body: " \n " })).toMatch(/Write the story body/);
  });

  it("rejects a slug that is not url safe", () => {
    // article_slug_format: ^[a-z0-9]+(-[a-z0-9]+)*$
    expect(validateArticle({ ...base, slug: "Orange Cup 2026" })).toMatch(/lowercase/);
    expect(validateArticle({ ...base, slug: "orange--cup" })).toMatch(/single hyphens/);
    expect(validateArticle({ ...base, slug: "-orange" })).toMatch(/lowercase/);
    expect(validateArticle({ ...base, slug: "orange-cup-" })).toMatch(/lowercase/);
    expect(validateArticle({ ...base, slug: "" })).toMatch(/web address/);
  });

  it("accepts a valid slug with numbers and single hyphens", () => {
    expect(validateArticle({ ...base, slug: "one-point-from-history-2026" })).toBeNull();
  });

  it("requires a headline, summary and category", () => {
    expect(validateArticle({ ...base, title: "" })).toMatch(/headline/);
    expect(validateArticle({ ...base, excerpt: "" })).toMatch(/summary/);
    expect(validateArticle({ ...base, category: "" })).toMatch(/category/);
  });

  it("enforces the length limits", () => {
    expect(validateArticle({ ...base, title: "a".repeat(201) })).toMatch(/under 200/);
    expect(validateArticle({ ...base, excerpt: "a".repeat(401) })).toMatch(/under 400/);
    expect(validateArticle({ ...base, category: "a".repeat(61) })).toMatch(/under 60/);
    expect(validateArticle({ ...base, image_alt: "a".repeat(201) })).toMatch(/under 200/);
    expect(validateArticle({ ...base, slug: "a".repeat(121) })).toMatch(/too long/);
  });

  it("allows an absent image and image description", () => {
    expect(validateArticle({ ...base, image_path: "", image_alt: "" })).toBeNull();
  });

  it("validates the publication date", () => {
    expect(validateArticle({ ...base, published_on: "14 July 2026" })).toMatch(/YYYY-MM-DD/);
    expect(validateArticle({ ...base, published_on: "2026-13-45" })).toMatch(/not a real date/);
    expect(validateArticle({ ...base, published_on: "" })).toMatch(/YYYY-MM-DD/);
  });

  it("caps the body at 60 paragraphs", () => {
    // article_body_present: array_length(body, 1) between 1 and 60
    const sixty = Array.from({ length: 60 }, (_, i) => `Paragraph ${i}`).join("\n\n");
    expect(validateArticle({ ...base, body: sixty })).toBeNull();

    const sixtyOne = Array.from({ length: 61 }, (_, i) => `Paragraph ${i}`).join("\n\n");
    expect(validateArticle({ ...base, body: sixtyOne })).toMatch(/more than 60/);
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines", () => {
    expect(splitParagraphs("One.\n\nTwo.")).toEqual(["One.", "Two."]);
  });

  it("returns one paragraph when there are no blank lines", () => {
    expect(splitParagraphs("One line only")).toEqual(["One line only"]);
  });

  it("trims trailing whitespace inside a paragraph", () => {
    expect(splitParagraphs("One.   \n\nTwo.")).toEqual(["One.", "Two."]);
  });

  it("keeps a deliberate blank paragraph but drops a trailing one", () => {
    // The seed articles use an empty string as a section break, so it must survive.
    expect(splitParagraphs("One.\n\n\n\nTwo.")).toEqual(["One.", "", "Two."]);
    expect(splitParagraphs("One.\n\n")).toEqual(["One."]);
  });

  it("returns nothing for an empty body", () => {
    expect(splitParagraphs("")).toEqual([]);
  });
});

describe("validateHonor", () => {
  const honor = { year_label: "2026", name: "Orange Cup", detail: "Winners" };

  it("accepts a complete honour", () => {
    expect(validateHonor(honor)).toBeNull();
  });

  it("requires a year and a name", () => {
    expect(validateHonor({ ...honor, year_label: "" })).toMatch(/year or season/);
    expect(validateHonor({ ...honor, name: "" })).toMatch(/competition/);
  });

  it("allows an absent detail", () => {
    expect(validateHonor({ ...honor, detail: "" })).toBeNull();
  });

  it("enforces the length limits", () => {
    expect(validateHonor({ ...honor, year_label: "a".repeat(21) })).toMatch(/under 20/);
    expect(validateHonor({ ...honor, name: "a".repeat(121) })).toMatch(/under 120/);
    expect(validateHonor({ ...honor, detail: "a".repeat(201) })).toMatch(/under 200/);
  });

  it("accepts a season range as the year", () => {
    expect(validateHonor({ ...honor, year_label: "2024-25" })).toBeNull();
  });
});

describe("slugify", () => {
  it("turns a headline into a url-safe slug", () => {
    expect(slugify("The Angels bring the Orange Cup home")).toBe(
      "the-angels-bring-the-orange-cup-home",
    );
  });

  it("strips accents and punctuation", () => {
    expect(slugify("Künye vs Café")).toBe("kunye-vs-cafe");
  });

  it("collapses runs of separators and trims the ends", () => {
    expect(slugify("  One   --  Two!!  ")).toBe("one-two");
  });

  it("returns an empty string for input with nothing usable", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("produces a slug that passes validation", () => {
    const slug = slugify("One point from history, 2026");
    expect(validateArticle({ ...base, slug })).toBeNull();
  });
});
