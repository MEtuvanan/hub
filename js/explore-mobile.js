// explore-mobile.js — full-screen AR adventure map.

import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import { initARMap } from './ar-map.js';
import { fetchPlaces, categoryMeta } from './mobile-data.js';
import { getDisplayName, levelInfo, confetti } from './mobile-app.js';

const $ = id => document.getElementById(id);
const PROVINCE_EMOJI = {
  'กรุงเทพมหานคร': '🏙️', 'เชียงใหม่': '⛰️', 'ภูเก็ต': '🏖️', 'กระบี่': '🏝️',
  'กาญจนบุรี': '🌿', 'ชลบุรี': '🌊', 'พระนครศรีอยุธยา': '🏛️', 'สุโขทัย': '🌅',
};

let places = [];
let map = null;
let selected = null;
let province = '';

function provinces() {
  return [...new Set(places.map(p => p.province).filter(Boolean))];
}

function renderChips() {
  const box = $('exChips');
  if (!box) return;
  box.innerHTML = `
    <button class="ex-chip ${!province ? 'is-active' : ''}" type="button" data-province=""><span class="emoji">🗺️</span>ทั้งหมด</button>
    ${provinces().map(p => `<button class="ex-chip ${province === p ? 'is-active' : ''}" type="button" data-province="${esc(p)}"><span class="emoji">${PROVINCE_EMOJI[p] || '📍'}</span>${esc(p.replace('มหานคร', ''))}</button>`).join('')}`;
  box.querySelectorAll('[data-province]').forEach(btn => {
    btn.addEventListener('click', () => {
      province = btn.dataset.province;
      renderChips();
      const rows = province ? places.filter(p => p.province === province) : places;
      map?.setPlaces(rows);
      if (!rows.some(p => p.id === selected?.id)) {
        selected = rows[0] || null;
        renderCard();
      }
      toast(province ? `โซน ${province}` : 'แสดงทุกจังหวัด');
    });
  });
}

function showCard(place) {
  selected = place;
  renderCard();
}

function renderCard() {
  const card = $('exCard');
  if (!card) return;
  if (!selected) { card.classList.add('is-hidden'); return; }
  card.classList.remove('is-hidden');
  const meta = categoryMeta(selected.category);
  const img = $('exCardImg');
  const fb = $('exCardFallback');
  if (img) {
    img.src = selected.image || '';
    img.alt = selected.name;
    img.hidden = false;
    if (fb) fb.hidden = true;
    img.onerror = () => { img.hidden = true; if (fb) { fb.hidden = false; fb.textContent = selected.fallbackEmoji || meta.emoji; } };
  }
  $('exCardName').textContent = selected.name;
  $('exCardMeta').innerHTML = `
    <span class="g-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>${Number(selected.rating || 0).toFixed(1)}</span>
    <span>· ${esc(selected.province || '')}</span>
    <span class="g-chip">${meta.emoji} ${esc(selected.categoryLabel || meta.label)}</span>`;
  $('exDetail').href = `/place-mobile.html?id=${encodeURIComponent(selected.id)}`;
  $('exNav').href = `/navigate-mobile.html?name=${encodeURIComponent(selected.name)}&lat=${selected.lat || ''}&lng=${selected.lng || ''}&id=${encodeURIComponent(selected.id)}`;
  const hint = $('exCardHint');
  if (hint) hint.innerHTML = `${icon('quest', 11)} แตะ “เดินไป” เพื่อให้ตัวละครเดินอัตโนมัติ`;
}

function openList() {
  const box = $('exList');
  if (!box) return;
  const rows = province ? places.filter(p => p.province === province) : places;
  box.innerHTML = rows.length ? rows.map(p => `
    <button class="ex-item" type="button" data-place="${esc(p.id)}">
      <span class="ex-item__media">
        <img src="${esc(p.image || '')}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false">
        <span class="fallback" hidden>${esc(p.fallbackEmoji || '📍')}</span>
      </span>
      <span class="ex-item__body">
        <strong>${esc(p.name)}</strong>
        <span>${esc(p.province || '')} · ${Number(p.rating || 0).toFixed(1)} ดาว</span>
      </span>
      <span class="ex-item__go">เดินไป →</span>
    </button>`).join('') : `<div class="g-empty"><div class="emoji">🗺️</div><strong>ยังไม่มีสถานที่</strong><span>ลองเลือกจังหวัดอื่น</span></div>`;
  box.querySelectorAll('[data-place]').forEach(btn => {
    btn.addEventListener('click', () => {
      const place = places.find(p => p.id === btn.dataset.place);
      if (!place) return;
      showCard(place);
      map?.walkToPlace(place);
      $('exListSheet')?.close();
      toast(`กำลังเดินไป ${place.name}`);
    });
  });
  $('exListSheet')?.showModal();
}

async function boot() {
  places = await fetchPlaces();
  renderChips();

  map = initARMap($('exMap'), {
    places,
    interactive: true,
    autoWalk: false,
    showPins: true,
    onPlaceClick: (place) => {
      showCard(place);
    },
    onArrive: place => {
      if (!place) return;
      confetti(18);
      toast(`ถึง ${place.name} แล้ว · แตะเพื่อดูรายละเอียด`);
      const detail = $('exDetail');
      if (detail) detail.href = `/place-mobile.html?id=${encodeURIComponent(place.id)}`;
    },
  });

  if (map) {
    const nameEl = map.getNameEl();
    if (nameEl) nameEl.textContent = getDisplayName().split(' ')[0];
    const lvEl = map.getLevelEl();
    if (lvEl) lvEl.textContent = `Lv.${levelInfo().level}`;
  }

  selected = places.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
  renderCard();

  $('exWalk')?.addEventListener('click', () => {
    if (!selected) return;
    map?.walkToPlace(selected);
    toast(`กำลังเดินไป ${selected.name}`);
  });
  $('exCloseCard')?.addEventListener('click', () => {
    $('exCard')?.classList.add('is-hidden');
  });
  $('exRecenter')?.addEventListener('click', () => {
    map?.recenter();
    toast('กลับจุดเริ่มต้นแล้ว');
  });
  $('exListBtn')?.addEventListener('click', openList);
  document.querySelectorAll('[data-close-explore]').forEach(btn => {
    btn.addEventListener('click', () => $('exListSheet')?.close());
  });

  window.addEventListener('tc-profile', () => {
    const nameEl = map?.getNameEl();
    if (nameEl) nameEl.textContent = getDisplayName().split(' ')[0];
    const lvEl = map?.getLevelEl();
    if (lvEl) lvEl.textContent = `Lv.${levelInfo().level}`;
  });
}

// async top-level boot
(async () => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
