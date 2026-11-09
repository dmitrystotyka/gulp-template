/** Theme folder / text domain from the package name: "@scope/My Site" → "my-site". */
export const themeSlug = (name) =>
  name
    .replace(/^@[^/]+\//, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'theme';
