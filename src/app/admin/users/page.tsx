import { PlaceholderScreen } from "@/app/admin/PlaceholderScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administrators" };

export default PlaceholderScreen({
  screen: "users",
  title: "Administrators",
  phase: "Phase 5",
  description: "Add, demote and remove the admins who can manage this site. Super admin only.",
  comingNext: "Promoting and removing admins is deliberately not something the application can do: there is no insert, update or delete policy on site_admins, so this screen will guide the dashboard steps rather than write directly.",
});
