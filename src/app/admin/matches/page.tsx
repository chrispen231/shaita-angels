import { PlaceholderScreen } from "@/app/admin/PlaceholderScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Matches & lineups" };

export default PlaceholderScreen({
  screen: "matches",
  title: "Matches & lineups",
  phase: "Phase 3",
  description: "Lineups, goals with scorer and minute, cards, and the written match report. This is what turns the Lineups and Stats tabs on a public match page from an honest placeholder into real content.",
  comingNext: "Lineups, goals, cards and the match report are entered per match. Date of birth is stored but only age is ever shown publicly, because the minimum squad age is 15.",
});
