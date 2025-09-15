#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import minimist from 'minimist';
import OpenAI from 'openai';
import { CONFIG, LANGUAGE_PROMPTS, getOpenAIKey, getYotoIconIdsFile } from './config';
import { PlanOptions, VisionResult, YotoIconMapping, Language, YotoSynonyms } from './types';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processIconWithVision(
  openai: OpenAI,
  iconId: string,
  language: Language
): Promise<VisionResult> {
  try {
    const iconUrl = `${CONFIG.YOTO_ICON_URL}/${iconId}`;
    const prompt = LANGUAGE_PROMPTS[language];

    console.log(`Processing icon ${iconId}...`);

    const response = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: iconUrl }
            }
          ]
        }
      ],
      max_tokens: 10
    });

    const keyword = response.choices[0]?.message?.content?.trim().toLowerCase();

    if (!keyword) {
      throw new Error('No keyword returned from Vision API');
    }

    // RTL support: ensure proper display direction
    const displayKeyword = language === 'hebrew' ? `\u202B${keyword}\u202C` : keyword;
    console.log(`  → ${displayKeyword}`);

    return {
      iconId,
      keyword,
      success: true
    };
  } catch (error) {
    console.error(`  ✗ Error processing ${iconId}:`, error);
    return {
      iconId,
      keyword: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function loadIconIds(): Promise<string[]> {
  const filePath = path.resolve(CONFIG.ICON_IDS_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').filter(line => line.trim());
}

async function loadExistingMappings(language: Language): Promise<YotoIconMapping> {
  try {
    const filePath = path.resolve(getYotoIconIdsFile(language));
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.log('No existing mappings found, starting fresh...');
    return {};
  }
}

async function loadSynonyms(): Promise<YotoSynonyms> {
  try {
    const filePath = path.resolve(CONFIG.YOTO_ICONS_FILE);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Could not load synonyms file:', error);
    return {};
  }
}

async function saveMappings(mappings: YotoIconMapping, language: Language): Promise<void> {
  const filePath = path.resolve(getYotoIconIdsFile(language));
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(mappings, null, 2), 'utf-8');
  console.log(`\nSaved mappings to ${filePath}`);
}

async function runPlanMode(options: PlanOptions): Promise<void> {
  const openai = new OpenAI({ apiKey: getOpenAIKey() });

  console.log(`🔍 Plan Mode - Language: ${options.language}`);
  console.log('Loading icon IDs...');

  const iconIds = await loadIconIds();
  const existingMappings = await loadExistingMappings(options.language);
  const synonyms = await loadSynonyms();

  console.log(`Found ${iconIds.length} icon IDs`);
  console.log(`Existing mappings: ${Object.keys(existingMappings).length}`);
  console.log(`Available synonym categories: ${Object.keys(synonyms).length}`);

  const startIndex = options.startFrom || 0;
  const batchSize = options.batchSize || CONFIG.DEFAULT_BATCH_SIZE;

  let processedCount = 0;
  let successCount = 0;

  console.log(`\nStarting from index ${startIndex}, batch size: ${batchSize}\n`);

  for (let i = startIndex; i < iconIds.length; i += batchSize) {
    const batch = iconIds.slice(i, Math.min(i + batchSize, iconIds.length));
    const batchResults: VisionResult[] = [];

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} icons)...`);

    for (const iconId of batch) {
      const result = await processIconWithVision(openai, iconId, options.language);
      batchResults.push(result);

      if (result.success) {
        successCount++;
        existingMappings[result.keyword] = `yoto:#${result.iconId}`;

        // Show synonyms if available
        const keywordSynonyms = synonyms[result.keyword];
        if (keywordSynonyms && keywordSynonyms.length > 0) {
          const displaySynonyms = keywordSynonyms.map(syn =>
            options.language === 'hebrew' && /[\u0590-\u05FF]/.test(syn)
              ? `\u202B${syn}\u202C`
              : syn
          );
          console.log(`    📝 Synonyms: ${displaySynonyms.join(', ')}`);
        }
      }

      processedCount++;

      // Rate limiting
      await sleep(CONFIG.VISION_DELAY_MS);
    }

    // Save progress after each batch
    await saveMappings(existingMappings, options.language);

    console.log(`Batch completed. Progress: ${processedCount}/${iconIds.length} (${successCount} successful)\n`);
  }

  console.log('🎉 Plan Mode completed!');
  console.log(`Total processed: ${processedCount}`);
  console.log(`Successful mappings: ${successCount}`);
  console.log(`Failed: ${processedCount - successCount}`);
}

function parseArgs(): PlanOptions {
  const args = minimist(process.argv.slice(2));

  if (!args.bearer) {
    console.error('❌ --bearer token is required');
    process.exit(1);
  }

  const language = (args.language || 'english') as Language;
  if (!['english', 'hebrew'].includes(language)) {
    console.error('❌ --language must be "english" or "hebrew"');
    process.exit(1);
  }

  return {
    bearer: args.bearer,
    language,
    startFrom: args.startFrom ? parseInt(args.startFrom) : undefined,
    batchSize: args.batchSize ? parseInt(args.batchSize) : undefined
  };
}

function showUsage(): void {
  console.log(`
Usage: ts-node src/plan.ts --bearer <TOKEN> [options]

Required:
  --bearer <TOKEN>        Yoto bearer token

Options:
  --language <LANG>       Language for keywords: "english" or "hebrew" (default: english)
  --startFrom <INDEX>     Resume from specific icon index (default: 0)
  --batchSize <SIZE>      Process icons in batches (default: ${CONFIG.DEFAULT_BATCH_SIZE})

Examples:
  ts-node src/plan.ts --bearer $BEARER --language english
  ts-node src/plan.ts --bearer $BEARER --language hebrew --startFrom 100
  ts-node src/plan.ts --bearer $BEARER --batchSize 5
`);
}

async function main(): Promise<void> {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showUsage();
      process.exit(0);
    }

    const options = parseArgs();
    await runPlanMode(options);
  } catch (error) {
    console.error('❌ Plan mode failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}