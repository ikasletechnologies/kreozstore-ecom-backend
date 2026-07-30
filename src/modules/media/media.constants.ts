// Directory layout + validation rules per docs/12-UPLOAD-SYSTEM.md.

export const UPLOAD_SUBDIRECTORIES = [
  'products',
  'categories',
  'brands',
  'banners',
  'users',
  'blog',
  'invoices',
  'temp',
] as const;

// Domains this admin-facing endpoint accepts uploads for. "invoices" is excluded — invoices
// are generated server-side by a queued job (Phase 6), never client-uploaded. "temp" is
// internal CSV-import staging (Phase 4), not a direct upload target.
export const UPLOADABLE_DOMAINS = [
  'products',
  'categories',
  'brands',
  'banners',
  'users',
  'blog',
] as const;

export type UploadableDomain = (typeof UPLOADABLE_DOMAINS)[number];

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export function isUploadableDomain(value: string): value is UploadableDomain {
  return (UPLOADABLE_DOMAINS as readonly string[]).includes(value);
}
