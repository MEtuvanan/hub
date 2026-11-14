// home-mobile.js — AR hero map + scrolling adventure feed.

import { esc } from './ui.js';
import { icon, iconFor } from './icons.js';
import { initARMap } from './ar-map.js';
import {
  fetchPlaces, fetchQuests, completedQuests, favoritePlaces,
} from './mobile-data.js';
import {
  getDisplayName, levelInfo, getTokens, openQuestSheet, formatNum,
} from './mobile-app.js';

const $ = id => document.getElementById(id);
const STAR_KEY = 'tc_mobile_star_days';

let places = [];
let quests = [];
let map = null;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function starClaimed() {
  try {
    return (JSON.parse(localStorage.getItem(STAR_KEY) || '[]')).includes(todayKey());
  } catch {
    return false;
  }
}

function imageBlock(src, emoji, alt, cls = '') {
  return `
    <img src="${esc(src || '')}" alt="${esc(alt)}" class="${cls}" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.hidden=false">
    <span class="fallback" hidden>${iconFor(emoji, 22)}</span>`;
}

function questCard(q) {
  return `
    <article class="hm-quest" data-quest-id="${esc(q.id)}" tabindex="0" role="button" aria-label="${esc(q.title)}">
      <div class="hm-quest__media">
        ${imageBlock(q.image, q.emoji || q.icon || 'quest', q.title)}
        <div class="hm-quest__top">
          <span class="g-chip g-chip--mint">${esc(q.typeLabel || 'ภารกิจ')}</span>
          <span class="g-coin">${icon('coin', 13)} +${Number(q.reward || 0)}</span>
        </div>
        <span class="hm-quest__emoji" aria-hidden="true">${iconFor(q.emoji || q.icon || 'quest', 26)}</span>
      </div>
      <div class="hm-quest__body">
        <h3>${esc(q.title)}</h3>
        <p class="hm-quest__place">${icon('pin', 12)} ${esc(q.placeName || q.province || 'สถานที่ท่องเที่ยว')}</p>
        <div class="hm-quest__foot">
          <span class="hm-quest__reward">${icon('coin', 14)} ${Number(q.reward || 0)} โทเคน</span>
          <span class="hm-quest__time">${icon('clock', 11)} ${Number(q.minutes || 20)} นาที</span>
        </div>
      </div>
    </article>`;
}

function placeCard(p) {
  return `
    <a class="hm-place" href="/place-mobile.html?id=${encodeURIComponent(p.id)}">
      <span class="hm-place__media">
        ${imageBlock(p.image, p.fallbackEmoji || p.icon || 'map', p.name)}
      </span>
      <span class="hm-place__body">
        <h3>${esc(p.name)}</h3>
        <span class="hm-place__meta">
          <span class="g-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>${Number(p.rating || 0).toFixed(1)}</span>
          <span>·</span>
          <span>${esc(p.province || '')}</span>
        </span>
        <span class="hm-place__tags">${(p.tags || []).slice(0, 2).map(t => `<span>${esc(t)}</span>`).join('')}</span>
      </span>
      <span class="hm-place__go">${icon('arrow-right', 15)}</span>
    </a>`;
}

function campaignCard({ tone, flag, title, desc, tokens, char, image, mascot, href }) {
  return `
    <a class="hm-campaign hm-campaign--${tone}" href="${href}">
      <span class="hm-campaign__media">
        <img src="${esc(image)}" alt="" loading="lazy" onerror="this.style.display='none'">
      </span>
      <span class="hm-campaign__body">
        <span class="hm-campaign__flag">${icon('gift', 10)} ${esc(flag)}</span>
        <h3>${esc(title)}</h3>
        <p>${esc(desc)}</p>
        <span class="hm-campaign__rewards">
          <span>${icon('coin', 11)} +${tokens} โทเคน</span>
          <span>${icon('user', 11)} ${esc(char)}</span>
        </span>
      </span>
      <img class="hm-campaign__mascot" src="${esc(mascot)}" alt="" loading="lazy" onerror="this.hidden=true">
    </a>`;
}

function refreshIdentity() {
  const name = getDisplayName();
  const lvl = levelInfo();
  const nameEl = $('homeName');
  if (nameEl) nameEl.textContent = name.split(' ')[0];
  const lv = $('homeLevel');
  if (lv) lv.textContent = String(lvl.level);
  const xp = $('homeXp');
  if (xp) xp.textContent = `${formatNum(lvl.into)} / ${lvl.need} XP`;
  const bar = $('homeXpBar');
  if (bar) bar.style.width = `${lvl.pct}%`;
  if (map) {
    map.getNameEl()?.replaceChildren(document.createTextNode(name.split(' ')[0]));
  }
}

function updateDaily() {
  const strip = $('homeDaily');
  if (!strip) return;
  const claimed = starClaimed();
  strip.classList.toggle('is-claimed', claimed);
  const cta = strip.querySelector('.hm-daily__cta');
  if (cta) cta.textContent = claimed ? 'รับแล้ววันนี้' : 'รับ +25';
}

function updateStats() {
  const done = completedQuests();
  const liked = favoritePlaces();
  const provinces = new Set(places.map(p => p.province).filter(Boolean));
  const set = (id, value) => { const el = $(id); if (el) el.textContent = String(value); };
  set('homeNearby', Math.max(0, quests.filter(q => !done.has(q.id)).length));
  set('homePlaces', places.length);
  set('homeProvinces', provinces.size);
  set('homeDone', done.size);
  set('homeLiked', liked.size);
  set('homeTokenStat', formatNum(getTokens()));
}

function render() {
  const done = completedQuests();

  const questRail = $('homeQuestRail');
  if (questRail) {
    const open = quests.filter(q => !done.has(q.id)).slice(0, 6);
    const list = (open.length ? open : quests.slice(0, 6));
    questRail.innerHTML = list.length
      ? list.map(questCard).join('')
      : `<div class="hm-empty-mini">ยังไม่มีเควสท์ในระบบ</div>`;
    questRail.querySelectorAll('[data-quest-id]').forEach(el => {
      const open = () => {
        const q = quests.find(item => item.id === el.dataset.questId);
        if (q) openQuestSheet(q, { onComplete: () => { updateStats(); render(); } });
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  const placeList = $('homePlaceList');
  if (placeList) {
    const featured = [...places].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
    placeList.innerHTML = featured.length
      ? featured.map(placeCard).join('')
      : `<div class="hm-empty-mini">ยังไม่มีสถานที่แนะนำ</div>`;
  }

  const campaigns = $('homeCampaigns');
  if (campaigns) {
    campaigns.innerHTML = [
      campaignCard({
        tone: 'ray', flag: 'SPECIAL CAMPAIGN', title: 'สำรวจเมืองแห่งการค้นพบ',
        desc: 'เช็คอินครบ 5 สถานที่ในกรุงเทพฯ รับตัวละคร “เรย์” พร้อมโทเคนโบนัส',
        tokens: 150, char: 'เรย์', image: places[0]?.image || '',
        mascot: '/assets/img/ray.png', href: '/quests-mobile.html',
      }),
      campaignCard({
        tone: 'maya', flag: 'LIMITED EDITION', title: 'ผจญภัยชายฝั่ง — มายา',
        desc: 'ตามหารอยเท้าบนหาดและตลาดน้ำ 4 แห่ง รับ “มายา” นักสำรวจสาว',
        tokens: 120, char: 'มายา', image: places.find(p => p.category === 'beach')?.image || '',
        mascot: '/assets/img/maya.png', href: '/quests-mobile.html',
      }),
    ].join('');
  }

  Object.entries({ homeDone: done.size, homeLiked: favoritePlaces().size }).forEach(([id, v]) => {
    const el = $(id); if (el) el.textContent = String(v);
  });
}

async function boot() {
  refreshIdentity();
  updateDaily();

  [places, quests] = await Promise.all([fetchPlaces(), fetchQuests()]);
  updateStats();
  render();

  const hero = $('homeMap');
  if (hero) {
    // Keep the hero map at street level around Bangkok: pick the seven nearest
    // places so a stray far-away pin cannot zoom the map out to the whole region.
    const origin = { lat: 13.7563, lng: 100.5018 };
    const ranked = places
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map(p => ({
        p,
        d: Math.hypot((p.lat - origin.lat) * 111, (p.lng - origin.lng) * 108),
      }))
      .sort((a, b) => a.d - b.d);
    const local = ranked.filter(x => x.d < 32).slice(0, 7).map(x => x.p);
    const heroPlaces = local.length >= 3 ? local : ranked.slice(0, 7).map(x => x.p);

    map = initARMap(hero, {
      places: heroPlaces,
      interactive: false,
      autoWalk: true,
      showPins: true,
      fitPlaces: true,
      focus: { x: 0, y: 0.1 },
      zoom: 15,
      onPlaceClick: place => {
        location.href = `/place-mobile.html?id=${encodeURIComponent(place.id)}`;
      },
      onArrive: place => {
        const chip = hero.querySelector('[data-ar-name]');
        if (chip && place) chip.textContent = place.name.slice(0, 18);
      },
    });
    map?.getNameEl() && (map.getNameEl().textContent = getDisplayName().split(' ')[0]);
    map?.getLevelEl() && (map.getLevelEl().textContent = `Lv.${levelInfo().level}`);
  }

  $('homeDaily')?.addEventListener('click', e => {
    e.preventDefault();
    $('appStarBtn')?.click();
    setTimeout(updateDaily, 400);
  });

  window.addEventListener('tc-tokens', () => { updateStats(); refreshIdentity(); updateDaily(); });
  window.addEventListener('tc-profile', refreshIdentity);
  window.addEventListener('tc-level', refreshIdentity);
}

document.addEventListener('DOMContentLoaded', boot);
