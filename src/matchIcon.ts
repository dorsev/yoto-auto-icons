import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { CONFIG, getOpenAIKey, getYotoIconIdsFile, formatTextForDisplay } from './config';
import { YotoSynonyms, YotoIconMapping } from './types';

let synonymsCache: YotoSynonyms | null = null;
let iconMappingsCache: YotoIconMapping | null = null;

function loadSynonyms(language: 'english' | 'hebrew' = 'english'): YotoSynonyms {
  if (synonymsCache) return synonymsCache;

  try {
    const filePath = language === 'hebrew'
      ? path.resolve('./yoto_icons_hebrew.json')
      : path.resolve(CONFIG.YOTO_ICONS_FILE);
    const content = fs.readFileSync(filePath, 'utf-8');
    synonymsCache = JSON.parse(content);
    console.log(`📚 Loaded ${Object.keys(synonymsCache!).length} keyword categories`);
    return synonymsCache!;
  } catch (error) {
    console.warn('⚠️  Could not load synonyms file:', error);
    synonymsCache = {};
    return synonymsCache;
  }
}

export function loadIconMappings(language: 'english' | 'hebrew' = 'english'): YotoIconMapping {
  try {
    const filePath = path.resolve(getYotoIconIdsFile(language));
    const content = fs.readFileSync(filePath, 'utf-8');
    iconMappingsCache = JSON.parse(content);
    const langDisplay = language === 'english' ? 'english' : formatTextForDisplay('עברית', language);
    console.log(`🎨 Loaded ${Object.keys(iconMappingsCache!).length} ${langDisplay} icon mappings`);
    return iconMappingsCache!;
  } catch (error) {
    const langDisplay = language === 'english' ? 'english' : formatTextForDisplay('עברית', language);
    console.warn(`⚠️  Could not load ${langDisplay} icon mappings file. Run plan mode first:`, error);
    iconMappingsCache = {};
    return iconMappingsCache;
  }
}

export function reloadMappings(): YotoIconMapping {
  iconMappingsCache = null;
  return loadIconMappings();
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation and special characters
    .replace(/[^\w\s\u0590-\u05FF]/g, ' ') // Keep Hebrew characters
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHebrewPrefixes(word: string): string[] {
  // Just handle the most common cases: "the" (ה) and "and" (ו)
  const variations = [word];

  if (word.startsWith('ה') && word.length > 2) {
    variations.push(word.substring(1)); // הציפור → ציפור
  }
  if (word.startsWith('ו') && word.length > 2) {
    variations.push(word.substring(1)); // והדב → הדב
  }
  if (word.startsWith('וה') && word.length > 3) {
    variations.push(word.substring(2)); // והדב → דב
  }

  return variations;
}

function normalizeHebrewSpelling(text: string): string[] {
  return [text]; // Simple implementation - just return the original text
}

function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(word => word.length > 1);

  // Generate variations for Hebrew words (including prefix stripping)
  const allVariations = [];
  for (const word of words) {
    if (/[\u0590-\u05FF]/.test(word)) { // Contains Hebrew characters
      // Add original word
      allVariations.push(word);
      // Add prefix-stripped variations
      allVariations.push(...stripHebrewPrefixes(word));
      // Add spelling variations
      allVariations.push(...normalizeHebrewSpelling(word));
    } else {
      allVariations.push(word);
    }
  }

  // Return full text, individual words, and all variations
  return [normalized, ...words, ...allVariations];
}

function findBestKeywordMatch(searchTerms: string[], synonyms: YotoSynonyms): string | null {
  let bestMatch: string | null = null;
  let bestScore = 0;

  // Check each keyword category
  for (const [keyword, synonymList] of Object.entries(synonyms)) {
    const allTerms = [keyword, ...synonymList];

    for (const searchTerm of searchTerms) {
      for (const term of allTerms) {
        const normalizedTerm = normalizeText(term);

        // Exact match (highest priority)
        if (normalizedTerm === searchTerm) {
          return keyword;
        }

        // For Hebrew terms, also check spelling variations
        if (/[\u0590-\u05FF]/.test(term)) {
          const termVariations = normalizeHebrewSpelling(normalizedTerm);
          for (const variation of termVariations) {
            if (variation === searchTerm) {
              return keyword; // Exact match with spelling variation
            }
          }
        }

        // Contains match
        if (normalizedTerm.includes(searchTerm) || searchTerm.includes(normalizedTerm)) {
          const score = Math.max(normalizedTerm.length, searchTerm.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = keyword;
          }
        }
      }
    }
  }

  return bestMatch;
}

export function matchIcon(trackTitle: string, language: 'english' | 'hebrew' = 'english'): {
  keyword: string | null;
  iconId: string | null;
  confidence: 'exact' | 'partial' | 'none';
  searchTerms: string[];
} {
  const synonyms = loadSynonyms(language);
  const iconMappings = loadIconMappings(language);

  const searchTerms = extractKeywords(trackTitle);
  const keyword = findBestKeywordMatch(searchTerms, synonyms);

  if (!keyword) {
    return {
      keyword: null,
      iconId: null,
      confidence: 'none',
      searchTerms
    };
  }

  const iconId = iconMappings[keyword] || null;
  const confidence = searchTerms.includes(normalizeText(keyword)) ? 'exact' : 'partial';

  return {
    keyword,
    iconId,
    confidence,
    searchTerms
  };
}

export function getAvailableKeywords(language: 'english' | 'hebrew' = 'english'): string[] {
  const synonyms = loadSynonyms(language);
  return Object.keys(synonyms);
}

export function getIconMappingStats(language: 'english' | 'hebrew' = 'english'): {
  totalKeywords: number;
  mappedKeywords: number;
  unmappedKeywords: string[];
} {
  const synonyms = loadSynonyms(language);
  const iconMappings = loadIconMappings(language);

  const totalKeywords = Object.keys(synonyms).length;
  const mappedKeywords = Object.keys(iconMappings).length;
  const unmappedKeywords = Object.keys(synonyms).filter(
    keyword => !iconMappings[keyword]
  );

  return {
    totalKeywords,
    mappedKeywords,
    unmappedKeywords
  };
}

export function suggestMatches(trackTitle: string, limit: number = 3, language: 'english' | 'hebrew' = 'english'): Array<{
  keyword: string;
  iconId: string | null;
  relevance: number;
}> {
  const synonyms = loadSynonyms(language);
  const iconMappings = loadIconMappings(language);

  const searchTerms = extractKeywords(trackTitle);
  const suggestions: Array<{ keyword: string; iconId: string | null; relevance: number }> = [];

  for (const [keyword, synonymList] of Object.entries(synonyms)) {
    const allTerms = [keyword, ...synonymList];
    let maxRelevance = 0;

    for (const searchTerm of searchTerms) {
      for (const term of allTerms) {
        const normalizedTerm = normalizeText(term);

        if (normalizedTerm.includes(searchTerm) || searchTerm.includes(normalizedTerm)) {
          const relevance = (Math.min(normalizedTerm.length, searchTerm.length) /
                          Math.max(normalizedTerm.length, searchTerm.length)) * 100;
          maxRelevance = Math.max(maxRelevance, relevance);
        }
      }
    }

    if (maxRelevance > 0) {
      suggestions.push({
        keyword,
        iconId: iconMappings[keyword] || null,
        relevance: maxRelevance
      });
    }
  }

  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

export async function aiMatchKeyword(
  trackTitle: string,
  availableKeywords: string[]
): Promise<{ keyword: string | null; confidence: number }> {
  try {
    const openai = new OpenAI({ apiKey: getOpenAIKey() });

    const keywordList = availableKeywords.slice(0, 100).join(', '); // Increase limit to catch more matches

    const prompt = `Given the track title "${trackTitle}", find the most relevant keyword from this list: ${keywordList}

Return ONLY the exact keyword from the list, or "none" if no good match exists.
Consider semantic meaning, not just exact word matching.

Examples:
- "The Lion King" → lion
- "Goodnight Moon" → moon
- "Chocolate Cake Recipe" → chocolate
- "Advanced Calculus" → none

Track title: "${trackTitle}"
Best match:`;

    const response = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0.1
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();

    if (!result || result === 'none') {
      return { keyword: null, confidence: 0 };
    }

    // Verify the result is actually in our keyword list
    if (availableKeywords.includes(result)) {
      // Calculate confidence based on usage costs vs regular matching
      const confidence = 75; // AI match confidence
      return { keyword: result, confidence };
    }

    return { keyword: null, confidence: 0 };
  } catch (error) {
    console.warn('⚠️  AI matching failed:', error);
    return { keyword: null, confidence: 0 };
  }
}