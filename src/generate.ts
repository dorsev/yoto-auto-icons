#!/usr/bin/env node

import minimist from 'minimist';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { getIconMappingStats } from './matchIcon';

interface GenerateOptions {
  language: 'english' | 'hebrew';
  keywords?: string[];
  limit?: number;
  dryRun: boolean;
}

// Get OpenAI API key from environment
function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return key;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getIconPrompt(keyword: string, language: 'english' | 'hebrew'): string {
  // Convert Hebrew keywords to English concepts for better AI generation
  const hebrewToEnglish: { [key: string]: string } = {
    'בלון': 'red balloon',
    'טרקטור': 'tractor',
    'חברים': 'friends group',
    'סבתא': 'grandmother',
    'הר': 'mountain',
    'אופניים': 'bicycle',
    'רחפן': 'helicopter',
    'ורד': 'rose flower',
    'יד': 'hand pointing',
    'מרים משקולות': 'weightlifting'
  };

  const englishConcept = language === 'hebrew' && hebrewToEnglish[keyword] ?
    hebrewToEnglish[keyword] : keyword;

  return `Simple flat design icon of ${englishConcept}, 16x16 pixel style, minimal, clean lines, transparent background, high contrast, suitable for children's content, vector style, no text, no shadows`;
}



async function generateIconWithDALLE(keyword: string, language: 'english' | 'hebrew'): Promise<Buffer | null> {
  try {
    const prompt = getIconPrompt(keyword, language);
    console.log(`🎨 Generating "${keyword}" with DALL-E...`);

    const openai = new OpenAI({ apiKey: getOpenAIKey() });

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    // Download the image
    console.log(`  📥 Downloading generated image...`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log(`  ✓ Generated image (${Math.round(buffer.length / 1024)}KB)`);
    return buffer;

  } catch (error) {
    console.error(`  ✗ Failed to generate "${keyword}":`, error);
    return null;
  }
}



async function generateMissingIcons(options: GenerateOptions): Promise<void> {
  console.log(`🚀 Generate Mode - Language: ${options.language}`);
  if (options.dryRun) {
    console.log(`🧪 DRY RUN MODE - No actual generation`);
  }
  console.log('='.repeat(50));

  // Get missing keywords
  let keywordsToGenerate: string[];
  if (options.keywords && options.keywords.length > 0) {
    keywordsToGenerate = options.keywords;
  } else {
    const stats = getIconMappingStats(options.language);
    keywordsToGenerate = stats.unmappedKeywords;

    if (options.limit) {
      keywordsToGenerate = keywordsToGenerate.slice(0, options.limit);
    }
  }

  if (keywordsToGenerate.length === 0) {
    console.log('✅ No missing icons to generate!');
    return;
  }

  console.log(`🎨 Will generate ${keywordsToGenerate.length} icons:`);
  keywordsToGenerate.forEach((keyword, i) => {
    console.log(`  ${i + 1}. ${keyword}`);
  });

  if (options.dryRun) {
    console.log(`\n🧪 DRY RUN - Would generate ${keywordsToGenerate.length} icons`);
    return;
  }

  console.log('\n🏁 Starting generation...');

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < keywordsToGenerate.length; i++) {
    const keyword = keywordsToGenerate[i];
    console.log(`\n[${i + 1}/${keywordsToGenerate.length}] Processing "${keyword}"`);

    try {
      // Generate image with DALL-E
      const imageBuffer = await generateIconWithDALLE(keyword, options.language);
      if (!imageBuffer) {
        failed++;
        continue;
      }

      // Save generated icon to disk for manual upload
      console.log(`  💾 Saving generated icon to disk for manual upload`);

      // Ensure generated-icons directory exists
      const generatedDir = 'generated-icons';
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir);
      }

      const filename = `generated_${keyword.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')}.png`;
      const fullPath = path.join(generatedDir, filename);
      fs.writeFileSync(fullPath, imageBuffer);
      console.log(`  📁 Saved as: ${fullPath}`);
      successful++;

      // Rate limiting for DALL-E API
      if (i < keywordsToGenerate.length - 1) {
        console.log('  ⏳ Waiting 3 seconds...');
        await sleep(3000);
      }

    } catch (error) {
      console.error(`  ✗ Failed to process "${keyword}":`, error);
      failed++;
    }
  }

  // Summary
  console.log(`\n📊 Generation Complete:`);
  console.log(`  ✅ Successful: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (successful > 0) {
    console.log(`\n🎉 ${successful} new icons created!`);
    console.log(`📁 Icons saved to generated-icons/ directory`);
    console.log(`📝 Manual upload required - see README for instructions`);
  }
}

function parseArgs(): GenerateOptions {
  const args = minimist(process.argv.slice(2));

  const language = (args.language || 'english') as 'english' | 'hebrew';
  if (!['english', 'hebrew'].includes(language)) {
    console.error('❌ --language must be "english" or "hebrew"');
    process.exit(1);
  }

  return {
    language,
    keywords: args.keywords ? args.keywords.split(',') : undefined,
    limit: args.limit ? parseInt(args.limit) : undefined,
    dryRun: args.dry || args['dry-run'] || false
  };
}

function showUsage(): void {
  console.log('Usage: npm run generate -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --language <LANG>       "english" or "hebrew" (default: english)');
  console.log('  --keywords <LIST>       Comma-separated keywords (default: all missing)');
  console.log('  --limit <N>             Limit number to generate');
  console.log('  --dry, --dry-run        Preview only');
  console.log('');
  console.log('Examples:');
  console.log('  npm run generate -- --language hebrew --limit 5');
  console.log('  npm run generate -- --keywords "בלון,טרקטור" --dry');
  console.log('  npm run generate -- --language english --keywords "cat,dog,tree"');
  console.log('');
  console.log('Generated icons are saved to generated-icons/ for manual upload.');
}

async function main(): Promise<void> {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showUsage();
      process.exit(0);
    }

    const options = parseArgs();
    await generateMissingIcons(options);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}