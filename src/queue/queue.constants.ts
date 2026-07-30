/** Queue names — see docs/17-BULLMQ-DESIGN.md §1. `product-import` was added in Phase 4
 * (docs/08-API-DOCUMENTATION.md's `POST /products/import` predates that table and wasn't
 * reflected there at the time — added here to keep the two in sync). */
export const QUEUE_EMAIL = 'email';
export const QUEUE_INVOICE = 'invoice';
export const QUEUE_NOTIFICATION = 'notification';
export const QUEUE_INVENTORY = 'inventory';
export const QUEUE_PRODUCT_IMPORT = 'product-import';

export const ALL_QUEUES = [
  QUEUE_EMAIL,
  QUEUE_INVOICE,
  QUEUE_NOTIFICATION,
  QUEUE_INVENTORY,
  QUEUE_PRODUCT_IMPORT,
] as const;
