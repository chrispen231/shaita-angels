import { PlaceholderScreen } from "@/app/admin/PlaceholderScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Honours" };

export default PlaceholderScreen({
  screen: "honors",
  title: "Honours",
  phase: "Phase 4",
  description: "Trophies and milestones, with the season, competition and result detail shown on the club page.",
  comingNext: "Honours move out of src/data/site.ts into the database alongside news and squad.",
});
