import { PlaceholderScreen } from "@/app/admin/PlaceholderScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media library" };

export default PlaceholderScreen({
  screen: "media",
  title: "Media library",
  phase: "Phase 5",
  description: "One place to upload and manage the images used across the site, rather than each tool handling its own files.",
  comingNext: "Images move to Supabase Storage with per-bucket RLS, which is what sponsor uploads need. Orphan handling is defined here.",
});
