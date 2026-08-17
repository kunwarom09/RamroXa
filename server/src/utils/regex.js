/**
 * Escape regular expression special characters to prevent ReDoS and regex injection.
 * @param {string} string - Raw user input string
 * @returns {string} - Escaped string safe for RegExp constructor or Mongo $regex
 */
export function escapeRegex(string) {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default { escapeRegex };
