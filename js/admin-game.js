// admin-game.js — admin console for AR game content: characters, bosses and
// skills. Shared by admin.html (desktop) and admin-mobile.html (phone shell).
// Content persists in localStorage through game-data.js so the demo build can
// be edited without a Supabase migration.

import { esc } from './ui.js';
import { icon } from './icons.js';
import {
  BOSS_MODELS, RARITIES, SKILL_KINDS, deleteBoss, deleteCharacter, deleteSkill,
  grantCharacter, isOwned, listBosses, listCharacters, listSkills, resetGameData,
  saveBoss, saveCharacter, saveSkill,
} from './game-data.js';
import { saveBossModelFile } from './boss-model-store.js';

const ICONS = [
  'flame', 'sun', 'heart', 'shield', 'star', 'volume', 'quest', 'coin',
  'trophy', 'leaf', 'map', 'clock', 'warning', 'compass', 'gps', 'book',
];
const KINDS = Object.entries(SKILL_KINDS);
const RARITY_KEYS = Object.keys(RARITIES);

let root = null;
let places = [];
let state = {
  tab: 'characters',
  editing: null, // id being edited, or null for a new row
};

/* ------------------------------- helpers -------------------------------- */
function toast(message) {
  window.dispatchEvent(new CustomEvent('tc-toast', { detail: { message } }));
  const host = document.querySelector('.toast-host') || document.body;
  let el = document.getElementById('agToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'agToast';
    el.className = 'ag-toast';
    host.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-on'), 2400);
}

function field(label, inputHtml, hint = '') {
  return `<label class="ag-field">
    <span class="ag-field__label">${label}</span>
    ${inputHtml}
    ${hint ? `<span class="ag-field__hint">${hint}</span>` : ''}
  </label>`;
}

const num = (name, value, step = 1, min = 0, max = 99999) =>
  `<input class="ag-input" type="number" name="${name}" value="${Number(value) || 0}" step="${step}" min="${min}" max="${max}" required>`;

const text = (name, value, placeholder = '') =>
  `<input class="ag-input" type="text" name="${name}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}" maxlength="120" required>`;

const MODEL_MAX_BYTES = 15 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result);
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a .glb / .gltf file to Supabase Storage and return a public URL.
 * Models must live in storage: a base64 data URL is far bigger than the ~5 MB
 * localStorage quota, so an inlined model is silently dropped when saving and
 * the battle arena keeps showing the 2D sprite instead of the 3D model.
 */
async function uploadBossModel(file) {
  if (file.size > MODEL_MAX_BYTES) {
    throw new Error(`ไฟล์ใหญ่เกิน ${Math.round(MODEL_MAX_BYTES / 1048576)} MB — กรุณาบีบอัดโมเดลก่อนอัปโหลด`);
  }
  const ext = (file.name.split('.').pop() || 'glb').toLowerCase().replace(/[^a-z0-9]/g, '') || 'glb';
  const path = `models/bosses/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    const { supabase } = await import('./supabase.js');
    const { error } = await supabase.storage.from('store-assets').upload(path, file, {
      upsert: true,
      contentType: ext === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary',
    });
    if (error) throw error;
    const publicUrl = supabase.storage.from('store-assets').getPublicUrl(path)?.data?.publicUrl;
    if (!publicUrl) throw new Error('ไม่ได้รับ URL ของโมเดลจาก Storage');
    return publicUrl;
  } catch (err) {
    // Offline/demo fallback: a small model can be inlined as a data URL, larger
    // ones go to IndexedDB (localStorage is far too small to hold them).
    try {
      if (file.size > 0 && file.size <= 1.5 * 1024 * 1024) return await readAsDataUrl(file);
      return await saveBossModelFile(file);
    } catch (storeErr) {
      console.warn('[admin-game] model upload failed:', err, storeErr);
      throw new Error('อัปโหลดโมเดลไม่สำเร็จ — ใช้ URL โมเดลที่โฮสต์ไว้แทน');
    }
  }
}

function rarityOptions(current) {
  return RARITY_KEYS.map(k =>
    `<option value="${k}" ${k === current ? 'selected' : ''}>${esc(RARITIES[k].label)}</option>`).join('');
}

function skillOptions(current) {
  return listSkills().map(s =>
    `<option value="${esc(s.id)}" ${s.id === current ? 'selected' : ''}>${esc(s.name)} · ${esc(SKILL_KINDS[s.kind] || s.kind)}</option>`).join('');
}

function iconOptions(current) {
  return ICONS.map(i => `<option value="${i}" ${i === current ? 'selected' : ''}>${i}</option>`).join('');
}

function placeOptions(currentId) {
  const rows = places.map(p =>
    `<option value="${esc(p.id)}" ${p.id === currentId ? 'selected' : ''}>${esc(p.name)}${p.province ? ` · ${esc(p.province)}` : ''}</option>`).join('');
  return `<option value="">— เลือกสถานที่ —</option>${rows}`;
}

/* -------------------------------- counts --------------------------------- */
function counts() {
  return {
    characters: listCharacters().length,
    bosses: listBosses().length,
    skills: listSkills().length,
  };
}

/* ------------------------------- rendering ------------------------------- */
function renderShell() {
  if (!root) return;
  const c = counts();
  root.innerHTML = `
    <div class="ag">
      <header class="ag-head">
        <div class="ag-head__copy">
          <p class="ag-kicker">AR GAME CONTENT</p>
          <h2>เกม AR — ตัวละคร บอส และสกิล</h2>
          <p class="ag-sub">เพิ่มและแก้ไขตัวละคร บอสประจำสถานที่ พร้อมสกิลเฉพาะตัว ข้อมูลจะแสดงบนแผนที่ AR ทั้งคอมพิวเตอร์และมือถือ</p>
        </div>
        <div class="ag-head__actions">
          <button class="ag-btn ag-btn--ghost" type="button" data-ag-reset>${icon('trash', 14)} คืนค่าเนื้อหาเริ่มต้น</button>
        </div>
      </header>

      <div class="ag-tabs" role="tablist">
        <button class="ag-tab ${state.tab === 'characters' ? 'is-active' : ''}" type="button" data-ag-tab="characters" role="tab">
          ${icon('user', 15)} ตัวละคร <b>${c.characters}</b>
        </button>
        <button class="ag-tab ${state.tab === 'bosses' ? 'is-active' : ''}" type="button" data-ag-tab="bosses" role="tab">
          ${icon('flame', 15)} บอส <b>${c.bosses}</b>
        </button>
        <button class="ag-tab ${state.tab === 'skills' ? 'is-active' : ''}" type="button" data-ag-tab="skills" role="tab">
          ${icon('star', 15)} สกิล <b>${c.skills}</b>
        </button>
      </div>

      <div class="ag-body">
        <div class="ag-list" id="agList"></div>
        <div class="ag-form-card" id="agForm"></div>
      </div>
    </div>`;
  bindShell();
  renderList();
  renderForm();
}

function bindShell() {
  root.querySelectorAll('[data-ag-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.agTab;
      state.editing = null;
      renderShell();
    });
  });
  root.querySelector('[data-ag-reset]')?.addEventListener('click', () => {
    if (!confirm('คืนค่าตัวละคร บอส และสกิลทั้งหมดเป็นชุดเริ่มต้น? การแก้ไขในเครื่องนี้จะหายไป')) return;
    resetGameData();
    state.editing = null;
    renderShell();
    toast('คืนค่าเนื้อหาเกมเริ่มต้นแล้ว');
  });
}

function renderList() {
  const box = root?.querySelector('#agList');
  if (!box) return;
  if (state.tab === 'characters') box.innerHTML = characterList();
  else if (state.tab === 'bosses') box.innerHTML = bossList();
  else box.innerHTML = skillList();
  bindList();
}

function characterList() {
  const rows = listCharacters();
  return `
    <div class="ag-list__head">
      <strong>${rows.length} ตัวละคร</strong>
      <button class="ag-btn ag-btn--mint ag-btn--sm" type="button" data-ag-new>${icon('plus', 13)} เพิ่มตัวละคร</button>
    </div>
    ${rows.map(c => {
      const skill = listSkills().find(s => s.id === c.skillId);
      const owned = isOwned(c.id);
      return `<article class="ag-row ${state.editing === c.id ? 'is-editing' : ''}" style="--tone:${c.color || '#0F8A5F'}">
        <span class="ag-row__media"><img src="${esc(c.image || '')}" alt=""></span>
        <span class="ag-row__body">
          <strong>${esc(c.name)}</strong>
          <span>${esc(c.role || 'นักเดินทาง')} · ${esc(RARITIES[c.rarity]?.label || c.rarity || '')}</span>
          <span class="ag-row__meta">${icon(skill?.icon || 'star', 11)} ${esc(skill?.name || 'ไม่มีสกิล')} · HP ${Number(c.hp || 0)} · ATK ${Number(c.atk || 0)}</span>
        </span>
        <span class="ag-row__badge ${owned ? 'is-owned' : ''}">${owned ? 'ปลดล็อกแล้ว' : 'ยังไม่ปลดล็อก'}</span>
        <span class="ag-row__actions">
          ${owned ? '' : `<button class="ag-ico" type="button" data-ag-grant="${esc(c.id)}" title="ปลดล็อกให้ผู้เล่น">${icon('lock', 13)}</button>`}
          <button class="ag-ico" type="button" data-ag-edit="${esc(c.id)}" title="แก้ไข">${icon('edit', 13)}</button>
          <button class="ag-ico ag-ico--danger" type="button" data-ag-del="${esc(c.id)}" title="ลบ">${icon('trash', 13)}</button>
        </span>
      </article>`;
    }).join('') || `<p class="ag-empty">ยังไม่มีตัวละคร — กด “เพิ่มตัวละคร”</p>`}`;
}

function bossList() {
  const rows = listBosses();
  return `
    <div class="ag-list__head">
      <strong>${rows.length} บอส</strong>
      <button class="ag-btn ag-btn--mint ag-btn--sm" type="button" data-ag-new>${icon('plus', 13)} เพิ่มบอส</button>
    </div>
    ${rows.map(b => {
      const model = BOSS_MODELS.find(m => m.id === b.model) || BOSS_MODELS[0];
      const skill = listSkills().find(s => s.id === b.skillId);
      return `<article class="ag-row ${state.editing === b.id ? 'is-editing' : ''}" style="--tone:${model.tint}">
        <span class="ag-row__media"><img src="${esc(model.image)}" alt=""></span>
        <span class="ag-row__body">
          <strong>${esc(b.name)}</strong>
          <span>${icon('pin', 10)} ${esc(b.placeName || 'ไม่ระบุสถานที่')} · Lv.${Number(b.level || 1)}</span>
          <span class="ag-row__meta">${icon(skill?.icon || 'flame', 11)} ${esc(skill?.name || 'โจมตี')} · ${icon('coin', 11)} +${Number(b.reward || 0)}</span>
        </span>
        <span class="ag-row__badge is-owned">${esc(model.name)}</span>
        <span class="ag-row__actions">
          <button class="ag-ico" type="button" data-ag-edit="${esc(b.id)}" title="แก้ไข">${icon('edit', 13)}</button>
          <button class="ag-ico ag-ico--danger" type="button" data-ag-del="${esc(b.id)}" title="ลบ">${icon('trash', 13)}</button>
        </span>
      </article>`;
    }).join('') || `<p class="ag-empty">ยังไม่มีบอส — กด “เพิ่มบอส”</p>`}`;
}

function skillList() {
  const rows = listSkills();
  return `
    <div class="ag-list__head">
      <strong>${rows.length} สกิล</strong>
      <button class="ag-btn ag-btn--mint ag-btn--sm" type="button" data-ag-new>${icon('plus', 13)} เพิ่มสกิล</button>
    </div>
    ${rows.map(s => `
      <article class="ag-row ${state.editing === s.id ? 'is-editing' : ''}" style="--tone:#A97400">
        <span class="ag-row__media ag-row__media--ico">${icon(s.icon || 'star', 20)}</span>
        <span class="ag-row__body">
          <strong>${esc(s.name)}</strong>
          <span>${esc(SKILL_KINDS[s.kind] || s.kind)} · พลัง ×${Number(s.power || 1)}</span>
          <span class="ag-row__meta">${esc(s.desc || '')}</span>
        </span>
        <span class="ag-row__badge">${Number(s.cost || 0)} พลัง</span>
        <span class="ag-row__actions">
          <button class="ag-ico" type="button" data-ag-edit="${esc(s.id)}" title="แก้ไข">${icon('edit', 13)}</button>
          <button class="ag-ico ag-ico--danger" type="button" data-ag-del="${esc(s.id)}" title="ลบ">${icon('trash', 13)}</button>
        </span>
      </article>`).join('') || `<p class="ag-empty">ยังไม่มีสกิล — กด “เพิ่มสกิล”</p>`}`;
}

function bindList() {
  root.querySelectorAll('[data-ag-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editing = btn.dataset.agEdit;
      renderList();
      renderForm();
      root.querySelector('#agForm')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
  root.querySelectorAll('[data-ag-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.agDel;
      if (!confirm('ลบรายการนี้?')) return;
      if (state.tab === 'characters') deleteCharacter(id);
      else if (state.tab === 'bosses') deleteBoss(id);
      else deleteSkill(id);
      if (state.editing === id) state.editing = null;
      renderShell();
      toast('ลบรายการแล้ว');
    });
  });
  root.querySelectorAll('[data-ag-grant]').forEach(btn => {
    btn.addEventListener('click', () => {
      grantCharacter(btn.dataset.agGrant);
      renderShell();
      toast('ปลดล็อกตัวละครให้ผู้เล่นแล้ว');
    });
  });
  root.querySelectorAll('[data-ag-new]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editing = null;
      renderList();
      renderForm();
      root.querySelector('#agForm')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

/* --------------------------------- forms --------------------------------- */
function renderForm() {
  const box = root?.querySelector('#agForm');
  if (!box) return;
  if (state.tab === 'characters') box.innerHTML = characterForm();
  else if (state.tab === 'bosses') box.innerHTML = bossForm();
  else box.innerHTML = skillForm();
  bindForm();
}

function characterForm() {
  const row = state.editing ? listCharacters().find(c => c.id === state.editing) : null;
  const d = row || {
    name: '', role: '', rarity: 'rare', color: '#0F8A5F', image: '/assets/img/ray.png',
    hp: 320, atk: 48, def: 26, spd: 22, skillId: listSkills()[0]?.id, desc: '',
  };
  return `
    <form class="ag-form" data-ag-form="character" novalidate>
      <div class="ag-form__head">
        <h3>${row ? 'แก้ไขตัวละคร' : 'เพิ่มตัวละครใหม่'}</h3>
        ${row ? `<button class="ag-btn ag-btn--ghost ag-btn--sm" type="button" data-ag-cancel>ยกเลิก</button>` : ''}
      </div>
      <input type="hidden" name="id" value="${esc(row?.id || '')}">
      <div class="ag-preview" style="--tone:${esc(d.color || '#0F8A5F')}">
        <img src="${esc(d.image || '')}" alt="" data-ag-preview-img>
        <span>${esc(d.name || 'ตัวอย่างตัวละคร')}</span>
      </div>

      <div class="ag-grid">
        ${field('ชื่อตัวละคร *', text('name', d.name, 'เช่น นักสำรวจ — เรย์'))}
        ${field('บทบาท', text('role', d.role, 'เช่น ผู้รักษา / จอมเวท'))}
        ${field('ระดับหายาก', `<select class="ag-input" name="rarity">${rarityOptions(d.rarity)}</select>`)}
        ${field('สีประจำตัว', `<input class="ag-input ag-input--color" type="color" name="color" value="${esc(d.color || '#0F8A5F')}">`)}
      </div>

      ${field('รูปตัวละคร (URL)', `<input class="ag-input" type="text" name="image" value="${esc(d.image || '')}" placeholder="/assets/img/ray.png" required>`)}

      <div class="ag-grid ag-grid--4">
        ${field('HP', num('hp', d.hp, 1, 1, 9999))}
        ${field('ATK', num('atk', d.atk, 1, 1, 999))}
        ${field('DEF', num('def', d.def, 1, 0, 999))}
        ${field('SPD', num('spd', d.spd, 1, 0, 999))}
      </div>

      ${field('สกิลประจำตัว', `<select class="ag-input" name="skillId">${skillOptions(d.skillId)}</select>`)}
      ${field('คำอธิบาย', `<textarea class="ag-input ag-textarea" name="desc" rows="2" maxlength="300">${esc(d.desc || '')}</textarea>`)}

      <div class="ag-form__actions">
        <button class="ag-btn ag-btn--mint" type="submit">${icon('check', 14)} ${row ? 'บันทึกการแก้ไข' : 'เพิ่มตัวละคร'}</button>
      </div>
    </form>`;
}

function bossForm() {
  const row = state.editing ? listBosses().find(b => b.id === state.editing) : null;
  const d = row || {
    name: '', placeId: places[0]?.id || '', placeName: places[0]?.name || '',
    lat: places[0]?.lat || 13.7563, lng: places[0]?.lng || 100.5018,
    level: 5, hp: 540, atk: 52, def: 30, spd: 18, model: 'guardian',
    rarity: 'epic', reward: 120, skillId: listSkills().find(s => s.kind === 'damage')?.id, desc: '',
  };
  const model = BOSS_MODELS.find(m => m.id === d.model) || BOSS_MODELS[0];
  return `
    <form class="ag-form" data-ag-form="boss" novalidate>
      <div class="ag-form__head">
        <h3>${row ? 'แก้ไขบอส' : 'เพิ่มบอสใหม่'}</h3>
        ${row ? `<button class="ag-btn ag-btn--ghost ag-btn--sm" type="button" data-ag-cancel>ยกเลิก</button>` : ''}
      </div>
      <input type="hidden" name="id" value="${esc(row?.id || '')}">
      <div class="ag-preview" style="--tone:${model.tint}">
        <img src="${esc(model.image)}" alt="" data-ag-preview-img>
        <span>${esc(d.name || 'ตัวอย่างบอส')}</span>
      </div>

      ${field('ชื่อบอส *', text('name', d.name, 'เช่น ยักษ์วัดแจ้ง'))}
      ${field('สถานที่ประจำบอส *', `<select class="ag-input" name="placeId">${placeOptions(d.placeId)}</select>`, 'พิกัดจะถูกเติมอัตโนมัติจากสถานที่ที่เลือก')}

      <div class="ag-grid">
        ${field('ละติจูด *', `<input class="ag-input" type="number" name="lat" step="any" value="${Number(d.lat)}" required>`)}
        ${field('ลองจิจูด *', `<input class="ag-input" type="number" name="lng" step="any" value="${Number(d.lng)}" required>`)}
      </div>

      <p class="ag-label">โมเดลบอส (รองรับโมเดล 3D)</p>
      <div class="ag-models" role="radiogroup" aria-label="โมเดลบอส">
        ${BOSS_MODELS.map(m => `
          <label class="ag-model ${m.id === d.model ? 'is-on' : ''}" style="--tone:${m.tint}">
            <input type="radio" name="model" value="${m.id}" ${m.id === d.model ? 'checked' : ''}>
            <img src="${esc(m.image)}" alt="">
            <span>${esc(m.name)}</span>
          </label>`).join('')}
      </div>

      ${field('ไฟล์/URL โมเดล 3D (.glb / .gltf)', `<input class="ag-input" type="text" name="modelUrl" value="${esc(d.modelUrl || '')}" placeholder="https://.../boss.glb หรืออัปโหลดไฟล์ด้านล่าง">`, 'รองรับโมเดล 3D สำหรับแสดงผลในลานประลอง AR แบบ Turn-based')}
      <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <label class="ag-btn ag-btn--ghost ag-btn--sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          ${icon('upload', 14)} อัปโหลดไฟล์โมเดล 3D (.glb)
          <input type="file" accept=".glb,.gltf" id="agModelUpload" style="display:none">
        </label>
        <span id="agUploadStatus" style="font-size:11px;color:#64748B;">${d.modelUrl ? '✓ มีไฟล์โมเดล 3D พร้อมแสดงผล' : 'รอการอัปโหลดไฟล์โมเดล 3D (ระบบจะใช้เอฟเฟกต์ 3D มาตรฐาน)'}</span>
      </div>

      <div class="ag-grid ag-grid--4">
        ${field('เลเวล', num('level', d.level, 1, 1, 99))}
        ${field('HP', num('hp', d.hp, 1, 1, 99999))}
        ${field('ATK', num('atk', d.atk, 1, 1, 999))}
        ${field('DEF', num('def', d.def, 1, 0, 999))}
      </div>
      <div class="ag-grid">
        ${field('SPD', num('spd', d.spd, 1, 0, 999))}
        ${field('รางวัลโทเคน', num('reward', d.reward, 1, 0, 9999))}
        ${field('ระดับหายาก', `<select class="ag-input" name="rarity">${rarityOptions(d.rarity)}</select>`)}
      </div>

      ${field('สกิลประจำบอส', `<select class="ag-input" name="skillId">${skillOptions(d.skillId)}</select>`)}
      ${field('คำอธิบาย', `<textarea class="ag-input ag-textarea" name="desc" rows="2" maxlength="300">${esc(d.desc || '')}</textarea>`)}

      <div class="ag-form__actions">
        <button class="ag-btn ag-btn--mint" type="submit">${icon('check', 14)} ${row ? 'บันทึกการแก้ไข' : 'เพิ่มบอส'}</button>
      </div>
    </form>`;
}

function skillForm() {
  const row = state.editing ? listSkills().find(s => s.id === state.editing) : null;
  const d = row || { name: '', kind: 'damage', power: 1.5, cost: 2, icon: 'flame', desc: '' };
  return `
    <form class="ag-form" data-ag-form="skill" novalidate>
      <div class="ag-form__head">
        <h3>${row ? 'แก้ไขสกิล' : 'เพิ่มสกิลใหม่'}</h3>
        ${row ? `<button class="ag-btn ag-btn--ghost ag-btn--sm" type="button" data-ag-cancel>ยกเลิก</button>` : ''}
      </div>
      <input type="hidden" name="id" value="${esc(row?.id || '')}">

      ${field('ชื่อสกิล *', text('name', d.name, 'เช่น แสงสุริยะ'))}
      ${field('ชนิดสกิล', `<select class="ag-input" name="kind">${KINDS.map(([k, label]) =>
        `<option value="${k}" ${k === d.kind ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`,
        'โจมตี/ลดพลัง = สร้างความเสียหาย · ฟื้นฟู = ฮีล · เสริมพลัง = โล่')}
      <div class="ag-grid ag-grid--4">
        ${field('พลัง (ตัวคูณ)', num('power', d.power, 0.1, 0, 9))}
        ${field('ใช้พลัง', num('cost', d.cost, 1, 0, 3))}
        ${field('ไอคอน', `<select class="ag-input" name="icon">${iconOptions(d.icon)}</select>`)}
        <div class="ag-field ag-field--preview">
          <span class="ag-field__label">ตัวอย่าง</span>
          <span class="ag-ico-preview" data-ag-icon-preview>${icon(d.icon, 20)}</span>
        </div>
      </div>
      ${field('คำอธิบาย', `<textarea class="ag-input ag-textarea" name="desc" rows="2" maxlength="200">${esc(d.desc || '')}</textarea>`)}

      <div class="ag-form__actions">
        <button class="ag-btn ag-btn--mint" type="submit">${icon('check', 14)} ${row ? 'บันทึกการแก้ไข' : 'เพิ่มสกิล'}</button>
      </div>
    </form>`;
}

function bindForm() {
  const form = root.querySelector('[data-ag-form]');
  if (!form) return;

  root.querySelector('[data-ag-cancel]')?.addEventListener('click', () => {
    state.editing = null;
    renderList();
    renderForm();
  });

  // live preview for character image / name
  form.querySelector('[name="image"]')?.addEventListener('input', e => {
    const img = form.querySelector('[data-ag-preview-img]');
    if (img) img.src = e.target.value;
  });
  form.querySelector('[name="name"]')?.addEventListener('input', e => {
    const label = form.querySelector('.ag-preview span');
    if (label) label.textContent = e.target.value || (state.tab === 'bosses' ? 'ตัวอย่างบอส' : 'ตัวอย่างตัวละคร');
  });
  // model picker highlight
  form.querySelectorAll('.ag-model input').forEach(radio => {
    radio.addEventListener('change', () => {
      form.querySelectorAll('.ag-model').forEach(el => el.classList.toggle('is-on', el.contains(radio) && radio.checked));
      const img = form.querySelector('[data-ag-preview-img]');
      const chosen = BOSS_MODELS.find(m => m.id === radio.value);
      if (img && chosen) img.src = chosen.image;
    });
  });
  // place select fills coordinates
  form.querySelector('[name="placeId"]')?.addEventListener('change', e => {
    const p = places.find(x => x.id === e.target.value);
    if (!p) return;
    const lat = form.querySelector('[name="lat"]');
    const lng = form.querySelector('[name="lng"]');
    if (lat && Number.isFinite(Number(p.lat))) lat.value = p.lat;
    if (lng && Number.isFinite(Number(p.lng))) lng.value = p.lng;
  });
  // skill icon preview
  form.querySelector('[name="icon"]')?.addEventListener('change', e => {
    const prev = form.querySelector('[data-ag-icon-preview]');
    if (prev) prev.innerHTML = icon(e.target.value, 20);
  });

  // 3D Model File Upload handler (.glb / .gltf)
  const uploadInput = form.querySelector('#agModelUpload');
  if (uploadInput) {
    uploadInput.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const status = form.querySelector('#agUploadStatus');
      const urlInput = form.querySelector('[name="modelUrl"]');
      if (status) status.textContent = `กำลังอัปโหลด ${file.name} (${(file.size / 1048576).toFixed(1)} MB)...`;
      try {
        const url = await uploadBossModel(file);
        if (urlInput) urlInput.value = url;
        if (status) status.textContent = `✓ อัปโหลดสำเร็จ: ${file.name} พร้อมแสดงผล 3D`;
        toast(`อัปโหลดโมเดล 3D (${file.name}) เรียบร้อย`);
      } catch (err) {
        console.warn('[admin-game] model upload failed:', err);
        if (status) status.textContent = `❌ ${err?.message || 'อัปโหลดโมเดลไม่สำเร็จ'}`;
        toast(err?.message || 'อัปโหลดโมเดลไม่สำเร็จ');
      }
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (state.tab === 'characters') {
      if (!String(data.name || '').trim()) return toast('ใส่ชื่อตัวละครก่อน');
      saveCharacter({
        id: data.id || undefined,
        name: String(data.name).trim(),
        role: String(data.role || '').trim(),
        rarity: data.rarity,
        color: data.color,
        image: String(data.image || '').trim(),
        hp: Number(data.hp) || 300,
        atk: Number(data.atk) || 40,
        def: Number(data.def) || 20,
        spd: Number(data.spd) || 20,
        skillId: data.skillId,
        desc: String(data.desc || '').trim(),
      });
      toast('บันทึกตัวละครแล้ว');
    } else if (state.tab === 'bosses') {
      if (!String(data.name || '').trim()) return toast('ใส่ชื่อบอสก่อน');
      const place = places.find(p => p.id === data.placeId);
      try {
        saveBoss({
          id: data.id || undefined,
          name: String(data.name).trim(),
          placeId: data.placeId || '',
          placeName: place?.name || 'สถานที่',
          lat: Number(data.lat),
          lng: Number(data.lng),
          level: Number(data.level) || 1,
          hp: Number(data.hp) || 500,
          atk: Number(data.atk) || 50,
          def: Number(data.def) || 25,
          spd: Number(data.spd) || 20,
          model: data.model,
          modelUrl: String(data.modelUrl || '').trim(),
          is3d: true,
          rarity: data.rarity,
          reward: Number(data.reward) || 100,
          skillId: data.skillId,
          desc: String(data.desc || '').trim(),
        });
        toast('บันทึกบอสแล้ว — หมุดจะปรากฏบนแผนที่');
      } catch (err) {
        console.warn('[admin-game] saveBoss failed:', err);
        toast(err?.message || 'บันทึกบอสไม่สำเร็จ');
        return;
      }
    } else {
      if (!String(data.name || '').trim()) return toast('ใส่ชื่อสกิลก่อน');
      saveSkill({
        id: data.id || undefined,
        name: String(data.name).trim(),
        kind: data.kind,
        power: Number(data.power) || 1,
        cost: Number(data.cost) || 0,
        icon: data.icon,
        desc: String(data.desc || '').trim(),
      });
      toast('บันทึกสกิลแล้ว');
    }
    state.editing = null;
    renderShell();
  });
}

/* --------------------------------- boot ---------------------------------- */
export async function initAdminGame() {
  root = document.getElementById('adminGameRoot');
  if (!root) return;
  try {
    const { fetchPlaces } = await import('./mobile-data.js');
    places = await fetchPlaces();
  } catch {
    places = [];
  }
  renderShell();
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminGame();
});
