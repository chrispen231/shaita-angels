import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuditLog from "./AuditLog";

export default async function AuditLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/admin/login");
  }

  // Check if user is super_admin
  const { data: isSuperAdmin } = await supabase.rpc("has_role", { role_name: "super_admin" });
  
  if (!isSuperAdmin) {
    redirect("/admin");
  }

  return (
    <main>
      <AuditLog />
    </main>
  );
}