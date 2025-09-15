# Yoto Auto Icons Tool 🎨

Automatically assign Yoto playlist icons based on track titles using OpenAI Vision API and AI-powered semantic matching.

## ✨ Features

- 🔍 **Plan Mode**: Uses OpenAI Vision to map 352 Yoto icon IDs to semantic keywords
- 🎯 **Apply Mode**: Intelligently assigns icons to playlist tracks with AI fallback
- 🌍 **Multi-language**: Full support for English and Hebrew with RTL text handling
- 📊 **Smart Matching**: Exact → Partial → AI semantic matching with 95%+ success rates
- 🧪 **Safe Testing**: Dry-run mode to preview changes before applying
- ⚡ **Bulk Updates**: Efficient API calls with proper rate limiting

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
export OPENAI_API_KEY="your_openai_api_key_here"
export BEARER="your_yoto_bearer_token_here"

# 3. Run Plan Mode (generate icon mappings)
npm run plan -- --bearer $BEARER --language hebrew

# 4. Run Apply Mode (assign icons to playlist)
npm run apply -- --bearer $BEARER --playlist gkLcn --language hebrew --dry
npm run apply -- --bearer $BEARER --playlist gkLcn --language hebrew
```

## Two Modes

### 🔍 Plan Mode
Maps Yoto icon IDs to semantic keywords using OpenAI Vision API.

```bash
# Generate English icon mappings
npm run plan -- --bearer $BEARER --language english

# Generate Hebrew icon mappings
npm run plan -- --bearer $BEARER --language hebrew

# Resume from specific index
npm run plan -- --bearer $BEARER --language hebrew --startFrom 100

# Process in smaller batches
npm run plan -- --bearer $BEARER --batchSize 5
```

**Output**: `data/yoto_icon_ids_hebrew.json` / `data/yoto_icon_ids.json`
```json
{
  "דוב": "yoto:#p_yLNC3TPtuo8MNv5WSG0q5aqTPD-WRRRWYkPB0cbjA",
  "ציפור": "yoto:#pcGl9aZOfMwiNUm8Rfu4wRYPkBuDiEB5nwwy76aVtCM",
  "ספר": "yoto:#uiqaZz3Q_kM359pgiMaIkK-grc19uo4tRK5bSAMro7o"
}
```

### 🎯 Apply Mode
Intelligently matches track titles to icons using multi-layer matching strategy.

```bash
# Preview changes (recommended first step)
npm run apply -- --bearer $BEARER --playlist $CARD_ID --language hebrew --dry

# Apply icon updates
npm run apply -- --bearer $BEARER --playlist $CARD_ID --language hebrew
```

**Matching Strategy**:
- ✅ **Exact matches**: Direct keyword matches in track titles
- 🟡 **Partial matches**: Fuzzy matching with synonyms and Hebrew prefix stripping
- 🤖 **AI matches**: OpenAI semantic matching for unmatched tracks
- 💡 **Suggestions**: Shows potential alternatives for manual review
- 📊 **Comprehensive stats**: Detailed success rates and coverage analysis

## File Structure

```
yoto-auto-icons/
├── src/
│   ├── plan.ts        # Vision API mode - generates keyword mappings
│   ├── apply.ts       # Playlist update mode - assigns icons to tracks
│   ├── matchIcon.ts   # Multi-layer matching with AI fallback
│   ├── yoto.ts        # Yoto API integration with bulk updates
│   ├── config.ts      # Configuration & language handling
│   └── types.ts       # TypeScript interfaces
├── data/
│   ├── yoto_icon_ids_hebrew.json  # Hebrew icon mappings
│   └── yoto_icon_ids.json         # English icon mappings
├── icon_ids.txt                   # 352 Yoto icon IDs
├── yoto_icons_hebrew.json         # Hebrew keyword synonyms
├── yoto_icons.json                # English keyword synonyms
└── package.json                   # NPM scripts & dependencies
```

## Configuration Files

### `yoto_icons.json` - Keyword Synonyms
Maps keywords to arrays of synonyms in multiple languages:

```json
{
  "dog": ["כלב", "dog", "puppy"],
  "moon": ["ירח", "moon", "לילה"],
  "music_notes": ["שיר", "שירים", "מוזיקה", "music", "song"]
}
```

### `icon_ids.txt` - Yoto Icon IDs
One icon ID per line (352 total):
```
3ZnJD74DawVPKntS3pIEpDlM57daHtDuczmf2JI_EBw
_WWpLHoOj6iqeREcGkJnGlsis2QSF6znM0UPFdXTjf8
...
```

## API Rate Limits

- **OpenAI Vision**: 200ms delay between calls
- **Yoto API**: 100ms delay between track updates
- **Batch Processing**: Default 10 icons per batch (configurable)

## Error Handling

- **Resume Capability**: Plan mode saves progress after each batch
- **Graceful Failures**: Continues processing even if individual icons fail
- **Validation**: Checks bearer token and playlist access before processing

## Examples

### Workflow Example
```bash
# 1. Generate icon mappings (352 icons)
npm run plan -- --bearer $BEARER --language english

# 2. Preview playlist changes
npm run apply -- --bearer $BEARER --playlist gkLcn --dry

# 3. Apply changes
npm run apply -- --bearer $BEARER --playlist gkLcn
```

### Real-World Success Story
Successfully processed Hebrew children's audiobook playlist (61 tracks) with 95% match rate:

```
🎯 Apply Mode - Playlist: gkLcn (Hebrew)
🚀 LIVE MODE - Changes will be applied
🤖 AI MATCHING - Using OpenAI for unmatched tracks

📚 Icon Mapping Status (עברית):
  Available keywords: 339
  Mapped to icons: 223
  Unmapped: 116

🎵 Fetching playlist...
  ✓ Found 61 tracks

🔍 Analyzing tracks for icon matches...

✅ "הציפור ששכחה לעוף"
    → ציפור (yoto:#pcGl9aZOfMwiNUm8Rfu4wRYPkBuDiEB5nwwy76aVtCM)

🟡 "רוני ונומי והדב יעקב - סיפור לילדים"
    → דוב (yoto:#p_yLNC3TPtuo8MNv5WSG0q5aqTPD-WRRRWYkPB0cbjA)

🤖 "עיר הקינוחים - סיפור מתוק לילדים"
    → שוקולד (yoto:#LCBoQM5qDDHBwPWdP1SM55hDvMu06-DRLod3Le5k1a0)

📊 Match Statistics:
  Total tracks: 61
  ✅ Exact matches: 26 (43%)
  🟡 Partial matches: 32 (52%)
  🤖 AI matches: 0 (0%)
  ❌ No matches: 3 (5%)
  🎯 Assignable: 58 (95%)

🎯 Bulk updating 42 tracks...
🎨 Successfully updated card

🎉 Apply Mode completed!
✅ Successfully updated: 42
❌ Failed: 0
```

## Requirements

- Node.js 16+
- TypeScript 5+
- OpenAI API key (for Plan Mode)
- Yoto bearer token (for both modes)

## Troubleshooting

**No icon mappings available**:
```bash
# Run plan mode first
npm run plan -- --bearer $BEARER --language english
```

**Invalid playlist error**:
- Check bearer token is valid
- Verify playlist/card ID is correct
- Ensure you have access to the playlist