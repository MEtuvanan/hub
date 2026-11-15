// explore-mobile.js — full-screen AR adventure map.

import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import { initARMap } from './ar-map.js';
import { fetchPlaces, categoryMeta } from './mobile-data.js';
import { getDisplayName, levelInfo, confetti } from './mobile-app.js';
import { BOSS_MODELS, getProgress, listBosses } from './game-data.js';
import { openBossPrompt } from './boss-sheet.js';

const $ = id => document.getElementById(id);

let places = [];
let bosses = [];
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
    <button class="ex-chip ${!province ? 'is-active' : ''}" type="button" data-province="">${icon('map', 13)}<span>ทั้งหมด</span></button>
    ${provinces().map(p => `<button class="ex-chip ${province === p ? 'is-active' : ''}" type="button" data-province="${esc(p)}">${icon('pin', 12)}<span>${esc(p.replace('มหานคร', ''))}</span></button>`).join('')}`;
  box.querySelectorAll('[data-province]').forEach(btn => {
    btn.addEventListener('click', () => {
      province = btn.dataset.province;
      renderChips();
      const rows = province ? places.filter(p => p.province === province) : places;
      map?.setPlaces(rows, { fit: !!province });
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

function bossesAt(placeId) {
  return bosses.filter(b => b.placeId === placeId);
}

function renderCard() {
  const card = $('exCard');
  if (!card) return;
  if (!selected) {
    card.classList.add('is-hidden');
    document.body.classList.remove('ex-card-open');
    return;
  }
  card.classList.remove('is-hidden');
  document.body.classList.add('ex-card-open');
  const meta = categoryMeta(selected.category);
  const img = $('exCardImg');
  const fb = $('exCardFallback');
  if (img) {
    img.src = selected.image || '';
    img.alt = selected.name;
    img.hidden = false;
    if (fb) fb.hidden = true;
    img.onerror = () => { img.hidden = true; if (fb) { fb.hidden = false; fb.innerHTML = icon('image', 24); } };
  }
  $('exCardName').textContent = selected.name;
  $('exCardMeta').innerHTML = `
    <span class="g-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>${Number(selected.rating || 0).toFixed(1)}</span>
    <span>· ${esc(selected.province || '')}</span>
    <span class="g-chip">${icon('pin', 12)}${esc(selected.categoryLabel || meta.label)}</span>`;
  $('exDetail').href = `/place-mobile.html?id=${encodeURIComponent(selected.id)}`;
  $('exNav').href = `/navigate-mobile.html?name=${encodeURIComponent(selected.name)}&lat=${selected.lat || ''}&lng=${selected.lng || ''}&id=${encodeURIComponent(selected.id)}`;
  const hint = $('exCardHint');
  if (hint) hint.innerHTML = `${icon('quest', 11)} แตะ “เดินไป” เพื่อให้ตัวละครเดินอัตโนมัติ`;

  // boss encounter for this place
  const actions = card.querySelector('.ex-card__actions');
  actions?.querySelector('[data-card-boss]')?.remove();
  const localBoss = bossesAt(selected.id)[0];
  if (actions && localBoss) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'g-btn g-btn--sm g-btn--gold';
    btn.dataset.cardBoss = localBoss.id;
    btn.innerHTML = `${icon('flame', 13)} บอส Lv.${Number(localBoss.level || 1)}`;
    btn.addEventListener('click', () => {
      openBossPrompt(localBoss, {
        place: selected,
        onFinish: result => { if (result?.win) confetti(24); refreshBossPins(); },
      });
    });
    actions.prepend(btn);
  }
}

function refreshBossPins() {
  bosses = listBosses().map(b => ({
    ...b,
    defeated: getProgress().defeated.includes(b.id),
  }));
  map?.setBosses(bosses);
}

function openList() {
  const box = $('exList');
  if (!box) return;
  const rows = province ? places.filter(p => p.province === province) : places;
  box.innerHTML = rows.length ? rows.map(p => `
    <button class="ex-item" type="button" data-place="${esc(p.id)}">
      <span class="ex-item__media">
        <img src="${esc(p.image || '')}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false">
        <span class="fallback" hidden>${icon('image', 20)}</span>
      </span>
      <span class="ex-item__body">
        <strong>${esc(p.name)}</strong>
        <span>${esc(p.province || '')} · ${Number(p.rating || 0).toFixed(1)} ดาว</span>
      </span>
      <span class="ex-item__go">เดินไป ${icon('arrow-right', 12)}</span>
    </button>`).join('') : `<div class="g-empty">${icon('map', 24)}<strong>ยังไม่มีสถานที่</strong><span>ลองเลือกจังหวัดอื่น</span></div>`;
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

  // boss section
  box.insertAdjacentHTML('beforeend', `
    <div class="ex-boss-head">
      <strong>${icon('flame', 13)} บอสประจำสถานที่</strong>
      <span>${bosses.length} ตัวบนแผนที่</span>
    </div>
    ${bosses.map(b => {
      const model = BOSS_MODELS.find(m => m.id === b.model) || BOSS_MODELS[0];
      return `<button class="ex-boss" type="button" data-boss="${esc(b.id)}" style="--boss-color:${model.tint}">
        <span class="ex-boss__face"><img src="${esc(model.image)}" alt="" loading="lazy"></span>
        <span class="ex-boss__body">
          <strong>${esc(b.name)}</strong>
          <span>${esc(b.placeName || '')} · Lv.${Number(b.level || 1)}</span>
        </span>
        <span class="ex-boss__go">${b.defeated ? 'ท้าซ้ำ' : 'ท้าสู้'} ${icon('arrow-right', 12)}</span>
      </button>`;
    }).join('')}`);
  box.querySelectorAll('[data-boss]').forEach(btn => {
    btn.addEventListener('click', () => {
      const boss = bosses.find(b => b.id === btn.dataset.boss);
      if (!boss) return;
      $('exListSheet')?.close();
      openBossPrompt(boss, {
        place: places.find(p => p.id === boss.placeId) || null,
        onFinish: result => {
          if (result?.win) confetti(24);
          refreshBossPins();
          if (selected) renderCard();
        },
      });
    });
  });

  $('exListSheet')?.showModal();
}

async function boot() {
  places = await fetchPlaces();
  bosses = listBosses().map(b => ({ ...b, defeated: getProgress().defeated.includes(b.id) }));
  renderChips();

  // Start where a boss actually is so the pins are visible on the first screen.
  const focusPlace = places.find(p => p.id === bosses[0]?.placeId)
    || places.find(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    || null;

  map = initARMap($('exMap'), {
    places,
    bosses,
    interactive: true,
    autoWalk: false,
    showPins: true,
    // Start a little south-west of the boss so the avatar does not stand on top
    // of the boss pin; both stay readable on the first screen.
    center: focusPlace ? { lat: focusPlace.lat, lng: focusPlace.lng } : undefined,
    startAt: focusPlace
      ? { lat: focusPlace.lat - 0.008, lng: focusPlace.lng - 0.016 }
      : undefined,
    zoom: 13,
    onPlaceClick: (place) => {
      showCard(place);
    },
    onBossClick: (boss) => {
      const place = places.find(p => p.id === boss.placeId) || null;
      openBossPrompt(boss, {
        place,
        onFinish: result => {
          if (result?.win) confetti(24);
          refreshBossPins();
          if (selected) renderCard();
        },
      });
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

  selected = focusPlace || places.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
  renderCard();

  $('exWalk')?.addEventListener('click', () => {
    if (!selected) return;
    map?.walkToPlace(selected);
    toast(`กำลังเดินไป ${selected.name}`);
  });
  $('exCloseCard')?.addEventListener('click', () => {
    $('exCard')?.classList.add('is-hidden');
    document.body.classList.remove('ex-card-open');
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
