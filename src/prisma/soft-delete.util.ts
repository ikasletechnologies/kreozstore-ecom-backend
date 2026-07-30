/**
 * Soft-delete convention helpers (see docs/04-DATABASE-DESIGN.md §1). Every table carries a
 * nullable `deletedAt`; repositories default every read to "active rows only" by merging
 * `deletedAt: null` into the where-clause, and opt into trashed rows explicitly via
 * `withTrashed` — never the other way around, so forgetting the helper fails closed
 * (over-filtering) rather than open (leaking soft-deleted rows).
 *
 * Usage in a repository:
 *   this.prisma.product.findMany({ where: notDeleted({ categoryId }) })
 *   this.prisma.product.findMany({ where: withTrashed({ categoryId }) }) // admin recycle bin
 */
export function notDeleted<W extends Record<string, unknown>>(
  where: W = {} as W,
): W & { deletedAt: null } {
  return { ...where, deletedAt: null };
}

export function withTrashed<W extends Record<string, unknown>>(
  where: W = {} as W,
): W {
  return where;
}
