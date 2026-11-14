// place-mobile.js — place detail with highlights, AR mini map, and quest picker.

import { esc, toast } from './ui.js';
import { icon, iconFor } from './icons.js';
import { initARMap } from './ar-map.js';
import {
  findPlace, fetchPlaces, fetchQuests, categoryMeta,
  completedQuests, favoritePlaces, toggleFavoritePlace,
} from './mobile-data.js';
import { openQuestSheet } from './mobile-app.js';

const $ = id => document.getElementById(id);

let place = null;
let quests = [];
let places = [];
let map = null;

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fallbackQuest(p) {
  return {
    id: `place-quest-${p.id}`,
    title: `เก็บภาพความประทับใจที่ ${p.name}`,
    placeId: p.id,
    placeName: p.name,
    province: p.province,
    type: 'photo',
    typeLabel: 'ถ่ายภาพ',
    difficulty: 'easy',
    reward: 60,
    minutes: 20,
    image: p.image,
    emoji: p.fallbackEmoji || 'camera',
    summary: `เดินสำรวจ ${p.name} ถ่ายภาพมุมที่คุณชอบที่สุด และบันทึกความรู้สึกไว้ในไดอารี่นักเดินทาง`,
    steps: [
      `เดินชมจุดสำคัญของ ${p.name}`,
      'ถ่ายภาพอย่างน้อย 1 มุมที่คุณชอบ',
      'กรอกรหัสเช็คอินจากป้ายกิจกรรมเพื่อรับโทเคน',
    ],
    tags: p.tags || [],
    lat: p.lat,
    lng: p.lng,
  };
}

function questCards() {
  const done = completedQuests();
  return quests.map(q => {
    const isDone = done.has(q.id);
    return `
      <button class="pm-quest ${isDone ? 'is-done' : ''}" type="button" data-quest="${esc(q.id)}">
        <span class="pm-quest__media">
          <img src="${esc(q.image || '')}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false">
          <span class="fallback" hidden>${icon('image', 20)}</span>
        </span>
        <span class="pm-quest__body">
          <span class="pm-quest__meta">
            <span class="g-chip g-chip--gold">${esc(q.typeLabel || 'ภารกิจ')}</span>
            ${isDone ? `<span class="g-chip g-chip--mint">${icon('check', 10)} สำเร็จแล้ว</span>` : ''}
          </span>
          <h3>${esc(q.title)}</h3>
          <span class="app-tiny">${icon('clock', 11)} ${Number(q.minutes || 20)} นาที · ${esc(q.difficulty === 'hard' ? 'ท้าทาย' : q.difficulty === 'medium' ? 'ปานกลาง' : 'ง่าย')}</span>
          <span class="pm-quest__foot">
            <span class="pm-quest__reward">${icon('coin', 13)} +${Number(q.reward || 0)}</span>
            <span class="pm-quest__go">${isDone ? 'ดูอีกครั้ง' : 'เริ่มเควสท์'} ${icon('arrow-right', 12)}</span>
          </span>
        </span>
      </button>`;
  }).join('');
}

function renderQuests() {
  const box = $('pmQuestList');
  if (!box) return;
  box.innerHTML = questCards();
  box.querySelectorAll('[data-quest]').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = quests.find(item => item.id === btn.dataset.quest);
      if (q) openQuestSheet(q, { onComplete: () => renderQuests() });
    });
  });
  const count = $('pmQuestCount');
  if (count) count.textContent = `${quests.length} เควสท์`;
}

function renderNearby() {
  const box = $('pmNearby');
  if (!box) return;
  const rows = places
    .filter(p => p.id !== place.id)
    .map(p => ({ ...p, _d: haversine(place, p) }))
    .sort((a, b) => (a.province === place.province ? -1 : 1) - (b.province === place.province ? -1 : 1) || a._d - b._d)
    .slice(0, 6);
  if (!rows.length) {
    box.innerHTML = `<div class="hm-empty-mini">ยังไม่มีสถานที่ใกล้เคียง</div>`;
    return;
  }
  box.innerHTML = rows.map(p => `
    <a class="pm-near" href="/place-mobile.html?id=${encodeURIComponent(p.id)}">
      <span class="pm-near__media">
        <img src="${esc(p.image || '')}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false">
        <span class="fallback" hidden>${icon('image', 20)}</span>
      </span>
      <span class="pm-near__body">
        <h3>${esc(p.name)}</h3>
        <span>${esc(p.province || '')} · ${p._d.toFixed(1)} กม.</span>
      </span>
    </a>`).join('');
}

function renderFav() {
  const btn = $('pmFav');
  if (!btn) return;
  const on = favoritePlaces().has(place.id);
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', on ? 'เอาออกจากรายการถูกใจ' : 'เพิ่มในรายการถูกใจ');
}

function renderPlace() {
  const meta = categoryMeta(place.category);
  document.title = `${place.name} — Travel and Challenge`;

  const img = $('pmHeroImg');
  const fb = $('pmHeroFallback');
  if (img) {
    img.src = place.image || '';
    img.alt = place.name;
    img.onerror = () => { img.hidden = true; if (fb) fb.hidden = false; };
  }
  if (fb) fb.hidden = true;

  $('pmCategory').innerHTML = `${icon('pin', 12)} ${esc(place.categoryLabel || meta.label)}`;
  $('pmCategory').style.borderColor = `${meta.color}66`;
  $('pmCategory').style.color = meta.color;
  $('pmName').textContent = place.name;
  if ($('pmVerified')) $('pmVerified').hidden = !place.verified;
  $('pmRating').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>${Number(place.rating || 0).toFixed(1)}`;
  $('pmReviews').textContent = `${Number(place.reviews || 0).toLocaleString('th-TH')} รีวิว`;
  $('pmWhere').textContent = [place.district, place.province].filter(Boolean).join(' · ');
  $('pmSummary').textContent = place.summary || '';
  $('pmDescription').textContent = place.description || place.summary || '';

  const info = $('pmInfo');
  if (info) {
    info.innerHTML = [
      { icon: 'clock', tone: 'mint', label: 'เวลาเปิด', value: place.hours || 'เปิดทุกวัน' },
      { icon: 'coin', tone: 'gold', label: 'ค่าเข้า', value: place.fee || 'โปรดตรวจสอบ' },
      { icon: 'sun', tone: 'blue', label: 'ช่วงเวลาที่ดี', value: place.bestTime || 'เช้าหรือเย็น' },
      { icon: 'pin', tone: 'violet', label: 'ที่ตั้ง', value: place.district || place.province || 'ไทย' },
    ].map(item => `
      <div class="pm-info__item" data-tone="${item.tone}">
        <span class="pm-info__icon">${iconSafe(item.icon, 16)}</span>
        <span class="pm-info__body"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></span>
      </div>`).join('');
  }

  const high = $('pmHighlights');
  if (high) {
    const rows = (place.highlights || []).filter(Boolean).slice(0, 4);
    const section = $('pmHighlightsSection');
    if (rows.length) {
      section.hidden = false;
      high.innerHTML = rows.map(h => `
        <div class="pm-highlight">
          <span class="pm-highlight__ico">${iconFor(h.icon, 16)}</span>
          <div><strong>${esc(h.title || '')}</strong><p>${esc(h.desc || '')}</p></div>
        </div>`).join('');
    } else {
      section.hidden = true;
    }
  }

  const tags = $('pmTags');
  if (tags) tags.innerHTML = (place.tags || []).map(t => `<span>${esc(t)}</span>`).join('');

  renderFav();

  const go = $('pmGo');
  if (go) go.href = `/navigate-mobile.html?name=${encodeURIComponent(place.name)}&lat=${place.lat || ''}&lng=${place.lng || ''}&id=${encodeURIComponent(place.id)}`;

  const coords = $('pmCoords');
  if (coords) coords.innerHTML = `${icon('gps', 12)} ${Number(place.lat || 0).toFixed(4)}, ${Number(place.lng || 0).toFixed(4)}`;
  const mapOpen = $('pmMapOpen');
  if (mapOpen) {
    mapOpen.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.lat)},${encodeURIComponent(place.lng)}`;
  }

  const mapEl = $('pmMap');
  if (mapEl) {
    map = initARMap(mapEl, {
      places: [place],
      interactive: false,
      autoWalk: true,
      showPins: true,
      center: { lat: place.lat, lng: place.lng },
      zoom: 16,
    });
  }

  renderQuests();
  renderNearby();
}

function iconSafe(name, size) {
  const allowed = new Set(['clock', 'coin', 'sun', 'pin', 'map', 'quest', 'star', 'compass', 'camera', 'leaf']);
  return icon(allowed.has(name) ? name : 'pin', size);
}

function bindStatic() {
  $('pmBack')?.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.href = '/index-mobile.html';
  });
  $('pmFav')?.addEventListener('click', () => {
    toggleFavoritePlace(place.id);
    renderFav();
  });
  $('pmShare')?.addEventListener('click', async () => {
    const data = { title: place.name, text: place.summary || place.name, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(location.href);
        toast('คัดลอกลิงก์แล้ว');
      }
    } catch {}
  });
  $('pmQuestJump')?.addEventListener('click', () => {
    $('pmQuests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('pmFloatBtn')?.addEventListener('click', () => {
    $('pmQuests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function bindObserver() {
  const target = $('pmQuests');
  const float = $('pmFloat');
  if (!target || !float || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      float.classList.toggle('is-hidden', entry.isIntersecting);
    });
  }, { rootMargin: '0px 0px -30% 0px', threshold: 0.12 });
  io.observe(target);
}

function missing(message) {
  const root = $('placeRoot');
  if (!root) return;
  root.innerHTML = `
    <div class="pm-missing">
      ${icon('map', 26)}
      <h1>ไม่พบสถานที่นี้</h1>
      <p>${esc(message || 'ลิงก์อาจเก่าหรือสถานที่ถูกนำออกแล้ว ลองค้นหาสถานที่ใหม่ได้เลย')}</p>
      <a class="g-btn g-btn--mint" href="/search-mobile.html">ไปหน้าค้นหา</a>
      <a class="g-btn g-btn--ghost" href="/index-mobile.html">กลับหน้าหลัก</a>
    </div>`;
  $('pmFloat')?.remove();
}

async function boot() {
  bindStatic();
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { missing('ไม่ได้ระบุสถานที่ที่ต้องการดู'); return; }

  [place, places, quests] = await Promise.all([findPlace(id), fetchPlaces(), fetchQuests()]);
  if (!place) { missing(); return; }

  const own = quests.filter(q => q.placeId === place.id).map(q => ({ ...q, lat: place.lat, lng: place.lng }));
  quests = own.length ? own : [fallbackQuest(place)];

  renderPlace();
  bindObserver();
}

document.addEventListener('DOMContentLoaded', boot);
