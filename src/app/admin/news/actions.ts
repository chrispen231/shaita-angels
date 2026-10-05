"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import { validateArticle, validateHonor, splitParagraphs } from "@/lib/content-validation";
import type { FixtureActionState } from "@/types/fixtures";

/**
 * Article and honour writes.
 *
 * Content editors and super admins only, matching the policies in
 * 20261005160000_content.sql. A fixtures admin cannot publish a story.
 *
 * Publishing is explicit: every write takes an is_published flag rather than
 * defaulting to published, because a half-written story that appears on the
 * homepage is worse than a draft the club has to notice and finish.
 *
 * An article is never deleted from here. Unpublishing is the correction, for the
 * same reason fixtures are never deleted: a URL that has been shared should keep
 * working, or at least keep saying clearly that the story is gone. Only the
 * honours screen allows removal, and that is a judgement call the UI confirms.
 */

async function requireContentEditor() {
  const context = await getAdminContext();
  if (!context) throw new Error("Sign in to edit content.");
  if (context.role !== "super_admin" && context.role !== "content") {
    throw new Error("Your role does not include news editing.");
  }
  return context;
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function emptyToNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

const UUID = /^[0-9a-f-]{36}$/i;

function articleIdFrom(formData: FormData) {
  const id = field(formData, "id");
  if (id === "") return null;
  if (!UUID.test(id)) throw new Error("Unknown story.");
  return id;
}

// =============================================================================
// Articles
// =============================================================================

export async function saveArticle(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireContentEditor();

  const input = {
    slug: field(formData, "slug"),
    category: field(formData, "category"),
    published_on: field(formData, "published_on"),
    title: field(formData, "title"),
    excerpt: field(formData, "excerpt"),
    image_path: field(formData, "image_path"),
    image_alt: text(formData, "image_alt"),
    body: text(formData, "body"),
    is_featured: checked(formData, "is_featured"),
  };

  const error = validateArticle(input);
  if (error) return { status: "error", message: error };

  const id = articleIdFrom(formData);
  const publish = checked(formData, "is_published");

  const payload = {
    slug: input.slug,
    category: input.category,
    published_on: input.published_on,
    title: input.title,
    excerpt: input.excerpt,
    image_path: emptyToNull(input.image_path),
    image_alt: emptyToNull(input.image_alt),
    body: splitParagraphs(input.body),
    is_featured: input.is_featured,
    is_published: publish,
  };

  const query = id
    ? context.supabase.from("articles").update(payload).eq("id", id)
    : context.supabase.from("articles").insert(payload);

  const { error: writeError } = await query;

  if (writeError) {
    // articles_published_slug_unique is partial, so this fires only when the slug
    // is already live. A draft reusing a slug is allowed by design.
    if (writeError.code === "23505") {
      return {
        status: "error",
        message: "Another published story already uses that web address. Choose a different one.",
      };
    }
    console.error("Article save failed", writeError.message);
    return { status: "error", message: "We couldn't save that story." };
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath(`/news/${input.slug}`);
  if (id) revalidatePath("/admin/news");

  return {
    status: "success",
    message: publish
      ? `"${input.title}" published.`
      : `"${input.title}" saved as a draft. Publish it when it is ready.`,
  };
}

export async function toggleArticlePublished(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireContentEditor();

  const id = field(formData, "id");
  if (!UUID.test(id)) return { status: "error", message: "Unknown story." };
  const publish = field(formData, "publish") === "true";

  const { error } = await context.supabase.from("articles").update({ is_published: publish }).eq("id", id);
  if (error) {
    console.error("Article publish toggle failed", error.message);
    return { status: "error", message: "We couldn't change that story's visibility." };
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
  return { status: "success", message: publish ? "Story published." : "Story unpublished." };
}

/**
 * Unpublishing is the removal path for articles.
 *
 * There is no hard delete here, deliberately: the story keeps its row so a
 * re-publish restores it, and the public page is never a 404 for a story the
 * club has taken down. Slug history stays intact.
 */
export async function retractArticle(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireContentEditor();

  const id = field(formData, "id");
  if (!UUID.test(id)) return { status: "error", message: "Unknown story." };

  const { error } = await context.supabase
    .from("articles")
    .update({ is_published: false, is_featured: false })
    .eq("id", id);

  if (error) {
    console.error("Article retract failed", error.message);
    return { status: "error", message: "We couldn't retract that story." };
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
  return { status: "success", message: "Story retracted. It is kept as a draft." };
}

// =============================================================================
// Honours
// =============================================================================

export async function saveHonor(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireContentEditor();

  const input = {
    year_label: field(formData, "year_label"),
    name: field(formData, "name"),
    detail: text(formData, "detail"),
  };

  const error = validateHonor(input);
  if (error) return { status: "error", message: error };

  const id = articleIdFrom(formData);
  const payload = {
    year_label: input.year_label,
    name: input.name,
    detail: emptyToNull(input.detail),
  };

  const query = id
    ? context.supabase.from("honors").update(payload).eq("id", id)
    : context.supabase.from("honors").insert({ ...payload, is_published: true });

  const { error: writeError } = await query;
  if (writeError) {
    console.error("Honour save failed", writeError.message);
    return { status: "error", message: "We couldn't save that honour." };
  }

  revalidatePath("/admin/honours");
  revalidatePath("/club");
  revalidatePath("/");
  return { status: "success", message: `${input.name} saved.` };
}

export async function removeHonor(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireContentEditor();

  const id = field(formData, "id");
  if (!UUID.test(id)) return { status: "error", message: "Unknown honour." };

  const { error } = await context.supabase.from("honors").delete().eq("id", id);
  if (error) {
    console.error("Honour delete failed", error.message);
    return { status: "error", message: "We couldn't remove that honour." };
  }

  revalidatePath("/admin/honours");
  revalidatePath("/club");
  revalidatePath("/");
  return { status: "success", message: "Honour removed." };
}

/** Reorders an honour up or down the list. */
export async function moveHonor(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireContentEditor();

  const id = field(formData, "id");
  const direction = field(formData, "direction");
  if (!UUID.test(id)) return { status: "error", message: "Unknown honour." };
  if (direction !== "up" && direction !== "down") {
    return { status: "error", message: "Unknown direction." };
  }

  // Every column needed for the upsert is selected, not just id and sort_order.
  // An upsert with a partial row would write NULL into the columns left out and
  // wipe the honour's name and year.
  const { data, error } = await context.supabase
    .from("honors")
    .select("id, year_label, name, detail, is_published, sort_order")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return { status: "error", message: "We couldn't reorder the honours." };
  }

  const index = data.findIndex((row) => String(row.id) === id);
  if (index === -1) return { status: "error", message: "Unknown honour." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= data.length) {
    return { status: "success", message: "Already at the end of the list." };
  }

  const current = data[index];
  const other = data[swapWith];

  // Guards the swap against a concurrent delete leaving a hole in the array.
  if (!current || !other) {
    return { status: "error", message: "We couldn't reorder the honours." };
  }

  // Swap the two sort_order values rather than renumbering the whole list, so
  // two admins reordering at once cannot corrupt every row between them.
  const { error: swapError } = await context.supabase
    .from("honors")
    .upsert(
      [
        { ...current, sort_order: other.sort_order },
        { ...other, sort_order: current.sort_order },
      ],
      { onConflict: "id" },
    );

  if (swapError) {
    console.error("Honour reorder failed", swapError.message);
    return { status: "error", message: "We couldn't reorder the honours." };
  }

  revalidatePath("/admin/honours");
  revalidatePath("/club");
  revalidatePath("/");
  return { status: "success", message: "Order updated." };
}