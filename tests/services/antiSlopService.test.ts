import { describe, it, expect } from 'vitest';
import {
  analyzeReadability,
  countSyllables,
  WRITING_MODES
} from '../../src/services/antiSlopService';

describe('Anti-Slop & Readability Service', () => {
  it('correctly counts syllables using phonetic heuristics', () => {
    expect(countSyllables('the')).toBe(1);
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('method')).toBe(2);
    expect(countSyllables('analytics')).toBe(4);
    expect(countSyllables('utilization')).toBe(5);
  });

  it('detects banned AI slop words accurately', () => {
    const slopText = 'This framework serves as a testament to our holistic methodology. We delve into cutting-edge paradigms.';
    const metrics = analyzeReadability(slopText);

    expect(metrics.slopWords).toContain('testament');
    expect(metrics.slopWords).toContain('holistic');
    expect(metrics.slopWords).toContain('delve');
    expect(metrics.words).toBeGreaterThan(10);
  });

  it('calculates Flesch Reading Ease and Flesch-Kincaid Grade Level', () => {
    // Simple, clean English sentence
    const cleanText = 'The dog ran home. He sat on the rug. The boy smiled.';
    const metrics = analyzeReadability(cleanText);

    expect(metrics.fleschReadingEase).toBeGreaterThan(80);
    expect(metrics.fkGradeLevel).toBeLessThan(6);
    expect(metrics.slopWords.length).toBe(0);
    expect(metrics.easeLabel).toBe('Easy / Plain English');
  });

  it('calculates sentence burstiness (cadence standard deviation)', () => {
    // Monotonous AI rhythm: all sentences identical length (5 words each)
    const monotone = 'We like to write code. We like to build apps. We like to test tools.';
    const monotoneMetrics = analyzeReadability(monotone);
    expect(monotoneMetrics.burstiness).toBe(0);

    // Dynamic human cadence: 3 words, 14 words, 4 words
    const dynamic = 'Tests passed today. When the server rebooted under heavy memory load, all database connections recovered without errors. Good job team.';
    const dynamicMetrics = analyzeReadability(dynamic);
    expect(dynamicMetrics.burstiness).toBeGreaterThan(4);
  });

  it('provides all 5 core writing mode configurations with anti-slop rules', () => {
    expect(WRITING_MODES.plain_english).toBeDefined();
    expect(WRITING_MODES.academic_zero_slop).toBeDefined();
    expect(WRITING_MODES.executive_concise).toBeDefined();
    expect(WRITING_MODES.fluency).toBeDefined();
    expect(WRITING_MODES.expand).toBeDefined();

    expect(WRITING_MODES.plain_english.systemInstruction).toContain('Plain English');
    expect(WRITING_MODES.plain_english.systemInstruction).toContain('Flesch-Kincaid');
    expect(WRITING_MODES.academic_zero_slop.systemInstruction).toContain('delve');
    expect(WRITING_MODES.academic_zero_slop.systemInstruction).toContain('IEEE citations');
  });

  it('handles empty or blank text gracefully', () => {
    const emptyMetrics = analyzeReadability('');
    expect(emptyMetrics.words).toBe(0);
    expect(emptyMetrics.sentences).toBe(0);
    expect(emptyMetrics.slopWords).toEqual([]);
  });
});
