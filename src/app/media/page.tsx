import { createClient } from "@/lib/supabase/server";
import { MediaGallery, type GalleryPhoto } from "./MediaGallery";

export const dynamic = "force-dynamic";

export const metadata = { title: "Media · Shaita Angels FC" };

export default async function MediaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_uploads")
    .select("id, public_url, original_filename, uploaded_at")
    .eq("purpose", "gallery")
    .eq("is_published", true)
    .order("uploaded_at", { ascending: false })
    .limit(200);

  const photos: GalleryPhoto[] = (data ?? []).map((row) => ({
    id: String(row.id),
    public_url: String(row.public_url),
    original_filename: row.original_filename === null ? null : String(row.original_filename),
    uploaded_at: String(row.uploaded_at),
  }));

  return <MediaGallery photos={photos} />;
}
