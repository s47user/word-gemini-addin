import { describe, it, expect } from 'vitest';
import {
  computeWordDiff,
  renderDiffToHtml,
  calculateDiffStats
} from '../../src/services/diffService';

describe('Diff Service (QuillBot-Style Word LCS)', () => {
  it('returns empty array when both inputs are empty', () => {
    const diff = computeWordDiff('', '');
    expect(diff).toEqual([]);
  });

  it('detects equal texts accurately', () => {
    const diff = computeWordDiff('Hello world', 'Hello world');
    expect(diff).toEqual([{ type: 'equal', text: 'Hello world' }]);
  });

  it('detects added and removed words in rewrites', () => {
    const oldText = 'The utilization of tools facilitates speed.';
    const newText = 'Our tools help speed.';

    const diff = computeWordDiff(oldText, newText);
    const html = renderDiffToHtml(diff);

    expect(html).toContain('<del class="diff-removed">');
    expect(html).toContain('<ins class="diff-added">');
    expect(html).toContain('utilization');
    expect(html).toContain('help');
  });

  it('computes accurate diff word statistics', () => {
    const oldText = 'The red car was fast and loud.';
    const newText = 'The blue car was fast and loud.';

    const diff = computeWordDiff(oldText, newText);
    const stats = calculateDiffStats(diff);

    expect(stats.addedWords).toBe(1); // 'blue'
    expect(stats.removedWords).toBe(1); // 'red'
    expect(stats.netWordDelta).toBe(0);
  });

  it('escapes dangerous HTML characters in diff output', () => {
    const oldText = '<script>alert(1)</script>';
    const newText = 'safe text';

    const diff = computeWordDiff(oldText, newText);
    const html = renderDiffToHtml(diff);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
