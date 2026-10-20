import { Suspense } from "react";
import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import AuditLog from "./AuditLog";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  const context = requireScreen(await getAdminContext(), "audit");

  return (
    <AdminShell
      context={context}
      active="audit"
      title="Audit log"
      description="A record of admin changes: who did what, and when. Entries cannot be edited or deleted."
    >
      {/* AuditLog reads its initial filters from the URL. */}
      <Suspense>
        <AuditLog />
      </Suspense>
    </AdminShell>
  );
}
