"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, Loader2 } from "lucide-react";
import { AUDIT_TARGET_TYPES, type AuditActorRole } from "@/lib/admin/audit-types";
import styles from "./AuditLog.module.css";

export type AuditLogRow = {
  id: string;
  actor_email: string;
  actor_role: AuditActorRole;
  target_type: string;
  target_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLogFilters = {
  actor_email?: string;
  target_type?: string;
  target_id?: string;
  from?: string;
  to?: string;
};

export default function AuditLog() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>(() => ({
    actor_email: searchParams.get("actor_email") || "",
    target_type: searchParams.get("target_type") || "",
    target_id: searchParams.get("target_id") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
  }));

  const PAGE_SIZE = 50;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String((page - 1) * PAGE_SIZE));
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.set(k, v);
        });
        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.error) throw new Error(json.error);
          setRows(json.data ?? []);
          setTotal(json.count ?? 0);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Audit log load failed:", e);
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, filters]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const targetTypeOptions = AUDIT_TARGET_TYPES;

  const roleBadges: Record<string, string> = {
    super_admin: "role-super",
    fixtures: "role-fixtures",
    content: "role-content",
  };

  return (
    <section className={styles.container} aria-label="Audit log entries">
      <form onSubmit={handleFilterSubmit} className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="actor_email">Admin</label>
          <input
            id="actor_email"
            type="email"
            placeholder="admin@club.org"
            value={filters.actor_email}
            onChange={(e) => handleFilterChange("actor_email", e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="target_type">Target type</label>
          <select
            id="target_type"
            value={filters.target_type}
            onChange={(e) => handleFilterChange("target_type", e.target.value)}
          >
            <option value="">All</option>
            {targetTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="target_id">Target ID</label>
          <input
            id="target_id"
            type="text"
            placeholder="fixture UUID, article slug, user email..."
            value={filters.target_id}
            onChange={(e) => handleFilterChange("target_id", e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="from">From</label>
          <input
            id="from"
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange("from", e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="to">To</label>
          <input
            id="to"
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange("to", e.target.value)}
          />
        </div>
        <button type="submit" className={styles.filterSubmit}>
          <Filter className={styles.filterIcon} />
          Apply
        </button>
      </form>

      {loading ? (
        <div className={styles.loading}><Loader2 className={styles.spinner} /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>No audit entries match your filters.</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Role</th>
                  <th>Target</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.colTime}>
                      <time dateTime={r.created_at}>
                        {new Date(r.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </td>
                    <td className={styles.colActor}>{r.actor_email}</td>
                    <td>
                      <span className={`${styles.badge} ${roleBadges[r.actor_role] ?? ""}`}>
                        {r.actor_role}
                      </span>
                    </td>
                    <td className={styles.colTarget}>
                      <code>{r.target_type}</code>
                      <br />
                      <span className={styles.targetId}>{r.target_id}</span>
                    </td>
                    <td className={styles.colAction}>{r.action}</td>
                    <td className={styles.colDetails}>
                      {r.details && (
                        <details>
                          <summary>View</summary>
                          <pre>{JSON.stringify(r.details, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE && (
            <nav className={styles.pagination} aria-label="Audit log pagination">
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft />
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {Math.ceil(total / PAGE_SIZE)} ({total} total)
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))}
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
              >
                <ChevronRight />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}