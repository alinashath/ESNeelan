/** Collapse whitespace and trim; strip simple HTML-like tags for OG / share snippets. */
export function plainTextSnippet(raw: string, maxLen: number): string {
  const stripped = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= maxLen) return stripped;
  return `${stripped.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
