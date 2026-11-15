// game-data.js — shared AR game data: characters, boss models, skills, bosses,
// team lineup and player progress. Storage-first so it works in the demo build
// and can later be swapped for Supabase tables without touching the UI.

const KEYS = {
  characters: 'tc_game_characters',
  skills: 'tc_game_skills',
  bosses: 'tc_game_bosses',
  team: 'tc_game_team',
  owned: 'tc_game_owned',
  progress: 'tc_game_progress',
};

export const MAX_TEAM = 3;

export const RARITIES = {
  common: { label: 'ธรรมดา', tone: '#6B7C74', bg: '#F1F5F3' },
  rare: { label: 'หายาก', tone: '#1F6FB2', bg: '#EAF3FA' },
  epic: { label: 'มหากาพย์', tone: '#6B4BB0', bg: '#F1ECFB' },
  legendary: { label: 'ตำนาน', tone: '#A97400', bg: '#FFF6D8' },
};

// Boss "models" are the visual archetypes an admin can pick for each boss.
export const BOSS_MODELS = [
  { id: 'guardian', name: 'ผู้พิทักษ์', image: '/assets/img/ray.png', tint: '#2F6FED' },
  { id: 'wanderer', name: 'นักเดินทางเงา', image: '/assets/img/maya.png', tint: '#0F8A5F' },
  { id: 'sorceress', name: 'แม่มดแห่งวัด', image: '/assets/img/luna.png', tint: '#C4483A' },
  { id: 'shadow', name: 'จอมเวทราตรี', image: '/assets/img/zael.png', tint: '#6B4BB0' },
];

export const SKILL_KINDS = {
  damage: 'โจมตี',
  heal: 'ฟื้นฟู',
  buff: 'เสริมพลัง',
  debuff: 'ลดพลังศัตรู',
};

const DEFAULT_SKILLS = [
  { id: 'strike', name: 'โจมตีพื้นฐาน', kind: 'damage', power: 1, cost: 0, icon: 'flame', desc: 'โจมตีเป้าหมายด้วยพลังปกติ' },
  { id: 'solar-flare', name: 'แสงสุริยะ', kind: 'damage', power: 1.9, cost: 2, icon: 'sun', desc: 'ปล่อยแสงอาทิตย์เผาไหม้ศัตรู' },
  { id: 'river-guard', name: 'เกราะสายน้ำ', kind: 'heal', power: 0.28, cost: 2, icon: 'heart', desc: 'ฟื้นฟู HP ของตัวเอง 28%' },
  { id: 'night-curse', name: 'คำสาปราตรี', kind: 'debuff', power: 1.4, cost: 3, icon: 'star', desc: 'สร้างความเสียหายและลดพลังโจมตีศัตรู' },
  { id: 'temple-ward', name: 'คาถาปกป้องวัด', kind: 'buff', power: 0.3, cost: 2, icon: 'shield', desc: 'เพิ่มพลังป้องกันให้ทีมในเทิร์นถัดไป' },
  { id: 'boss-slam', name: 'ทุบสะเทือน', kind: 'damage', power: 1.6, cost: 0, icon: 'flame', desc: 'ทุบพื้นสร้างแรงสั่นสะเทือน' },
  { id: 'boss-roar', name: 'คำรามสะท้าน', kind: 'debuff', power: 1.1, cost: 0, icon: 'volume', desc: 'คำรามทำให้ศัตรูอ่อนแอลง' },
  { id: 'boss-wave', name: 'คลื่นพิโรธ', kind: 'damage', power: 2.1, cost: 0, icon: 'sun', desc: 'ระเบิดคลื่นพลังใส่ทุกคนในทีม' },
];

const DEFAULT_CHARACTERS = [
  {
    id: 'char-ray', name: 'นักสำรวจ — เรย์', image: '/assets/img/ray.png', rarity: 'epic',
    color: '#2F6FED', role: 'นักสำรวจ', hp: 320, atk: 48, def: 26, spd: 22,
    skillId: 'solar-flare', desc: 'นักสำรวจหนุ่มชุดน้ำเงิน-ขาว พร้อมกล้องส่องทางไกล',
  },
  {
    id: 'char-maya', name: 'นักสำรวจ — มายา', image: '/assets/img/maya.png', rarity: 'epic',
    color: '#0F8A5F', role: 'ผู้รักษา', hp: 300, atk: 43, def: 24, spd: 27,
    skillId: 'river-guard', desc: 'นักสำรวจสาวพลังงานสูงชุดเหลือง-เขียว',
  },
  {
    id: 'char-zael', name: 'พ่อมดกลางคืน — ซาเอล', image: '/assets/img/zael.png', rarity: 'legendary',
    color: '#6B4BB0', role: 'จอมเวท', hp: 360, atk: 58, def: 22, spd: 20,
    skillId: 'night-curse', desc: 'พ่อมดลึกลับสหายแมวดำตาเหลือง',
  },
  {
    id: 'char-luna', name: 'พ่อมดแห่งวัด — ลูน่า', image: '/assets/img/luna.png', rarity: 'rare',
    color: '#C4483A', role: 'นักมนตรา', hp: 340, atk: 52, def: 28, spd: 24,
    skillId: 'temple-ward', desc: 'นักมนตราสาวผมขาวชุดแดง-ขาว',
  },
];

const DEFAULT_BOSSES = [
  {
    id: 'boss-wat-arun', name: 'ยักษ์วัดแจ้ง', placeId: 'demo-wat-arun', placeName: 'วัดอรุณราชวราราม',
    lat: 13.7437, lng: 100.4889, level: 5, hp: 540, atk: 52, def: 30, spd: 18,
    model: 'guardian', rarity: 'epic', reward: 120, skillId: 'boss-slam',
    desc: 'ยักษ์เฝ้าพระปรางค์ เรืองแสงทองยามค่ำคืน',
  },
  {
    id: 'boss-yaowarat', name: 'มังกรเยาวราช', placeId: 'demo-yaowarat', placeName: 'ถนนเยาวราช',
    lat: 13.7398, lng: 100.51, level: 7, hp: 620, atk: 60, def: 26, spd: 24,
    model: 'shadow', rarity: 'legendary', reward: 180, skillId: 'boss-wave',
    desc: 'มังกรไฟที่ตื่นขึ้นเมื่อแสงนีออนสว่าง',
  },
  {
    id: 'boss-doi-suthep', name: 'เจ้าเขาดอยสุเทพ', placeId: 'demo-doi-suthep', placeName: 'ดอยสุเทพ',
    lat: 18.8049, lng: 98.9216, level: 9, hp: 720, atk: 66, def: 34, spd: 20,
    model: 'sorceress', rarity: 'legendary', reward: 240, skillId: 'boss-wave',
    desc: 'ภูตแห่งขุนเขาที่ทดสอบนักเดินทาง',
  },
  {
    id: 'boss-ayutthaya', name: 'อสูรอยุธยา', placeId: 'demo-ayutthaya', placeName: 'อุทยานประวัติศาสตร์อยุธยา',
    lat: 14.3532, lng: 100.5685, level: 6, hp: 580, atk: 55, def: 32, spd: 19,
    model: 'guardian', rarity: 'epic', reward: 150, skillId: 'boss-roar',
    desc: 'อสูรหินที่ตื่นขึ้นใต้ซากปรักหักพัง',
  },
  {
    id: 'boss-patong', name: 'นาคแห่งป่าตอง', placeId: 'demo-patong', placeName: 'หาดป่าตอง',
    lat: 7.8965, lng: 98.2966, level: 8, hp: 680, atk: 62, def: 28, spd: 25,
    model: 'wanderer', rarity: 'legendary', reward: 210, skillId: 'boss-wave',
    desc: 'นาคทะเลที่ปกป้องแนวปะการัง',
  },
];

/* ------------------------------- storage -------------------------------- */
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('tc-game-changed', { detail: { key } }));
}

function slug(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/* -------------------------------- skills -------------------------------- */
export function listSkills() {
  return read(KEYS.skills, DEFAULT_SKILLS);
}

export function skillById(id) {
  return listSkills().find(s => s.id === id) || null;
}

export function saveSkill(input) {
  const rows = listSkills().slice();
  const id = input.id || slug('skill');
  const row = { ...input, id };
  const i = rows.findIndex(s => s.id === id);
  if (i >= 0) rows[i] = row; else rows.push(row);
  write(KEYS.skills, rows);
  return row;
}

export function deleteSkill(id) {
  write(KEYS.skills, listSkills().filter(s => s.id !== id));
}

/* ------------------------------ characters ------------------------------ */
export function listCharacters() {
  return read(KEYS.characters, DEFAULT_CHARACTERS);
}

export function characterById(id) {
  return listCharacters().find(c => c.id === id) || null;
}

export function saveCharacter(input) {
  const rows = listCharacters().slice();
  const id = input.id || slug('char');
  const row = { ...input, id };
  const i = rows.findIndex(c => c.id === id);
  if (i >= 0) rows[i] = row; else rows.push(row);
  write(KEYS.characters, rows);
  return row;
}

export function deleteCharacter(id) {
  write(KEYS.characters, listCharacters().filter(c => c.id !== id));
  setTeam(getTeam().filter(x => x !== id));
}

export function ownedIds() {
  return read(KEYS.owned, ['char-ray', 'char-maya']);
}

export function isOwned(id) {
  return ownedIds().includes(id);
}

export function grantCharacter(id) {
  const owned = ownedIds();
  if (!owned.includes(id)) write(KEYS.owned, [...owned, id]);
}

/* -------------------------------- bosses -------------------------------- */
export function listBosses() {
  return read(KEYS.bosses, DEFAULT_BOSSES);
}

export function bossById(id) {
  return listBosses().find(b => b.id === id) || null;
}

export function bossesForPlace(placeId) {
  return listBosses().filter(b => b.placeId === placeId);
}

export function saveBoss(input) {
  const rows = listBosses().slice();
  const id = input.id || slug('boss');
  const row = { ...input, id };
  const i = rows.findIndex(b => b.id === id);
  if (i >= 0) rows[i] = row; else rows.push(row);
  write(KEYS.bosses, rows);
  return row;
}

export function deleteBoss(id) {
  write(KEYS.bosses, listBosses().filter(b => b.id !== id));
}

export function bossModel(id) {
  return BOSS_MODELS.find(m => m.id === id) || BOSS_MODELS[0];
}

/* --------------------------------- team --------------------------------- */
export function getTeam() {
  const team = read(KEYS.team, null);
  if (Array.isArray(team)) return team.filter(id => characterById(id)).slice(0, MAX_TEAM);
  return ownedIds().filter(id => characterById(id)).slice(0, MAX_TEAM);
}

export function setTeam(ids) {
  const clean = [...new Set((ids || []).filter(id => characterById(id)))].slice(0, MAX_TEAM);
  write(KEYS.team, clean);
  return clean;
}

export function toggleTeamMember(id) {
  const team = getTeam();
  if (team.includes(id)) return setTeam(team.filter(x => x !== id));
  if (!isOwned(id)) return team;
  if (team.length >= MAX_TEAM) return setTeam([...team.slice(1), id]);
  return setTeam([...team, id]);
}

/* ------------------------------- progress ------------------------------- */
export function getProgress() {
  return read(KEYS.progress, { xp: 0, wins: 0, tokens: 0, defeated: [], lastBoss: null });
}

export function patchProgress(patch) {
  const next = { ...getProgress(), ...patch };
  write(KEYS.progress, next);
  return next;
}

export function bossDefeated(id) {
  return getProgress().defeated.includes(id);
}

export function recordBossWin(boss, { tokens = 0, xp = 0 } = {}) {
  const p = getProgress();
  const defeated = p.defeated.includes(boss.id) ? p.defeated : [...p.defeated, boss.id];
  const next = {
    ...p,
    defeated,
    wins: p.wins + 1,
    tokens: p.tokens + Number(tokens || 0),
    xp: p.xp + Number(xp || 0),
    lastBoss: boss.id,
  };
  write(KEYS.progress, next);
  if (tokens) grantWalletTokens(tokens);
  return next;
}

export function grantWalletTokens(amount) {
  try {
    const key = 'tc_mobile_tokens';
    const current = Number(localStorage.getItem(key)) || 0;
    const next = current + Number(amount || 0);
    localStorage.setItem(key, String(next));
    window.dispatchEvent(new CustomEvent('tc-tokens', { detail: { tokens: next } }));
  } catch { /* ignore */ }
}

export function playerLevel() {
  const xp = getProgress().xp;
  return { level: Math.floor(xp / 400) + 1, into: xp % 400, need: 400 };
}

export function subscribe(fn) {
  const handler = e => fn(e.detail);
  window.addEventListener('tc-game-changed', handler);
  return () => window.removeEventListener('tc-game-changed', handler);
}

/** Re-seed demo content (admin utility). */
export function resetGameData() {
  [KEYS.characters, KEYS.skills, KEYS.bosses, KEYS.team, KEYS.owned, KEYS.progress]
    .forEach(k => localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent('tc-game-changed', { detail: { key: 'all' } }));
}
