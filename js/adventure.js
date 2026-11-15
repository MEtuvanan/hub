// adventure.js — desktop AR adventure map: player walks on a real map (GPS or
// joystick), bosses live on their own places and can be challenged from pins or
// the sidebar. Same engine and battle system as the phone build.

import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import { initARMap } from './ar-map.js';
import { fetchPlaces } from './mobile-data.js';
import { getProfile } from './auth.js';
import { openBossPrompt } from './boss-sheet.js';
import { initAIPlannerModal } from './ai-planner-modal.js';
import {
  MAX_TEAM, RARITIES, bossModel, characterById, getProgress, getTeam,
  listBosses, playerLevel, skillById, subscribe,
} from './game-data.js';

const $ = id => document.getElementById(id);
const BANGKOK = { lat: 13.7563, lng: 100.5018 };
const TOKEN_KEY = 'tc_mobile_tokens';

function getTokens() {
  return Number(localStorage.getItem(TOKEN_KEY)) || 0;
}

function levelInfo(tokens = getTokens()) {
  const level = Math.max(1, Math.floor(tokens / 250) + 1);
  return { level };
}

let places = [];
let bosses = [];
let map = null;
let gpsOn = false;

function defeatedIds() {
  return getProgress().defeated || [];
}

function loadBosses() {
  const defeated = defeatedIds();
  return listBosses().map(b => ({ ...b, defeated: defeated.includes(b.id) }));
}

function nearBosses(limit = 8) {
  return bosses
    .map(b => ({
      b,
      d: Math.hypot((Number(b.lat) - BANGKOK.lat) * 111, (Number(b.lng) - BANGKOK.lng) * 108),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(x => x.b);
}

function renderTeam() {
  const box = $('advTeam');
  if (!box) return;
  const team = getTeam().map(characterById).filter(Boolean);
  const slots = Array.from({ length: MAX_TEAM }, (_, i) => team[i] || null);
  box.innerHTML = slots.map((c, i) => c ? `
    <article class="adv-mate" style="--char:${c.color || '#0F8A5F'}">
      <span class="adv-mate__idx">${i + 1}</span>
      <span class="adv-mate__media"><img src="${esc(c.image)}" alt="${esc(c.name)}"></span>
      <span class="adv-mate__body">
        <strong>${esc(c.name)}</strong>
        <small>${esc(skillById(c.skillId)?.name || 'โจมตีพื้นฐาน')}</small>
      </span>
    </article>` : `
    <article class="adv-mate is-empty">
      <span class="adv-mate__idx">${i + 1}</span>
      <span class="adv-mate__plus">${icon('plus', 16)}</span>
      <span class="adv-mate__body"><strong>ช่องว่าง</strong><small>เลือกตัวละครในหน้าจัดทีม</small></span>
    </article>`).join('');

  const level = playerLevel();
  const progress = getProgress();
  const beaten = bosses.filter(b => b.defeated).length;
  const bar = $('advProgress');
  if (bar) {
    bar.innerHTML = `
      <div class="adv-progress__row">
        <span>${icon('trophy', 12)} Lv.${level.level} · ${progress.wins} ชนะ · ${beaten}/${bosses.length} บอส</span>
        <span>${level.into}/${level.need} XP</span>
      </div>
      <span class="tm-bar tm-bar--gold"><i style="width:${Math.min(100, (level.into / level.need) * 100)}%"></i></span>`;
  }
  const tok = $('advTokens');
  if (tok) {
    tok.innerHTML = `${icon('coin', 12)} ${Number(getTokens()).toLocaleString('th-TH')} โทเคน`;
  }
}

function renderBosses() {
  const box = $('advBosses');
  if (!box) return;
  const rows = nearBosses();
  const count = $('advBossCount');
  if (count) count.textContent = String(bosses.length);
  box.innerHTML = rows.length ? rows.map(b => {
    const model = bossModel(b.model);
    const rarity = RARITIES[b.rarity] || RARITIES.epic;
    return `
      <article class="adv-boss ${b.defeated ? 'is-done' : ''}" style="--char:${model.tint}">
        <span class="adv-boss__media"><img src="${esc(model.image)}" alt="${esc(b.name)}" loading="lazy"></span>
        <span class="adv-boss__body">
          <span class="adv-boss__top">
            <strong>${esc(b.name)}</strong>
            <span class="tm-rarity" style="--r:${rarity.tone};--rb:${rarity.bg}">Lv.${Number(b.level || 1)}</span>
          </span>
          <span class="adv-boss__place">${icon('pin', 11)} ${esc(b.placeName || 'สถานที่')}</span>
          <span class="adv-boss__skill">${icon(skillById(b.skillId)?.icon || 'flame', 11)} ${esc(skillById(b.skillId)?.name || 'โจมตี')}</span>
        </span>
        <button class="g-btn ${b.defeated ? 'g-btn--ghost' : 'g-btn--gold'} g-btn--sm" type="button"
          data-adv-fight="${esc(b.id)}">
          ${b.defeated ? `${icon('check', 12)} ท้าซ้ำ` : `${icon('flame', 12)} ท้าสู้`}
        </button>
      </article>`;
  }).join('') : `<p class="adv-empty">${icon('map', 20)} ยังไม่มีบอสบนแผนที่ — เพิ่มได้จากหน้าแอดมิน</p>`;

  box.querySelectorAll('[data-adv-fight]').forEach(btn => {
    btn.addEventListener('click', () => {
      const boss = bosses.find(b => b.id === btn.dataset.advFight);
      if (!boss) return;
      const place = places.find(p => p.id === boss.placeId) || null;
      openBossPrompt(boss, {
        place,
        onFinish: result => {
          if (result?.win) toast(`ชนะ ${boss.name}! +${result.tokens} โทเคน`);
          refresh();
        },
      });
    });
  });
}

function refresh() {
  bosses = loadBosses();
  map?.setBosses(bosses);
  renderTeam();
  renderBosses();
}

function setStatus(text) {
  const el = $('advStatus');
  if (el) el.innerHTML = `${icon('navigate', 12)} ${esc(text)}`;
}

function setGpsUi(on) {
  gpsOn = on;
  const btn = $('advGps');
  if (!btn) return;
  btn.classList.toggle('is-on', on);
  btn.innerHTML = `${icon('gps', 15)} ${on ? 'GPS กำลังทำงาน' : 'เดินตาม GPS'}`;
}

function toggleGps() {
  if (!map) return;
  if (gpsOn || map.isGpsActive?.()) {
    map.stopGps?.();
    setGpsUi(false);
    setStatus('หยุด GPS แล้ว — ใช้จอยสติ๊กหรือลูกศรเดินต่อ');
    toast('ปิด GPS');
    return;
  }
  map.startGps?.();
  setGpsUi(true);
  setStatus('กำลังค้นหาสัญญาณ GPS…');
  toast('เปิด GPS — อนุญาตตำแหน่งเพื่อให้ตัวละครเดินตามคุณ');
  // the map falls back to manual control when permission is denied
  setTimeout(() => {
    if (map && map.isGpsActive?.() === false) {
      setGpsUi(false);
      setStatus('ไม่ได้สัญญาณ GPS — ใช้จอยสติ๊กเดินแทน');
    }
  }, 6000);
}

async function boot() {
  places = await fetchPlaces();
  bosses = loadBosses();

  map = initARMap($('advMap'), {
    places,
    bosses,
    interactive: true,
    showPins: true,
    center: BANGKOK,
    zoom: 13,
    focus: { x: 0, y: 0 },
    onPlaceClick: place => {
      setStatus(`กำลังเดินไป ${place.name}`);
      map?.walkToPlace(place);
    },
    onBossClick: boss => {
      const place = places.find(p => p.id === boss.placeId) || null;
      openBossPrompt(boss, {
        place,
        onFinish: result => {
          if (result?.win) toast(`ชนะ ${boss.name}! +${result.tokens} โทเคน`);
          refresh();
        },
      });
    },
    onArrive: place => {
      if (place) setStatus(`ถึง ${place.name} แล้ว`);
    },
  });

  if (map) {
    const nameEl = map.getNameEl();
    if (nameEl) nameEl.textContent = getProfile()?.display_name || 'นักสำรวจ';
    const lvEl = map.getLevelEl();
    if (lvEl) lvEl.textContent = `Lv.${levelInfo().level}`;
  }

  renderTeam();
  renderBosses();

  $('advGps')?.addEventListener('click', toggleGps);

  subscribe(() => refresh());
  window.addEventListener('tc-tokens', renderTeam);
  window.addEventListener('tc-game-changed', refresh);
  initAIPlannerModal();
}

document.addEventListener('DOMContentLoaded', boot);
