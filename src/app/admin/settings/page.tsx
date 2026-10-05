import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import SettingsForm from "./SettingsForm";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { SiteSettings } from "@/types/sponsors";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Social & contact" };

export default async function SettingsPage() {
  const context = requireScreen(await getAdminContext(), "settings");
  const configured = Boolean(getSupabaseConfig());

  let settings: SiteSettings = { social_handles: [], contact_email: null, phone_orders: null };
  if (configured) {
    const { data } = await context.supabase
      .from("site_settings")
      .select("social_handles, contact_email, phone_orders")
      .eq("id", true)
      .maybeSingle();

    if (data) {
      settings = {
        social_handles: Array.isArray(data.social_handles) ? data.social_handles : [],
        contact_email: data.contact_email ?? null,
        phone_orders: data.phone_orders ?? null,
      };
    }
  }

  return (
    <AdminShell
      context={context}
      active="settings"
      title="Social &amp; contact"
      description="Social links appear in the row above the footer. Each one carries a visible-to-screen-reader name, which the reference club site does not."
    >
      {!configured && (
        <p className={styles.warning}>
          Supabase is not configured, so nothing can be saved yet.
        </p>
      )}

      <SettingsForm settings={settings} />
    </AdminShell>
  );
}