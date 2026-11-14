// journal-mobile.js — moods, travel notes, calendar, and completed quest log.

import { esc, toast, confirmDialog } from './ui.js';
import { icon, iconFor } from './icons.js';
import {
  fetchPlaces, DEMO_QUESTS, completedQuests, readJSON, writeJSON, getPlace,
} from './mobile-data.js';
import { confetti } from './mobile-app.js';

const $ = id => document.getElementById(id);
const JOURNAL_KEY = 'tc_mobile_journal';
const QUEST_LOG_KEY = 'tc_mobile_quest_log';
const STAR_KEY = 'tc_mobile_star_days';

const MOODS = [
  { id: 'happy', icon: 'smile', label: 'มีความสุข' },
  { id: 'excited', icon: 'star', label: 'ตื่นเต้น' },
  { id: 'love', icon: 'heart', label: 'ประทับใจ' },
  { id: 'calm', icon: 'sun', label: 'สงบใจ' },
  { id: 'tired', icon: 'clock', label: 'เหนื่อยแต่คุ้ม' },
  { id: 'adventure', icon: 'compass', label: 'ผจญภัย' },
];

let places = [];
let mood = 'happy';
let filter = 'all';

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function entries() {
  return readJSON(JOURNAL_KEY, []).sort((a, b) => b.at - a.at);
}

function questLog() {
  return readJSON(QUEST_LOG_KEY, []);
}

function moodOf(id) {
  return MOODS.find(m => m.id === id) || MOODS[0];
}

function renderMoods() {
  const box = $('jrMoods');
  if (!box) return;
  box.innerHTML = MOODS.map(m => `
    <button class="jr-mood ${m.id === mood ? 'is-active' : ''}" type="button" data-mood="${m.id}" aria-pressed="${m.id === mood}">
      <span class="emoji">${icon(m.icon, 16)}</span>${esc(m.label)}
    </button>`).join('');
  box.querySelectorAll('[data-mood]').forEach(btn => {
    btn.addEventListener('click', () => {
      mood = btn.dataset.mood;
      renderMoods();
    });
  });
}

function renderPlaceOptions() {
  const sel = $('jrPlace');
  if (!sel) return;
  const groups = new Map();
  places.forEach(p => {
    if (!p.province) return;
    if (!groups.has(p.province)) groups.set(p.province, []);
    groups.get(p.province).push(p);
  });
  sel.innerHTML = `<option value="">ไม่ระบุสถานที่</option>` +
    [...groups.entries()].map(([province, list]) => `
      <optgroup label="${esc(province)}">
        ${list.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}
      </optgroup>`).join('');

  const wanted = new URLSearchParams(location.search).get('placeId');
  if (wanted && [...sel.options].some(o => o.value === wanted)) sel.value = wanted;
}

function renderStats() {
  const box = $('jrStats');
  if (!box) return;
  const list = entries();
  const provinces = new Set(list.map(e => e.province).filter(Boolean));
  const done = completedQuests().size;
  box.innerHTML = `
    <div class="jr-stat"><b>${list.length}</b><span>บันทึก</span></div>
    <div class="jr-stat"><b>${provinces.size}</b><span>จังหวัดที่เล่า</span></div>
    <div class="jr-stat"><b>${done}</b><span>เควสท์พิชิต</span></div>`;
}

function renderCalendar() {
  const box = $('jrCal');
  if (!box) return;
  const list = entries();
  const logs = questLog();
  const stars = readJSON(STAR_KEY, []);
  const entryDays = new Set(list.map(e => dayKey(new Date(e.at))));
  const questDays = new Set(logs.map(l => dayKey(new Date(l.at))));
  const today = dayKey();

  box.innerHTML = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const key = dayKey(d);
    const hasEntry = entryDays.has(key);
    const hasQuest = questDays.has(key) || stars.includes(key);
    const classes = [
      'jr-cal__day',
      d.getDay() === 0 ? 'is-sun' : '',
      hasEntry ? 'has-entry' : '',
      hasQuest && !hasEntry ? 'has-quest' : '',
      key === today ? 'is-today' : '',
    ].filter(Boolean).join(' ');
    const label = hasEntry ? 'มีบันทึก' : hasQuest ? 'มีกิจกรรม' : 'ไม่มีกิจกรรม';
    return `<span class="${classes}" title="${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · ${label}">
      ${d.getDate()}${hasEntry || hasQuest ? '<i></i>' : ''}
    </span>`;
  }).join('');
}

function questEntries() {
  const done = completedQuests();
  const logMap = new Map(questLog().map(l => [l.questId, l]));
  return DEMO_QUESTS.filter(q => done.has(q.id)).map(q => {
    const l = logMap.get(q.id);
    return {
      id: `quest-${q.id}`,
      questId: q.id,
      type: 'quest',
      at: l?.at || 0,
      photo: l?.photo || null,
      caption: l?.caption || null,
      distance: l?.distance || null,
      title: q.title,
      note: l?.caption || q.summary,
      placeId: q.placeId,
      placeName: q.placeName,
      province: q.province,
      reward: q.reward,
      emoji: q.emoji || q.icon || 'quest',
    };
  });
}

function journalEntries() {
  return entries().map(e => ({ ...e, type: 'journal' }));
}

function entryHTML(e) {
  if (e.type === 'quest') {
    const date = e.at ? new Date(e.at) : null;
    return `
      <article class="jr-entry jr-entry--quest">
        <div class="jr-entry__date">
          <b>${date ? date.getDate() : icon('check', 14)}</b>
          <span>${date ? date.toLocaleDateString('th-TH', { month: 'short' }) : 'สำเร็จ'}</span>
        </div>
        <div class="jr-entry__body">
          <h3>${icon('quest', 15)} ${esc(e.title)}</h3>
          <p>${esc(e.note || '')}</p>
          ${e.photo ? `
            <div class="jr-entry__photo" style="margin:10px 0 6px;border-radius:14px;overflow:hidden;max-height:160px;border:1px solid var(--line);box-shadow:var(--shadow-1)">
              <img src="${esc(e.photo)}" alt="รูปถ่ายเช็คอิน" style="width:100%;height:100%;object-fit:cover;display:block">
            </div>
          ` : ''}
          <div class="jr-entry__meta">
            <span>${icon('pin', 11)} ${esc(e.placeName || e.province || 'สถานที่')}</span>
            <span class="g-coin">${icon('coin', 11)} +${Number(e.reward || 0)}</span>
            <span class="g-chip g-chip--mint" style="font-size:9.5px;padding:2px 7px">${icon('compass', 10)} GPS ยืนยันแล้ว</span>
          </div>
        </div>
        <div class="jr-entry__side">
          <span class="jr-entry__mood">${icon('trophy', 20)}</span>
          <a class="jr-entry__link" href="/place-mobile.html?id=${encodeURIComponent(e.placeId || '')}">ดู</a>
        </div>
      </article>`;
  }
  const date = new Date(e.at);
  const m = moodOf(e.mood);
  return `
    <article class="jr-entry" data-entry="${esc(e.id)}">
      <div class="jr-entry__date">
        <b>${date.getDate()}</b>
        <span>${date.toLocaleDateString('th-TH', { month: 'short' })}</span>
      </div>
      <div class="jr-entry__body">
        <h3>${esc(e.title || 'บันทึกการเดินทาง')}</h3>
        <p>${esc(e.note)}</p>
        <div class="jr-entry__meta">
          ${e.placeName ? `<span>${icon('pin', 11)} ${esc(e.placeName)}</span>` : ''}
          ${e.province ? `<span>${icon('map', 11)} ${esc(e.province)}</span>` : ''}
          <span>${icon('clock', 11)} ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      <div class="jr-entry__side">
        <span class="jr-entry__mood" title="${esc(m.label)}">${icon(m.icon || 'smile', 18)}</span>
        <button class="jr-entry__del" type="button" data-del="${esc(e.id)}" aria-label="ลบบันทึก">${icon('trash', 12)}</button>
      </div>
    </article>`;
}

function renderList() {
  const box = $('jrList');
  if (!box) return;
  const journals = journalEntries();
  const quests = questEntries();
  const rows = filter === 'journal' ? journals
    : filter === 'quest' ? quests
    : [...journals, ...quests].sort((a, b) => (b.at || 0) - (a.at || 0));

  if (!rows.length) {
    box.innerHTML = `
      <div class="jr-empty">
        <span class="emoji">${icon(filter === 'quest' ? 'quest' : 'journal', 30)}</span>
        <h3>${filter === 'quest' ? 'ยังไม่มีเควสท์ที่พิชิต' : 'ยังไม่มีบันทึก'}</h3>
        <p>${filter === 'quest' ? 'ไปทำเควสท์แรก แล้วเรื่องราวจะถูกบันทึกที่นี่' : 'เริ่มเขียนความทรงจำแรกจากทริปของคุณด้านบน'}</p>
        <a class="g-btn g-btn--sm g-btn--ghost" href="${filter === 'quest' ? '/quests-mobile.html' : '/explore-mobile.html'}">${filter === 'quest' ? 'หาเควสท์' : 'เปิดแผนที่'}</a>
      </div>`;
    return;
  }

  box.innerHTML = rows.map(entryHTML).join('');

  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'ลบบันทึกนี้?',
        message: 'เรื่องราวนี้จะถูกลบออกจากไดอารี่ของคุณ',
        confirmLabel: 'ลบบันทึก',
        danger: true,
      });
      if (!ok) return;
      writeJSON(JOURNAL_KEY, entries().filter(e => e.id !== btn.dataset.del));
      toast('ลบบันทึกแล้ว');
      renderAll();
    });
  });
}

function renderAll() {
  renderStats();
  renderCalendar();
  renderList();
}

function saveEntry(event) {
  event.preventDefault();
  const title = ($('jrTitle')?.value || '').trim();
  const note = ($('jrNote')?.value || '').trim();
  if (!title && !note) {
    toast('เขียนหัวข้อหรือเรื่องเล่าสักหน่อยนะ', 'error');
    $('jrTitle')?.focus();
    return;
  }
  const placeId = $('jrPlace')?.value || '';
  const place = placeId ? getPlace(placeId) : null;
  const list = entries();
  list.unshift({
    id: `jr-${Date.now()}`,
    at: Date.now(),
    mood,
    title: title || 'บันทึกการเดินทาง',
    note,
    placeId,
    placeName: place?.name || '',
    province: place?.province || '',
  });
  writeJSON(JOURNAL_KEY, list.slice(0, 200));
  $('jrTitle').value = '';
  $('jrNote').value = '';
  confetti(16);
  toast('บันทึกเรื่องราวแล้ว');
  renderAll();
}

function setFilter(next) {
  filter = next;
  document.querySelectorAll('[data-filter]').forEach(btn => {
    const active = btn.dataset.filter === filter;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  renderList();
}

async function boot() {
  places = await fetchPlaces();
  renderMoods();
  renderPlaceOptions();
  renderAll();

  $('jrForm')?.addEventListener('submit', saveEntry);
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });
  window.addEventListener('tc-quest-done', renderAll);
  window.addEventListener('tc-tokens', renderAll);

  if (location.hash === '#calendar') {
    setTimeout(() => $('jrCalendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }
}

document.addEventListener('DOMContentLoaded', boot);
