// collection-mobile.js — characters, medals, and province stamps.

import { esc, toast } from './ui.js';
import { icon, iconFor } from './icons.js';
import {
  CHARACTERS, PRESETS, DEMO_QUESTS,
  fetchPlaces, readJSON, saveOutfit, loadOutfit,
  completedQuests, favoritePlaces,
} from './mobile-data.js';
import { formatNum, confetti } from './mobile-app.js';

const $ = id => document.getElementById(id);
const OWNED_KEY = 'tc_mobile_owned_chars';
const STAR_KEY = 'tc_mobile_star_days';

let places = [];
let outfit = loadOutfit();

function ownedChars() {
  const free = CHARACTERS.filter(c => !c.cost).map(c => c.id);
  return new Set([...free, ...readJSON(OWNED_KEY, [])]);
}

function presetIdFor(charId) {
  return String(charId).replace(/^char-/, '');
}

function visitedProvinces() {
  const done = completedQuests();
  const favs = favoritePlaces();
  const set = new Set();
  DEMO_QUESTS.forEach(q => { if (done.has(q.id) && q.province) set.add(q.province); });
  places.forEach(p => { if (favs.has(p.id) && p.province) set.add(p.province); });
  return set;
}

function medals(owned, visited) {
  const done = completedQuests();
  const favs = favoritePlaces();
  const countType = type => DEMO_QUESTS.filter(q => q.type === type && done.has(q.id)).length;
  const provinceTotal = [...new Set(places.map(p => p.province).filter(Boolean))].length || 1;
  return [
    { id: 'first', icon: 'boot', name: 'ก้าวแรกนักสำรวจ', desc: 'ทำเควสท์แรกสำเร็จ', value: done.size, target: 1 },
    { id: 'five', icon: 'quest', name: 'นักล่าเควสท์', desc: 'ทำเควสท์สำเร็จ 5 รายการ', value: done.size, target: 5 },
    { id: 'photo', icon: 'camera', name: 'ช่างภาพนักเดินทาง', desc: 'ทำเควสท์ถ่ายภาพ 3 รายการ', value: countType('photo'), target: 3 },
    { id: 'culture', icon: 'building', name: 'ผู้พิทักษ์วัฒนธรรม', desc: 'ทำเควสท์วัฒนธรรม 2 รายการ', value: countType('culture'), target: 2 },
    { id: 'nature', icon: 'leaf', name: 'เพื่อนของธรรมชาติ', desc: 'ทำเควสท์ธรรมชาติ 2 รายการ', value: countType('nature'), target: 2 },
    { id: 'fav', icon: 'heart', name: 'นักสะสมสถานที่', desc: 'บันทึกสถานที่โปรด 3 แห่ง', value: favs.size, target: 3 },
    { id: 'prov3', icon: 'map', name: 'นักเดินทางสามจังหวัด', desc: 'เก็บตราประทับ 3 จังหวัด', value: visited.size, target: 3 },
    { id: 'provAll', icon: 'map', name: 'ทั่วไทยในแผนที่', desc: `เก็บตราประทับครบ ${provinceTotal} จังหวัด`, value: visited.size, target: provinceTotal },
    { id: 'collector', icon: 'user', name: 'นักสะสมตัวละคร', desc: 'ปลดล็อกตัวละครครบทุกคน', value: owned.size, target: CHARACTERS.length },
    { id: 'star', icon: 'star', name: 'ดาวนำทาง 7 วัน', desc: 'เช็คอินดาวประจำวัน 7 ครั้ง', value: readJSON(STAR_KEY, []).length, target: 7 },
  ].map(m => ({ ...m, done: m.value >= m.target, pct: Math.min(100, Math.round((m.value / m.target) * 100)) }));
}

function renderHero(owned, visited, medalList) {
  const doneMedals = medalList.filter(m => m.done).length;
  const score = owned.size * 120 + doneMedals * 80 + visited.size * 50;
  const lv = Math.max(1, Math.floor(score / 400) + 1);
  $('clScore').textContent = formatNum(score);
  $('clRank').textContent = `Lv.${lv}`;
  $('clHeroMedal').innerHTML = icon('trophy', 22);
  $('clScoreNote').textContent = doneMedals
    ? `ปลดล็อกแล้ว ${doneMedals}/${medalList.length} เหรียญตรา`
    : 'เริ่มสะสมได้จากเควสท์แรกของคุณ';

  $('clStats').innerHTML = `
    <div class="cl-stat"><b>${owned.size}/${CHARACTERS.length}</b><span>ตัวละคร</span></div>
    <div class="cl-stat"><b>${doneMedals}/${medalList.length}</b><span>เหรียญตรา</span></div>
    <div class="cl-stat"><b>${visited.size}/${new Set(places.map(p => p.province)).size}</b><span>จังหวัด</span></div>`;
}

function renderChars() {
  const box = $('clChars');
  if (!box) return;
  const owned = ownedChars();
  box.innerHTML = CHARACTERS.map(c => {
    const id = presetIdFor(c.id);
    const isOwned = owned.has(c.id);
    const equipped = isOwned && outfit.preset === id;
    const charIcon = c.rarity === 'legendary' ? 'user' : 'compass';
    return `
      <article class="cl-char ${isOwned ? '' : 'is-locked'} ${equipped ? 'is-equipped' : ''}" style="--char-glow:${c.color}33">
        ${equipped ? `<span class="cl-char__equip">กำลังใช้งาน</span>` : ''}
        <div class="cl-char__media">
          <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.hidden=false">
          <span class="cl-char__emoji" hidden>${icon(charIcon, 40)}</span>
          ${isOwned ? '' : `<span class="cl-char__lock">${icon('lock', 26)}</span>`}
        </div>
        <div class="cl-char__body">
          <h3>${esc(isOwned ? c.name : 'ยังไม่ปลดล็อก')}</h3>
          <span>${esc(isOwned ? c.bonus : `ใช้ ${formatNum(c.cost)} โทเคนในร้านค้า`)}</span>
        </div>
      </article>`;
  }).join('');

  box.querySelectorAll('.cl-char').forEach((card, index) => {
    const c = CHARACTERS[index];
    const id = presetIdFor(c.id);
    const isOwned = owned.has(c.id);
    card.addEventListener('click', () => {
      if (!isOwned) {
        location.href = '/shop-mobile.html';
        return;
      }
      if (outfit.preset === id) return;
      if (!PRESETS[id]) return;
      outfit = { ...PRESETS[id] };
      saveOutfit(outfit);
      confetti(14);
      toast(`สวมชุด ${c.name} แล้ว`);
      renderChars();
      window.dispatchEvent(new CustomEvent('tc-outfit', { detail: { outfit } }));
    });
  });
}

function renderMedals(medalList) {
  const box = $('clMedals');
  if (!box) return;
  box.innerHTML = medalList.map(m => `
    <article class="cl-medal ${m.done ? 'is-done' : ''}">
      <span class="cl-medal__ico">${icon(m.icon || 'star', 20)}</span>
      <div class="cl-medal__body">
        <strong>${esc(m.name)}</strong>
        <span>${esc(m.desc)}</span>
        <div class="cl-medal__bar"><i style="width:${m.pct}%"></i></div>
      </div>
      <span class="cl-medal__count">${Math.min(m.value, m.target)}/${m.target}</span>
    </article>`).join('');
}

function renderProvinces(visited) {
  const box = $('clProvinces');
  if (!box) return;
  const grouped = new Map();
  places.forEach(p => {
    if (!p.province) return;
    if (!grouped.has(p.province)) grouped.set(p.province, []);
    grouped.get(p.province).push(p);
  });
  box.innerHTML = [...grouped.entries()].map(([province, list]) => {
    const seen = visited.has(province);
    return `
      <div class="cl-province ${seen ? 'is-visited' : ''}">
        <span class="cl-province__stamp">${seen ? icon('check', 14) : icon('pin', 15)}</span>
        <span class="cl-province__body">
          <strong>${esc(province)}</strong>
          <span>${seen ? `ประทับแล้ว · ${list.length} สถานที่` : `ยังไม่ไป · ${list.length} สถานที่`}</span>
        </span>
      </div>`;
  }).join('');
}

function renderAll() {
  const owned = ownedChars();
  const visited = visitedProvinces();
  const medalList = medals(owned, visited);
  renderHero(owned, visited, medalList);
  renderChars();
  renderMedals(medalList);
  renderProvinces(visited);
}

async function boot() {
  places = await fetchPlaces();
  renderAll();
  window.addEventListener('tc-quest-done', renderAll);
  window.addEventListener('tc-tokens', () => {
    const owned = ownedChars();
    const visited = visitedProvinces();
    renderHero(owned, visited, medals(owned, visited));
  });
  window.addEventListener('tc-outfit', renderChars);
}

document.addEventListener('DOMContentLoaded', boot);
