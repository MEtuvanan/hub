// tests/test_ar_game_flow.mjs
// Verify AR Game data integrity, admin operations, team selection, and boss encounters

import assert from 'node:assert';

// Mock localStorage for Node environment
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}
globalThis.localStorage = new MockStorage();
globalThis.window = { dispatchEvent: () => {} };
globalThis.CustomEvent = class { constructor(type, detail) { this.type = type; this.detail = detail; } };

const {
  BOSS_MODELS, RARITIES, SKILL_KINDS, MAX_TEAM,
  listCharacters, saveCharacter, characterById, grantCharacter, isOwned,
  listBosses, saveBoss, bossById, bossesForPlace,
  listSkills, saveSkill, skillById,
  getTeam, setTeam, toggleTeamMember,
  getProgress, recordBossWin, resetGameData
} = await import('../js/game-data.js');

console.log('🧪 Testing AR Game Data & Battle Flow');

// 1. Verify Defaults
resetGameData();
const chars = listCharacters();
assert(chars.length >= 4, 'Should have default characters');
console.log('✅ Default characters loaded:', chars.length);

const bosses = listBosses();
assert(bosses.length >= 5, 'Should have default location bosses');
console.log('✅ Default bosses loaded:', bosses.length);

const skills = listSkills();
assert(skills.length >= 8, 'Should have default skills');
console.log('✅ Default skills loaded:', skills.length);

assert.strictEqual(MAX_TEAM, 3, 'MAX_TEAM should be 3');
console.log('✅ Max team size is 3');

// 2. Admin CRUD Character
const newChar = saveCharacter({
  name: 'ฮีโร่ทดสอบ',
  role: 'นักรบ',
  rarity: 'legendary',
  color: '#FF5722',
  image: '/assets/img/test.png',
  hp: 400,
  atk: 60,
  def: 30,
  spd: 25,
  skillId: 'solar-flare',
  desc: 'ตัวละครทดสอบจากแอดมิน'
});
assert(characterById(newChar.id), 'Admin should be able to create character');
console.log('✅ Admin saveCharacter works:', newChar.id);

// 3. Admin CRUD Boss with Model and Location
const newBoss = saveBoss({
  name: 'มังกรวัดพระแก้ว',
  placeId: 'demo-wat-phra-kaew',
  placeName: 'วัดพระแก้ว',
  lat: 13.7516,
  lng: 100.4927,
  level: 10,
  hp: 850,
  atk: 75,
  def: 40,
  spd: 22,
  model: 'shadow',
  rarity: 'legendary',
  reward: 300,
  skillId: 'boss-wave',
  desc: 'บอสประจำวัดพระแก้ว'
});
assert(bossById(newBoss.id), 'Admin should be able to create boss');
assert.strictEqual(bossesForPlace('demo-wat-phra-kaew')[0]?.name, 'มังกรวัดพระแก้ว', 'Boss should be linked to place');
console.log('✅ Admin saveBoss works with place linking & model:', newBoss.model);

// 4. Team Builder & Lineup
grantCharacter(newChar.id);
const teamBefore = getTeam();
assert(teamBefore.length <= MAX_TEAM, 'Team should not exceed MAX_TEAM');
if (teamBefore.includes(newChar.id)) {
  toggleTeamMember(newChar.id);
  assert(!getTeam().includes(newChar.id), 'Toggling existing member should remove them');
  toggleTeamMember(newChar.id);
  assert(getTeam().includes(newChar.id), 'Toggling removed member should add them back');
} else {
  toggleTeamMember(newChar.id);
  assert(getTeam().includes(newChar.id), 'Toggling should add member to team');
}
console.log('✅ Team builder toggle works, team:', getTeam());

// 5. Boss Win & Progress
const beforeProg = getProgress();
recordBossWin(newBoss, { tokens: 300, xp: 200 });
const afterProg = getProgress();
assert(afterProg.defeated.includes(newBoss.id), 'Boss should be recorded as defeated');
assert.strictEqual(afterProg.wins, beforeProg.wins + 1, 'Wins count should increment');
assert.strictEqual(afterProg.tokens, beforeProg.tokens + 300, 'Tokens should be awarded');
console.log('✅ RecordBossWin works, total wins:', afterProg.wins, 'tokens:', afterProg.tokens);

console.log('🎉 All AR Game flow tests passed successfully!');
