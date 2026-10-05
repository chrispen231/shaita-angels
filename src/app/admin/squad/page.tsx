import { PlaceholderScreen } from "@/app/admin/PlaceholderScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Squad" };

export default PlaceholderScreen({
  screen: "squad",
  title: "Squad",
  phase: "Phase 4",
  description: "Players with full name, shirt number, position, date of birth, height and weight, plus a profile photo and biography.",
  comingNext: "The 24-player list currently hardcoded in src/data/site.ts moves into the database. Date of birth is club-confidential and never rendered publicly.",
});
