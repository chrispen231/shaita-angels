import { PlaceholderScreen } from "@/app/admin/PlaceholderScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "News" };

export default PlaceholderScreen({
  screen: "news",
  title: "News",
  phase: "Phase 4",
  description: "Draft and publish stories, with an author, a hero image and optional scheduling. The first step is migrating the articles out of src/data/site.ts into the database.",
  comingNext: "News moves out of the codebase into the database, after which the club publishes without a deploy.",
});
