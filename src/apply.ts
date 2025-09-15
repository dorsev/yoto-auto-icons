#!/usr/bin/env node

import minimist from 'minimist';
import { getPlaylist, updateCardWithIcons, validatePlaylist } from './yoto';
import { matchIcon, getIconMappingStats, suggestMatches, aiMatchKeyword, getAvailableKeywords, loadIconMappings } from './matchIcon';
import { formatTextForDisplay } from './config';
import { ApplyOptions, YotoTrack } from './types';

interface MatchResult {
  track: YotoTrack;
  keyword: string | null;
  iconId: string | null;
  confidence: 'exact' | 'partial' | 'ai' | 'none';
  searchTerms: string[];
}

async function analyzePlaylist(
  bearerToken: string,
  cardId: string,
  language: 'english' | 'hebrew' = 'english',
  useAI: boolean = true
): Promise<{
  matches: MatchResult[];
  stats: {
    total: number;
    exact: number;
    partial: number;
    ai: number;
    none: number;
  };
}> {
  console.log('🎵 Fetching playlist...');
  const playlist = await getPlaylist(bearerToken, cardId);

  console.log('\n🔍 Analyzing tracks for icon matches...\n');

  const matches: MatchResult[] = [];
  const stats = { total: 0, exact: 0, partial: 0, ai: 0, none: 0 };
  const iconMappings = loadIconMappings(language);
  const availableKeywords = getAvailableKeywords(language);

  for (const track of playlist.tracks) {
    const match = matchIcon(track.title, language);

    let result: MatchResult = {
      track,
      keyword: match.keyword,
      iconId: match.iconId,
      confidence: match.confidence,
      searchTerms: match.searchTerms
    };

    // Try AI matching for unmatched tracks, fallback to exact/partial if AI fails
    if (match.confidence === 'none' && useAI && availableKeywords.length > 0) {
      console.log(`🤖 AI matching for "${track.title}"...`);
      const aiMatch = await aiMatchKeyword(track.title, availableKeywords);

      if (aiMatch.keyword && iconMappings[aiMatch.keyword]) {
        // AI found a match with available icon - use it
        result = {
          track,
          keyword: aiMatch.keyword,
          iconId: iconMappings[aiMatch.keyword],
          confidence: 'ai',
          searchTerms: [track.title]
        };
      }
      // If AI fails or returns unmapped keyword, keep the original (none) result
    }

    matches.push(result);
    stats.total++;
    stats[result.confidence]++;

    // Display result
    const confidenceIcon = {
      exact: '✅',
      partial: '🟡',
      ai: '🤖',
      none: '❌'
    }[result.confidence];

    // Apply RTL formatting if needed
    const displayTitle = formatTextForDisplay(track.title, language);
    console.log(`${confidenceIcon} "${displayTitle}"`);

    if (result.keyword && result.iconId) {
      console.log(`    → ${result.keyword} (${result.iconId})`);
    } else if (result.keyword) {
      console.log(`    → ${result.keyword} (no icon mapping available)`);
    } else {
      console.log(`    → No match found`);
      console.log(`    🔍 Search terms extracted: [${result.searchTerms.join(', ')}]`);

      // Show suggestions for unmapped tracks
      const suggestions = suggestMatches(track.title, 3, language);
      if (suggestions.length > 0) {
        console.log(`    💡 Suggestions: ${suggestions.map(s => `${s.keyword} (${s.relevance.toFixed(1)}%)`).join(', ')}`);
      } else {
        console.log(`    💡 No keyword suggestions found`);
      }
    }
    console.log();
  }

  return { matches, stats };
}

function displayStats(stats: { total: number; exact: number; partial: number; ai: number; none: number }): void {
  console.log('\n📊 Match Statistics:');
  console.log(`  Total tracks: ${stats.total}`);
  console.log(`  ✅ Exact matches: ${stats.exact} (${Math.round(stats.exact / stats.total * 100)}%)`);
  console.log(`  🟡 Partial matches: ${stats.partial} (${Math.round(stats.partial / stats.total * 100)}%)`);
  if (stats.ai > 0) {
    console.log(`  🤖 AI matches: ${stats.ai} (${Math.round(stats.ai / stats.total * 100)}%)`);
  }
  console.log(`  ❌ No matches: ${stats.none} (${Math.round(stats.none / stats.total * 100)}%)`);
  const assignable = stats.exact + stats.partial + stats.ai;
  console.log(`  🎯 Assignable: ${assignable} (${Math.round(assignable / stats.total * 100)}%)`);
}

async function runApplyMode(options: ApplyOptions): Promise<void> {
  console.log(`🎯 Apply Mode - Playlist: ${options.playlist}`);
  console.log(`${options.dryRun ? '🧪 DRY RUN MODE - No actual changes will be made' : '🚀 LIVE MODE - Changes will be applied'}`);
  console.log(`🤖 AI MATCHING - Using OpenAI for unmatched tracks`);
  console.log();

  // Validate playlist exists
  const isValid = await validatePlaylist(options.bearer, options.playlist);
  if (!isValid) {
    console.error('❌ Cannot access playlist. Check your bearer token and playlist ID.');
    process.exit(1);
  }

  // Show icon mapping status
  const language = options.language || 'english';
  const mappingStats = getIconMappingStats(language);
  const langDisplay = language === 'english' ? 'english' : formatTextForDisplay('עברית', language);
  console.log(`📚 Icon Mapping Status (${langDisplay}):`);
  console.log(`  Available keywords: ${mappingStats.totalKeywords}`);
  console.log(`  Mapped to icons: ${mappingStats.mappedKeywords}`);
  console.log(`  Unmapped: ${mappingStats.unmappedKeywords.length}`);

  if (mappingStats.mappedKeywords === 0) {
    console.error('\n❌ No icon mappings available! Run plan mode first:');
    console.error('   ts-node src/plan.ts --bearer $BEARER --language english');
    process.exit(1);
  }

  console.log();

  // Analyze playlist
  const { matches, stats } = await analyzePlaylist(options.bearer, options.playlist, language, true);

  displayStats(stats);

  // Show summary of unmatched tracks
  const unmatchedTracks = matches.filter(m => m.confidence === 'none');
  if (unmatchedTracks.length > 0) {
    console.log('\n🔍 Unmatched Tracks Summary:');
    for (const match of unmatchedTracks) {
      const displayTitle = formatTextForDisplay(match.track.title, language);
      console.log(`  ❌ "${displayTitle}"`);
      console.log(`     Search terms: [${match.searchTerms.join(', ')}]`);
    }
  }

  // Filter matches that can be applied (include AI matches)
  const applicableMatches = matches.filter(m => m.iconId && ['exact', 'partial', 'ai'].includes(m.confidence));

  if (applicableMatches.length === 0) {
    console.log('\n🤷 No tracks can be updated with icons.');
    return;
  }

  console.log(`\n📝 ${applicableMatches.length} tracks ready for icon assignment:`);

  const updates = applicableMatches.map(match => ({
    track: match.track,
    iconId: match.iconId!
  }));

  // Apply updates
  const result = await updateCardWithIcons(options.bearer, options.playlist, updates, options.dryRun);

  // Summary
  console.log('\n🎉 Apply Mode completed!');
  if (options.dryRun) {
    console.log(`🧪 DRY RUN - Would have updated ${result.success} tracks`);
  } else {
    console.log(`✅ Successfully updated: ${result.success}`);
    console.log(`❌ Failed: ${result.failed}`);
  }

  // Show unmapped keywords if any
  if (mappingStats.unmappedKeywords.length > 0 && mappingStats.unmappedKeywords.length < 10) {
    console.log(`\n💡 Consider running plan mode for these unmapped keywords:`);
    console.log(`   ${mappingStats.unmappedKeywords.join(', ')}`);
  }
}

function parseArgs(): ApplyOptions {
  const args = minimist(process.argv.slice(2));

  if (!args.bearer) {
    console.error('❌ --bearer token is required');
    process.exit(1);
  }

  if (!args.playlist) {
    console.error('❌ --playlist ID is required');
    process.exit(1);
  }

  const language = (args.language || 'english') as 'english' | 'hebrew';
  if (!['english', 'hebrew'].includes(language)) {
    console.error('❌ --language must be "english" or "hebrew"');
    process.exit(1);
  }

  return {
    bearer: args.bearer,
    playlist: args.playlist,
    dryRun: args.dry || args['dry-run'] || false,
    aiMatch: true, // Always enabled now
    language
  };
}

function showUsage(): void {
  console.log(`
Usage: ts-node src/apply.ts --bearer <TOKEN> --playlist <CARD_ID> [options]

Required:
  --bearer <TOKEN>        Yoto bearer token
  --playlist <CARD_ID>    Yoto playlist/card ID

Options:
  --dry, --dry-run        Preview changes without applying them
  --language <LANG>       Language for mappings: "english" or "hebrew" (default: english)

Examples:
  ts-node src/apply.ts --bearer $BEARER --playlist gkLcn --dry
  ts-node src/apply.ts --bearer $BEARER --playlist gkLcn --language hebrew
  ts-node src/apply.ts --bearer $BEARER --playlist gkLcn

Note: Run plan mode first to generate icon mappings:
  ts-node src/plan.ts --bearer $BEARER --language english
  ts-node src/plan.ts --bearer $BEARER --language hebrew
`);
}

async function main(): Promise<void> {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showUsage();
      process.exit(0);
    }

    const options = parseArgs();
    await runApplyMode(options);
  } catch (error) {
    console.error('❌ Apply mode failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}