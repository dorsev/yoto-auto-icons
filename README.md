# Yoto Auto Icons Tool 🎨

Automatically assign Yoto playlist icons based on track titles using OpenAI Vision API and AI-powered semantic matching.

## ✨ Features

- 🔍 **Plan Mode**: Uses OpenAI Vision to map 352 Yoto icon IDs to semantic keywords
- 🎯 **Apply Mode**: Intelligently assigns icons to playlist tracks with AI fallback
- 📊 **Report Mode**: Analyzes missing icons and shows improvement potential
- 🎨 **Generate Mode**: Creates custom icons for missing keywords (framework ready)
- 🌍 **Multi-language**: Full support for English and Hebrew with pure language synonyms
- 📊 **Smart Matching**: Exact → Partial → AI semantic matching with 95%+ success rates
- 🧪 **Safe Testing**: Dry-run mode to preview changes before applying
- ⚡ **Bulk Updates**: Efficient API calls with proper rate limiting

## Complete Workflow

### Step-by-Step Process

```bash
# Step 1: Install dependencies and configure environment
npm install
export OPENAI_API_KEY="your_openai_api_key_here"
export BEARER="your_yoto_bearer_token_here"

# Step 2: Generate icon mappings from Yoto's existing icons
npm run plan -- --bearer $BEARER --language hebrew

# Step 3: Identify missing icons needed for your playlists
npm run report -- --bearer $BEARER --language hebrew

# Step 4: Generate missing icons with AI (saves to generated-icons/)
npm run generate -- --language hebrew --limit 10

# Step 5: MANUALLY upload generated icons to Yoto via web interface
# (See "Manual Upload Process" section below)

# Step 6: Update mappings with new icon IDs
# (See "Updating Mappings" section below)

# Step 7: Apply icons to your playlist
npm run apply -- --bearer $BEARER --playlist gkLcn --language hebrew --dry
npm run apply -- --bearer $BEARER --playlist gkLcn --language hebrew
```

## Four Modes

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

### 📊 **Report Mode**
Analyzes missing icons and prioritizes generation needs.

```bash
# Generate missing icons report
npm run report -- --bearer $BEARER --language hebrew

# Analyze specific playlist gaps
npm run report -- --bearer $BEARER --playlist $CARD_ID --language hebrew
```

**Shows**:
- 📈 Current coverage statistics
- 🔥 Priority missing icons by usage frequency
- 🎯 Potential success rate improvements

### 🎨 **Generate Mode**
Creates custom icons for missing keywords using DALL-E 3.

```bash
# Generate all missing icons (saves to generated-icons/)
npm run generate -- --language hebrew

# Generate specific icons only
npm run generate -- --keywords "בלון,טרקטור" --dry

# Generate with limit
npm run generate -- --language hebrew --limit 5
```

**Features**:
- 🎨 AI-powered icon generation using DALL-E 3
- 📁 Saves icons to `generated-icons/` directory
- 🧪 Dry-run testing support
- 🌍 Multi-language support (English/Hebrew)
- 🎯 Custom keyword targeting

**Note**: Generated icons require manual upload through the Yoto web interface and manual mapping updates.

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
├── synonyms/
│   ├── english.json               # English keyword synonyms
│   └── hebrew.json                # Hebrew keyword synonyms
├── icon_ids.txt                   # 352 Yoto icon IDs
└── package.json                   # NPM scripts & dependencies
```

## Configuration Files

### `synonyms/` - Keyword Synonyms
Maps keywords to arrays of synonyms for each language:

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

### Complete Workflow Example
```bash
# 1. Generate icon mappings from existing Yoto icons
npm run plan -- --bearer $BEARER --language hebrew

# 2. Check what icons are missing
npm run report -- --bearer $BEARER --language hebrew

# 3. Generate missing icons (saves to generated-icons/)
npm run generate -- --language hebrew --limit 10

# 4. Manually upload generated icons via Yoto web interface
# 5. Update mappings with new icon IDs (see Manual Upload Process below)

# 6. Preview playlist changes
npm run apply -- --bearer $BEARER --playlist gkLcn --language hebrew --dry

# 7. Apply changes
npm run apply -- --bearer $BEARER --playlist gkLcn --language hebrew
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

## ⚠️ Important Disclaimers

**🚧 Work in Progress**: This is an experimental tool under active development. Features may change and bugs may exist.

**⚠️ Use at Your Own Risk**: This tool modifies your Yoto playlists. Always run with `--dry` flag first to preview changes. The authors are not responsible for any data loss or unexpected modifications.

**🏢 Third-Party Tool**: This is an unofficial, community-created tool. It is not affiliated with, endorsed by, or supported by Yoto. All Yoto trademarks, API endpoints, and related intellectual property belong to Yoto.

**🔑 API Usage**: You are responsible for your own API keys and bearer tokens. Ensure you comply with OpenAI and Yoto's terms of service.

**📊 Rate Limits**: The tool implements conservative rate limiting, but you are responsible for monitoring your API usage and costs.

## Requirements

- Node.js 16+
- TypeScript 5+
- OpenAI API key (for Plan Mode and Generate Mode)
- Yoto bearer token (for Plan and Apply modes)

## Future Work

### Automatic Icon Upload
Currently, generated icons must be manually uploaded through the Yoto web interface due to OAuth authentication complexities. Future improvements could include:

- **Direct Cloud Storage**: Upload generated icons to a public cloud storage (AWS S3, Google Cloud Storage) with automatic URL generation
- **Image Hosting Integration**: Integration with image hosting services (Imgur, Cloudinary) for direct sharing
- **OAuth Integration**: Proper OAuth Device Code Flow implementation for direct Yoto API uploads
- **Web Interface**: Simple web UI for drag-and-drop icon upload and mapping management

These enhancements would eliminate the manual upload step and provide a fully automated icon generation and assignment workflow.

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