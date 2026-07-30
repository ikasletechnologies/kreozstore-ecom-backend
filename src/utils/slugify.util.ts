/** Lowercase, hyphenated, ASCII-safe slug — shared by every catalog domain that derives a
 * slug from a display name (categories, brands; products in Phase 4). */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics after NFKD decomposition
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
