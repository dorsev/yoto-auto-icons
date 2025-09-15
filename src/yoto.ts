import fetch from 'node-fetch';
import { CONFIG } from './config';
import { YotoPlaylist, YotoTrack } from './types';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getHeaders(bearerToken: string) {
  return {
    'Authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

export async function getPlaylist(bearerToken: string, cardId: string): Promise<YotoPlaylist> {
  const url = `${CONFIG.YOTO_API_BASE}/content/${cardId}`;

  console.log(`🔍 Fetching playlist: ${cardId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(bearerToken)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist ${cardId}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;

  // Transform API response to our interface
  // Yoto API returns chapters, each containing tracks
  const allTracks: any[] = [];

  if (data.card?.content?.chapters) {
    for (const chapter of data.card.content.chapters) {
      if (chapter.tracks && Array.isArray(chapter.tracks)) {
        // Add chapter-level tracks
        allTracks.push(...chapter.tracks.map((track: any) => ({
          ...track,
          chapterTitle: chapter.title,
          chapterKey: chapter.key
        })));
      } else if (chapter.title) {
        // Chapter itself is a track
        allTracks.push({
          id: chapter.key,
          title: chapter.title,
          display: chapter.display || {},
          isChapter: true
        });
      }
    }
  }

  const playlist: YotoPlaylist = {
    id: data.card?.cardId || cardId,
    title: data.card?.title || 'Untitled Playlist',
    tracks: allTracks.map((track: any) => ({
      id: track.key || track.id,
      title: track.title || 'Untitled Track',
      display: track.display || {},
      chapterKey: track.chapterKey,
      trackKey: track.key
    }))
  };

  console.log(`  ✓ Found ${playlist.tracks.length} tracks`);
  return playlist;
}

export async function updateCard(bearerToken: string, cardData: any): Promise<boolean> {
  const url = `${CONFIG.YOTO_API_BASE}/content`;

  console.log(`🎨 Bulk updating card ${cardData.cardId}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(bearerToken),
      body: JSON.stringify(cardData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ✗ Failed: ${response.status} ${response.statusText}`);
      console.error(`  ✗ Error details: ${errorText}`);
      return false;
    }

    console.log(`  ✓ Successfully updated card`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error:`, error);
    return false;
  }
}

export async function updateCardWithIcons(
  bearerToken: string,
  cardId: string,
  updates: Array<{ track: YotoTrack; iconId: string }>,
  dryRun: boolean = false
): Promise<{ success: number; failed: number }> {
  console.log(`\n🎯 ${dryRun ? '[DRY RUN] ' : ''}Bulk updating ${updates.length} tracks...`);

  if (dryRun) {
    for (const { track, iconId } of updates) {
      console.log(`📖 "${track.title}" → [DRY RUN] Would update with icon ${iconId}`);
    }
    return { success: updates.length, failed: 0 };
  }

  try {
    // Fetch the current card structure
    console.log(`🔄 Fetching current card structure...`);
    const response = await fetch(`${CONFIG.YOTO_API_BASE}/content/${cardId}`, {
      method: 'GET',
      headers: getHeaders(bearerToken)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch card: ${response.status} ${response.statusText}`);
    }

    const cardData = await response.json() as any;

    // Apply icon updates to the card structure
    console.log(`🔄 Applying ${updates.length} icon updates...`);

    for (const { track, iconId } of updates) {
      // Convert yoto:#ID format to full media URL
      const mediaUrl = iconId.startsWith('yoto:#')
        ? `https://media-secure-v2.api.yotoplay.com/icons/${iconId.replace('yoto:#', '')}`
        : iconId;

      console.log(`📖 "${track.title}" → ${mediaUrl}`);

      // Find and update the corresponding chapter and track
      if (cardData.card?.content?.chapters) {
        for (const chapter of cardData.card.content.chapters) {
          if (chapter.key === track.chapterKey) {
            // Update chapter display
            if (!chapter.display) chapter.display = {};
            chapter.display.icon16x16 = mediaUrl;

            // Update track display
            if (chapter.tracks) {
              for (const cardTrack of chapter.tracks) {
                if (cardTrack.key === track.trackKey || cardTrack.key === track.id) {
                  if (!cardTrack.display) cardTrack.display = {};
                  cardTrack.display.icon16x16 = mediaUrl;
                  break;
                }
              }
            }
            break;
          }
        }
      }
    }

    // Send the updated card back
    const success = await updateCard(bearerToken, cardData.card);

    return success
      ? { success: updates.length, failed: 0 }
      : { success: 0, failed: updates.length };

  } catch (error) {
    console.error(`❌ Bulk update failed:`, error);
    return { success: 0, failed: updates.length };
  }
}

export async function validatePlaylist(bearerToken: string, cardId: string): Promise<boolean> {
  try {
    await getPlaylist(bearerToken, cardId);
    return true;
  } catch (error) {
    console.error(`❌ Invalid playlist ${cardId}:`, error);
    return false;
  }
}