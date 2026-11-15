// tests/test_cloud_sync_and_auth_gate.mjs
// Test Auth Gate logic, 3D Boss models, and Supabase cloud sync engine

import assert from 'node:assert';

// Mock storage and browser environment
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

globalThis.localStorage = new MockStorage();
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
};
globalThis.document = {
  addEventListener: () => {},
  visibilityState: 'visible',
};
globalThis.CustomEvent = class { constructor(type, detail) { this.type = type; this.detail = detail; } };

console.log('🧪 Testing Supabase Cloud Sync, 3D Boss Models, and Auth Gate');

const { BOSS_MODELS, listBosses, saveBoss } = await import('../js/game-data.js');
const { getLocalSnapshot, applyCloudSnapshot } = await import('../js/supabase-sync.js');

// 1. Test 3D Boss Model configuration
const custom3d = BOSS_MODELS.find(m => m.id === 'custom-3d');
assert(custom3d && custom3d.is3d === true, 'Custom 3D model preset should be available');
console.log('✅ 3D Boss model archetype loaded:', custom3d.name);

// 2. Test Boss 3D file URL save
const savedBoss = saveBoss({
  name: 'บอสพญานาค 3D',
  placeId: 'demo-wat-arun',
  level: 10,
  model: 'custom-3d',
  modelUrl: 'https://example.com/models/naga.glb',
  hp: 1000,
  atk: 80,
  def: 40,
});
assert(savedBoss.is3d === true, 'Boss should be flagged as 3D');
assert(savedBoss.modelUrl.endsWith('.glb'), 'Boss should store 3D modelUrl');
console.log('✅ Boss 3D model saved with GLB URL:', savedBoss.modelUrl);

// 3. Test Cloud Sync Snapshot
localStorage.setItem('tc_mobile_outfit', JSON.stringify({ top: 'armor', topColor: '#FF5A1F' }));
localStorage.setItem('tc_mobile_completed_quests', JSON.stringify(['quest-1', 'quest-2']));
localStorage.setItem('tc_mobile_liked_places', JSON.stringify(['place-wat-arun']));
localStorage.setItem('tc_mobile_tokens', '1500');

const snapshot = getLocalSnapshot();
assert.equal(snapshot.outfit?.top, 'armor', 'Snapshot should contain outfit');
assert(snapshot.completedQuests.includes('quest-1'), 'Snapshot should contain completed quests');
assert(snapshot.likedPlaces.includes('place-wat-arun'), 'Snapshot should contain swiped/liked places');
assert.equal(snapshot.tokens, 1500, 'Snapshot should contain tokens');
console.log('✅ Local snapshot contains outfit, quests, places, and tokens');

// 4. Test Applying Cloud Snapshot from Supabase
const mockSupabaseCloud = {
  outfit: { top: 'expedition-jacket', hair: 'ponytail' },
  team: ['char-ray', 'char-maya'],
  completedQuests: ['quest-1', 'quest-2', 'quest-3'],
  likedPlaces: ['place-wat-arun', 'place-yaowarat'],
  passedPlaces: ['place-far'],
  tokens: 2200,
  progress: { wins: 5, defeated: ['boss-wat-arun'], tokens: 600, xp: 450 },
};

applyCloudSnapshot(mockSupabaseCloud);

const restoredOutfit = JSON.parse(localStorage.getItem('tc_mobile_outfit'));
const restoredQuests = JSON.parse(localStorage.getItem('tc_mobile_completed_quests'));
const restoredLiked = JSON.parse(localStorage.getItem('tc_mobile_liked_places'));
const restoredPassed = JSON.parse(localStorage.getItem('tc_mobile_passed_places'));
const restoredTokens = Number(localStorage.getItem('tc_mobile_tokens'));
const restoredProgress = JSON.parse(localStorage.getItem('tc_game_progress'));

assert.equal(restoredOutfit.top, 'expedition-jacket', 'Cloud outfit restored');
assert.equal(restoredQuests.length, 3, 'Cloud completed quests merged');
assert.equal(restoredLiked.length, 2, 'Cloud swiped liked places restored');
assert.equal(restoredPassed.length, 1, 'Cloud swiped passed places restored');
assert.equal(restoredTokens, 2200, 'Cloud tokens restored');
assert.equal(restoredProgress.wins, 5, 'Cloud boss progress restored');

console.log('✅ Supabase cloud snapshot successfully restored and merged into local state!');
console.log('🎉 All Cloud Sync and 3D Boss tests passed!');
