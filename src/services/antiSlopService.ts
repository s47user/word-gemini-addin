export interface ReadabilityMetrics {
  words: number;
  sentences: number;
  fleschReadingEase: number;
  fkGradeLevel: number;
  burstiness: number;
  slopWords: string[];
  easeLabel: string;
  gradeLabel: string;
}

export const BANNED_SLOP_WORDS = [
  'delve',
  'tapestry',
  'beacon',
  'testament',
  'pivotal',
  'foster',
  'holistic',
  'game-changer',
  'unleash',
  'streamline',
  'seamless',
  'seamlessly',
  'not merely',
  'utilize',
  'utilization',
  'facilitate',
  'in order to',
  'prior to',
  'due to the fact that',
  'subsequently',
  'aforementioned'
];

/**
 * Counts syllables in an English word using phonetic heuristic rules.
 */
export function countSyllables(word: string): number {
  const cleanWord = word.toLowerCase().trim().replace(/[^a-z]/g, '');
  if (!cleanWord) return 0;
  if (cleanWord.length <= 3) return 1;

  // Strip common silent endings
  let w = cleanWord.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  w = w.replace(/^y/, '');

  const matches = w.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Analyzes text for readability, sentence cadence (burstiness), and presence of AI slop.
 */
export function analyzeReadability(text: string): ReadabilityMetrics {
  if (!text || text.trim() === '') {
    return {
      words: 0,
      sentences: 0,
      fleschReadingEase: 100,
      fkGradeLevel: 0,
      burstiness: 0,
      slopWords: [],
      easeLabel: 'Ready',
      gradeLabel: 'N/A'
    };
  }

  // Sentences split on terminal punctuation (. ! ?)
  const rawSentences = text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const totalSentences = Math.max(1, rawSentences.length);

  // Words split on boundary
  const words = text.match(/\b[A-Za-z0-9'-]+\b/g) || [];
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      words: 0,
      sentences: 0,
      fleschReadingEase: 100,
      fkGradeLevel: 0,
      burstiness: 0,
      slopWords: [],
      easeLabel: 'Ready',
      gradeLabel: 'N/A'
    };
  }

  // Syllables
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  const wordsPerSentence = totalWords / totalSentences;
  const syllablesPerWord = totalSyllables / totalWords;

  // Flesch Reading Ease = 206.835 - (1.015 * ASL) - (84.6 * ASW)
  const rawEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fleschReadingEase = Math.round(Math.max(0, Math.min(100, rawEase)) * 10) / 10;

  // Flesch-Kincaid Grade Level = (0.39 * ASL) + (11.8 * ASW) - 15.59
  const rawGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const fkGradeLevel = Math.round(Math.max(0, rawGrade) * 10) / 10;

  // Sentence burstiness (standard deviation of words per sentence)
  const sentenceWordCounts = rawSentences.map(
    s => (s.match(/\b[A-Za-z0-9'-]+\b/g) || []).length
  );
  let burstiness = 0;
  if (sentenceWordCounts.length > 1) {
    const mean = wordsPerSentence;
    const variance =
      sentenceWordCounts.reduce((acc, count) => acc + Math.pow(count - mean, 2), 0) /
      sentenceWordCounts.length;
    burstiness = Math.round(Math.sqrt(variance) * 10) / 10;
  }

  // Scan for banned AI slop words
  const detectedSlop: string[] = [];
  const lowerText = text.toLowerCase();
  for (const slop of BANNED_SLOP_WORDS) {
    const pattern = new RegExp(`\\b${slop.replace('-', '\\-')}\\b`, 'i');
    if (pattern.test(lowerText)) {
      detectedSlop.push(slop);
    }
  }

  // Ease description
  let easeLabel = 'Standard';
  if (fleschReadingEase >= 80) easeLabel = 'Easy / Plain English';
  else if (fleschReadingEase >= 60) easeLabel = 'Standard';
  else if (fleschReadingEase >= 40) easeLabel = 'Fairly Dense';
  else easeLabel = 'Dense / Academic';

  // Grade description
  let gradeLabel = `Grade ${fkGradeLevel}`;
  if (fkGradeLevel <= 6) gradeLabel += ' (Accessible)';
  else if (fkGradeLevel <= 8) gradeLabel += ' (Plain English)';
  else if (fkGradeLevel <= 12) gradeLabel += ' (High School)';
  else gradeLabel += ' (College / Postgrad)';

  return {
    words: totalWords,
    sentences: totalSentences,
    fleschReadingEase,
    fkGradeLevel,
    burstiness,
    slopWords: [...new Set(detectedSlop)],
    easeLabel,
    gradeLabel
  };
}

export interface WritingModeConfig {
  id: string;
  name: string;
  badge: string;
  description: string;
  systemInstruction: string;
}

export const WRITING_MODES: Record<string, WritingModeConfig> = {
  plain_english: {
    id: 'plain_english',
    name: 'Plain English',
    badge: 'Grade 6-8',
    description: 'De-bloats text, active voice, dynamic rhythm, protects citations.',
    systemInstruction:
      "You are an expert Plain English editor. Rewrite the text into clear, readable, authentic Plain English targeting Flesch-Kincaid Grade 6-8 and Flesch Reading Ease >= 65.\n" +
      "Rules:\n" +
      "1. Eradicate zombie nominalizations (e.g. change 'utilization' to 'use', 'facilitation' to 'help', 'demonstration' to 'show').\n" +
      "2. Use active voice with subject-first syntax.\n" +
      "3. Vary sentence length dynamically (mix short 4-7 word punchy sentences with medium 12-16 word explanatory sentences; burstiness stddev >= 5.0).\n" +
      "4. Eliminate filler and academic bloat ('in order to' -> 'to', 'due to the fact that' -> 'because', 'prior to' -> 'before').\n" +
      "5. Strictly preserve all academic citations (e.g., '(Smith et al., 2021)', '[1, 2]'), mathematical equations, and essential domain nouns."
  },
  academic_zero_slop: {
    id: 'academic_zero_slop',
    name: 'Academic Defense',
    badge: 'Zero Slop',
    description: 'Empirical rigor, bans all AI cliches, preserves IEEE citations.',
    systemInstruction:
      "You are a rigorous academic and engineering editor adhering to strict zero-slop guidelines.\n" +
      "Rules:\n" +
      "1. Never use hollow, clichéd AI words: 'delve', 'tapestry', 'beacon', 'testament', 'pivotal', 'foster', 'holistic', 'game-changer', or parallel constructions like 'not merely X, but Y'.\n" +
      "2. State concrete technical facts, mathematical proofs, or empirical results with zero inflated puffery.\n" +
      "3. Strictly protect all IEEE citations, authors, DOIs, formulas, and balance invariants.\n" +
      "4. Maintain scholarly precision and formal tone without bureaucratic bloat."
  },
  executive_concise: {
    id: 'executive_concise',
    name: 'Executive Concise',
    badge: 'Cut 50%',
    description: '50% word reduction, front-loaded verbs, direct action.',
    systemInstruction:
      "You are an executive editor. Apply the 50% Rule: cut at least half of the words while retaining all critical substance.\n" +
      "Rules:\n" +
      "1. Front-load action verbs.\n" +
      "2. Eliminate passive voice and corporate buzzwords ('streamline', 'unleash', 'seamless').\n" +
      "3. Be direct, confident, and blameless."
  },
  fluency: {
    id: 'fluency',
    name: 'Fluency & Polish',
    badge: 'Clean Flow',
    description: 'Fixes mechanics and flow while preserving author authentic voice.',
    systemInstruction:
      "You are a native copyeditor. Polish the text for grammar, punctuation, and smooth sentence flow while strictly preserving the author's original vocabulary, meaning, and authentic voice."
  },
  expand: {
    id: 'expand',
    name: 'Expand & Elaborate',
    badge: 'Substantive',
    description: 'Adds substantive technical depth and examples without fluff.',
    systemInstruction:
      "You are a substantive researcher. Expand upon the key ideas with concrete, technical depth, realistic examples, and structured elaboration without adding fluff, repetition, or buzzwords."
  }
};
