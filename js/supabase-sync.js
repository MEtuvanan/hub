/**
 * supabase-sync.js — Cloud persistence layer for Hub / Travel and Challenge
 * Stores and syncs all user state to Supabase:
 *  - ชุด (Outfits & Wardrobe: tc_mobile_outfit)
 *  - ตัวละคร (Unlocked & Team: tc_game_team, tc_game_owned, tc_game_characters)
 *  - บอส (Boss defeats & Custom Bosses: tc_game_bosses, tc_game_progress)
 *  - เควสที่สำเร็จ (Completed Quests: tc_mobile_completed_quests, user_quests table)
 *  - ที่เที่ยวที่ปัด & เก็บ (Liked & Passed places: tc_mobile_liked_places, tc_mobile_passed_places)
 *  - และอื่นๆ ภายในเว็บ (Tokens & Star rewards: tc_mobile_tokens, tc_mobile_star_days)
 */

let syncDebounceTimer = null;
let isSyncing = false;
let isInitialized = false;

let _supabase = null;
let _auth = null;

async function getClient() {
  if (_supabase && _auth) return { supabase: _supabase, auth: _auth };
  try {
    const [sMod, aMod] = await Promise.all([
      import('./supabase.js'),
      import('./auth.js'),
    ]);
    _supabase = sMod.supabase;
    _auth = aMod;
  } catch (err) {
    // In Node.js or offline without ESM HTTPS loader
  }
  return { supabase: _supabase, auth: _auth };
}

function readSafeJSON(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeSafeJSON(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/**
 * Collect all current user game & travel data into a unified sync payload
 */
export function getLocalSnapshot() {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    // 1. ชุด (Outfit & Wardrobe)
    outfit: readSafeJSON('tc_mobile_outfit', null),
    // 2. ตัวละคร (Characters, Team lineup & Owned)
    team: readSafeJSON('tc_game_team', null),
    owned: readSafeJSON('tc_game_owned', null),
    characters: readSafeJSON('tc_game_characters', null),
    // 3. บอส (Bosses, Defeats, Wins & Progress)
    bosses: readSafeJSON('tc_game_bosses', null),
    progress: readSafeJSON('tc_game_progress', null),
    // 4. เควสที่สำเร็จ (Completed Quests)
    completedQuests: readSafeJSON('tc_mobile_completed_quests', null),
    // 5. ที่เที่ยวที่ปัด & เก็บ (Liked places / Bookmarks & Passed)
    likedPlaces: readSafeJSON('tc_mobile_liked_places', null),
    passedPlaces: readSafeJSON('tc_mobile_passed_places', null),
    likedQuests: readSafeJSON('tc_mobile_liked_quests', null),
    passedQuests: readSafeJSON('tc_mobile_passed_quests', null),
    // 6. และอื่นๆ (Tokens & Daily stars)
    tokens: (() => {
      try {
        const t = localStorage.getItem('tc_mobile_tokens');
        return t !== null ? Number(t) : null;
      } catch { return null; }
    })(),
    starDays: readSafeJSON('tc_mobile_star_days', null),
  };
}

/**
 * Apply cloud data from Supabase to localStorage
 */
export function applyCloudSnapshot(cloud) {
  if (!cloud || typeof cloud !== 'object') return false;

  // 1. ชุด (Outfit)
  if (cloud.outfit && typeof cloud.outfit === 'object') {
    writeSafeJSON('tc_mobile_outfit', cloud.outfit);
  }

  // 2. ตัวละคร (Characters & Team)
  if (Array.isArray(cloud.team) && cloud.team.length) {
    writeSafeJSON('tc_game_team', cloud.team);
  }
  if (Array.isArray(cloud.owned) && cloud.owned.length) {
    const localOwned = new Set(readSafeJSON('tc_game_owned', []));
    cloud.owned.forEach(id => localOwned.add(id));
    writeSafeJSON('tc_game_owned', [...localOwned]);
  }
  if (Array.isArray(cloud.characters) && cloud.characters.length) {
    const localChars = readSafeJSON('tc_game_characters', []);
    const merged = [...cloud.characters];
    localChars.forEach(lc => {
      if (!merged.some(c => c.id === lc.id)) merged.push(lc);
    });
    writeSafeJSON('tc_game_characters', merged);
  }

  // 3. บอส (Bosses & Progress)
  if (Array.isArray(cloud.bosses) && cloud.bosses.length) {
    const localBosses = readSafeJSON('tc_game_bosses', []);
    const mergedBosses = [...cloud.bosses];
    localBosses.forEach(lb => {
      if (!mergedBosses.some(b => b.id === lb.id)) mergedBosses.push(lb);
    });
    writeSafeJSON('tc_game_bosses', mergedBosses);
  }
  if (cloud.progress && typeof cloud.progress === 'object') {
    const localP = readSafeJSON('tc_game_progress', { defeated: [], wins: 0, tokens: 0, xp: 0 });
    const mergedDefeated = [...new Set([...(localP.defeated || []), ...(cloud.progress.defeated || [])])];
    const nextP = {
      ...localP,
      ...cloud.progress,
      defeated: mergedDefeated,
      wins: Math.max(localP.wins || 0, cloud.progress.wins || 0),
      tokens: Math.max(localP.tokens || 0, cloud.progress.tokens || 0),
      xp: Math.max(localP.xp || 0, cloud.progress.xp || 0),
    };
    writeSafeJSON('tc_game_progress', nextP);
  }

  // 4. เควสที่สำเร็จ (Completed Quests)
  if (Array.isArray(cloud.completedQuests) && cloud.completedQuests.length) {
    const localQ = new Set(readSafeJSON('tc_mobile_completed_quests', []));
    cloud.completedQuests.forEach(q => localQ.add(q));
    writeSafeJSON('tc_mobile_completed_quests', [...localQ]);
  }

  // 5. ที่เที่ยวที่ปัด & เก็บ
  if (Array.isArray(cloud.likedPlaces)) {
    const set = new Set([...readSafeJSON('tc_mobile_liked_places', []), ...cloud.likedPlaces]);
    writeSafeJSON('tc_mobile_liked_places', [...set]);
  }
  if (Array.isArray(cloud.passedPlaces)) {
    const set = new Set([...readSafeJSON('tc_mobile_passed_places', []), ...cloud.passedPlaces]);
    writeSafeJSON('tc_mobile_passed_places', [...set]);
  }
  if (Array.isArray(cloud.likedQuests)) {
    const set = new Set([...readSafeJSON('tc_mobile_liked_quests', []), ...cloud.likedQuests]);
    writeSafeJSON('tc_mobile_liked_quests', [...set]);
  }
  if (Array.isArray(cloud.passedQuests)) {
    const set = new Set([...readSafeJSON('tc_mobile_passed_quests', []), ...cloud.passedQuests]);
    writeSafeJSON('tc_mobile_passed_quests', [...set]);
  }

  // 6. Tokens & Star days
  if (typeof cloud.tokens === 'number' && Number.isFinite(cloud.tokens)) {
    const curTokens = Number(localStorage.getItem('tc_mobile_tokens') || 0);
    const maxTokens = Math.max(curTokens, cloud.tokens);
    localStorage.setItem('tc_mobile_tokens', String(maxTokens));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tc-tokens', { detail: { tokens: maxTokens } }));
    }
  }
  if (Array.isArray(cloud.starDays)) {
    const set = new Set([...readSafeJSON('tc_mobile_star_days', []), ...cloud.starDays]);
    writeSafeJSON('tc_mobile_star_days', [...set]);
  }

  // Notify listeners that game/mobile data updated from cloud
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tc-cloud-synced', { detail: { cloud } }));
    window.dispatchEvent(new CustomEvent('tc-game-changed', { detail: { key: 'cloud' } }));
  }
  return true;
}

/**
 * Pull latest user data from Supabase
 */
export async function pullFromSupabase() {
  try {
    const { supabase, auth } = await getClient();
    if (!supabase || !auth) return false;

    const session = await auth.getSession();
    if (!session?.user?.id) return false;

    // 1. Check user_metadata.tc_cloud_save (always accessible for current user)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (!userErr && userData?.user?.user_metadata?.tc_cloud_save) {
      applyCloudSnapshot(userData.user.user_metadata.tc_cloud_save);
    }

    // 2. Fetch completed quests from user_quests table (if user logged in)
    try {
      const { data: uQuests } = await supabase
        .from('user_quests')
        .select('quest_id')
        .eq('user_id', session.user.id)
        .eq('status', 'completed');
      if (Array.isArray(uQuests) && uQuests.length) {
        const localQ = new Set(readSafeJSON('tc_mobile_completed_quests', []));
        uQuests.forEach(r => localQ.add(r.quest_id));
        writeSafeJSON('tc_mobile_completed_quests', [...localQ]);
      }
    } catch {}

    // 3. Fetch from profiles if extended metadata exists
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('game_save, outfit')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profile?.game_save) applyCloudSnapshot(profile.game_save);
      if (profile?.outfit) writeSafeJSON('tc_mobile_outfit', profile.outfit);
    } catch {}

    return true;
  } catch (err) {
    console.warn('pullFromSupabase error:', err?.message || err);
    return false;
  }
}

/**
 * Push current local state to Supabase
 */
export async function pushToSupabase() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const { supabase, auth } = await getClient();
    if (!supabase || !auth) return;

    const session = await auth.getSession();
    if (!session?.user?.id) return;

    const snapshot = getLocalSnapshot();

    // 1. Primary persistence: Save to user_metadata (built-in to Supabase auth, completely robust)
    await supabase.auth.updateUser({
      data: { tc_cloud_save: snapshot }
    });

    // 2. Sync completed quests to user_quests table so admins can see progress
    if (Array.isArray(snapshot.completedQuests) && snapshot.completedQuests.length) {
      try {
        const rows = snapshot.completedQuests.map(qid => ({
          user_id: session.user.id,
          quest_id: qid,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }));
        await supabase.from('user_quests').upsert(rows, { onConflict: 'user_id,quest_id' });
      } catch {}
    }

    // 3. Attempt profiles table update (if column exists)
    try {
      await supabase.from('profiles').update({
        outfit: snapshot.outfit,
        game_save: snapshot,
        updated_at: new Date().toISOString(),
      }).eq('id', session.user.id);
    } catch {}

  } catch (err) {
    console.warn('pushToSupabase notice:', err?.message || err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Schedule a debounced push (e.g. after a swipe, quest completion, wardrobe change, boss victory)
 */
export function scheduleCloudPush(delayMs = 700) {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    pushToSupabase();
  }, delayMs);
}

/**
 * Initialize sync listeners and pull initial cloud state
 */
export async function initCloudSync() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Initial pull
  await pullFromSupabase();

  // Listen for local changes
  window.addEventListener('tc-game-changed', () => scheduleCloudPush(600));
  window.addEventListener('tc-outfit-changed', () => scheduleCloudPush(600));
  window.addEventListener('tc-quest-completed', () => scheduleCloudPush(500));
  window.addEventListener('tc-place-swiped', () => scheduleCloudPush(800));
  window.addEventListener('tc-tokens', () => scheduleCloudPush(1000));

  // Also push when tab becomes hidden / before unload
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pushToSupabase();
  });
}
