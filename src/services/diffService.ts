export interface DiffPart {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

export interface DiffStats {
  addedWords: number;
  removedWords: number;
  netWordDelta: number;
}

/**
 * Computes a word-level Longest Common Subsequence (LCS) diff between two texts.
 */
export function computeWordDiff(oldText: string, newText: string): DiffPart[] {
  if (!oldText && !newText) return [];
  if (!oldText) return [{ type: 'added', text: newText }];
  if (!newText) return [{ type: 'removed', text: oldText }];
  if (oldText === newText) return [{ type: 'equal', text: oldText }];

  // Tokenize words and whitespace delimiters
  const oldTokens = oldText.split(/(\s+)/);
  const newTokens = newText.split(/(\s+)/);

  // Safety cap: if tokens exceed 2,500, fallback to line-level diff to prevent O(M*N) memory spikes
  if (oldTokens.length > 2500 || newTokens.length > 2500) {
    return [
      { type: 'removed', text: oldText },
      { type: 'added', text: newText }
    ];
  }

  const m = oldTokens.length;
  const n = newTokens.length;

  // Build DP table (flat Int16Array for performance)
  const dp: Int16Array[] = new Array(m + 1);
  for (let i = 0; i <= m; i++) {
    dp[i] = new Int16Array(n + 1);
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldTokens[i] === newTokens[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack
  let i = m;
  let j = n;
  const parts: DiffPart[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      parts.unshift({ type: 'equal', text: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      parts.unshift({ type: 'added', text: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      parts.unshift({ type: 'removed', text: oldTokens[i - 1] });
      i--;
    }
  }

  // Coalesce adjacent parts of identical type
  const coalesced: DiffPart[] = [];
  for (const part of parts) {
    if (!part.text) continue;
    const last = coalesced[coalesced.length - 1];
    if (last && last.type === part.type) {
      last.text += part.text;
    } else {
      coalesced.push({ ...part });
    }
  }

  return coalesced;
}

/**
 * Formats diff parts into clean HTML with <ins> and <del> tags for Word preview.
 */
export function renderDiffToHtml(diffParts: DiffPart[]): string {
  let html = '';
  for (const part of diffParts) {
    const escaped = escapeHtml(part.text);
    if (part.type === 'equal') {
      html += escaped;
    } else if (part.type === 'removed') {
      html += `<del class="diff-removed">${escaped}</del>`;
    } else if (part.type === 'added') {
      html += `<ins class="diff-added">${escaped}</ins>`;
    }
  }
  return html;
}

/**
 * Calculates net word stats from diff parts.
 */
export function calculateDiffStats(diffParts: DiffPart[]): DiffStats {
  let addedWords = 0;
  let removedWords = 0;

  for (const part of diffParts) {
    const words = (part.text.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;
    if (part.type === 'added') addedWords += words;
    if (part.type === 'removed') removedWords += words;
  }

  return {
    addedWords,
    removedWords,
    netWordDelta: addedWords - removedWords
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
