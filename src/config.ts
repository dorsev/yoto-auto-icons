import { LanguagePrompts } from './types';

export const CONFIG = {
  // File paths
  ICON_IDS_FILE: './icon_ids.txt',
  YOTO_ICONS_FILE: './synonyms/english.json',

  // API endpoints
  YOTO_ICON_URL: 'https://media-secure-v2.api.yotoplay.com/icons',
  YOTO_API_BASE: 'https://api.yotoplay.com',

  // OpenAI
  OPENAI_MODEL: 'gpt-4o-mini',

  // Rate limiting
  VISION_DELAY_MS: 200, // Delay between Vision API calls
  YOTO_DELAY_MS: 100,   // Delay between Yoto API calls

  // Processing
  DEFAULT_BATCH_SIZE: 10,
} as const;

export function getYotoIconIdsFile(language: 'english' | 'hebrew'): string {
  return `./data/yoto_icon_ids_${language}.json`;
}

export const LANGUAGE_PROMPTS: LanguagePrompts = {
  english: "Describe this icon in one short English word (e.g. 'dog', 'moon', 'cake'). Return only the word, no explanation.",
  hebrew: "תאר את האייקון הזה במילה עברית קצרה אחת (לדוגמה: 'כלב', 'ירח', 'עוגה'). החזר רק את המילה, ללא הסבר."
};

export const RTL_LANGUAGES = {
  english: false,
  hebrew: true
} as const;

export function isRtlLanguage(language: 'english' | 'hebrew'): boolean {
  return RTL_LANGUAGES[language];
}

export function formatTextForDisplay(text: string, language: 'english' | 'hebrew', disableRtl: boolean = true): string {
  // Terminal RTL support is poor, so disable by default for better readability
  if (disableRtl) {
    return text;
  }

  // Legacy RTL formatting (if ever needed)
  if (isRtlLanguage(language)) {
    return `\u200F${text}`;
  }

  return text;
}

export function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return key;
}