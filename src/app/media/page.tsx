import { createClient } from "@/lib/supabase/server";
import { getArticles, getSquad, getStaff, getLeadership } from "@/lib/content";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { buildGalleryPhotos } from "@/lib/gallery";
import { MediaGallery } from "./MediaGallery";

export const dynamic = "force-dynamic";

export const metadata = { title: "Media · Shaita Angels FC" };

export default async function MediaPage() {
  const [articles, players, staff, leaders] = await Promise.all([getArticles(), getSquad(), getStaff(), getLeadership()]);
  let uploads: { id: string | number; public_url: string; original_filename: string | null; uploaded_at: string }[] = [];

  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("media_uploads")
      .select("id, public_url, original_filename, uploaded_at")
      .eq("purpose", "gallery")
      .eq("is_published", true)
      .order("uploaded_at", { ascending: false })
      .limit(200);

    if (error) console.error("Published gallery upload read failed", error.message);
    uploads = data ?? [];
  }

  const photos = buildGalleryPhotos({ articles, players, staff, leaders, uploads });

  return <MediaGallery photos={photos} />;
}
