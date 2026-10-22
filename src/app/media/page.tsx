import { createClient } from "@/lib/supabase/server";
import { getArticles, getSquad, getStaff, getLeadership } from "@/lib/content";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { buildGalleryPhotos } from "@/lib/gallery";
import { publicUrlFor, type MediaBucket } from "@/lib/media";
import { MediaGallery } from "./MediaGallery";

export const dynamic = "force-dynamic";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const [articles, players, staff, leaders] = await Promise.all([getArticles(), getSquad(), getStaff(), getLeadership()]);
  let uploads: { id: string | number; public_url: string; original_filename: string | null; uploaded_at: string }[] = [];

  if (getSupabaseConfig()) {
    const supabase = await createClient();
    // The URL is rebuilt from bucket and object_path rather than read from
    // public_url, which the uploader supplies and could point at any host.
    const { data, error } = await supabase
      .from("media_uploads")
      .select("id, bucket, object_path, original_filename, uploaded_at")
      .eq("purpose", "gallery")
      .eq("is_published", true)
      .order("uploaded_at", { ascending: false })
      .limit(200);

    if (error) console.error("Published gallery upload read failed", error.message);
    uploads = (data ?? []).map(({ bucket, object_path, ...row }) => ({
      ...row,
      public_url: publicUrlFor(bucket as MediaBucket, object_path) ?? "",
    }));
  }

  const photos = buildGalleryPhotos({ articles, players, staff, leaders, uploads });

  return <MediaGallery photos={photos} />;
}
