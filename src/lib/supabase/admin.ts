/**
 * Re-exported from lib/admin/roles so there is a single getAdminContext.
 *
 * The role-aware version lives in lib/admin/roles.ts; this module is kept as an
 * import path for existing call sites so they pick up the same implementation
 * rather than maintaining two.
 */
export { getAdminContext } from "@/lib/admin/roles";
