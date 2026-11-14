// planner-mobile.js — local day-by-day trip builder.

import { esc, toast } from './ui.js';
import { icon, iconFor } from './icons.js';
import {
  fetchPlaces, CATEGORIES, categoryMeta, readJSON, writeJSON,
} from './mobile-data.js';

const $ = id => document.getElementById(id);
const TRIPS_KEY = 'tc_mobile_trips';

const SLOTS = [
  { id: 'morning', label: 'เช้า', icon: 'sun', time: '08:30' },
  { id: 'noon', label: 'บ่าย', icon: 'sun', time: '13:00' },
  { id: 'evening', label: 'เย็น', icon: 'compass', time: '16:30' },
  { id: 'night', label: 'ค่ำ', icon: 'star', time: '19:00' },
];

const PACE = { relaxed: 2, balanced: 3, packed: 4 };

let places = [];
let currentTrip = null;
const interests = new Set();

function provinceOptions() {
  return [...new Set(places.map(p => p.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
}

function renderForm() {
  const sel = $('plProvince');
  if (!sel) return;
  sel.innerHTML = `<option value="">ทั่วประเทศไทย</option>` +
    provinceOptions().map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  const box = $('plInterests');
  if (box) {
    box.innerHTML = CATEGORIES.map(c => `
      <button class="pl-chip ${interests.has(c.id) ? 'is-active' : ''}" type="button" data-interest="${c.id}">
        <span class="emoji">${iconFor(c.emoji, 14)}</span>${esc(c.label)}
      </button>`).join('');
    box.querySelectorAll('[data-interest]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.interest;
        if (interests.has(id)) interests.delete(id); else interests.add(id);
        btn.classList.toggle('is-active', interests.has(id));
      });
    });
  }
}

function uniqueByPlace(list) {
  const seen = new Set();
  return list.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function buildTrip() {
  const province = $('plProvince')?.value || '';
  const days = Math.max(1, Math.min(5, Number($('plDays')?.value) || 2));
  const pace = $('plPace')?.value || 'balanced';
  const budget = Math.max(0, Number($('plBudget')?.value) || 3000);
  const perDay = PACE[pace] || 3;

  const matches = p => (!province || p.province === province) && (!interests.size || interests.has(p.category));
  const preferred = places.filter(matches).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const fallback = places.filter(p => (!province || p.province === province) && !preferred.includes(p))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const pool = uniqueByPlace([...preferred, ...fallback]);

  if (!pool.length) {
    toast('ยังไม่มีสถานที่สำหรับเงื่อนไขนี้ ลองเปลี่ยนจังหวัดหรือหมวดหมู่', 'error');
    return null;
  }

  let cursor = 0;
  const itinerary = Array.from({ length: days }, (_, dayIndex) => {
    const items = [];
    let guard = 0;
    while (items.length < perDay && guard < pool.length * 2) {
      guard++;
      const place = pool[cursor % pool.length];
      cursor++;
      if (items.some(i => i.placeId === place.id)) continue;
      const slot = SLOTS[items.length] || SLOTS[SLOTS.length - 1];
      const meta = categoryMeta(place.category);
      items.push({
        placeId: place.id,
        name: place.name,
        category: place.category,
        categoryLabel: place.categoryLabel || meta.label,
        slot: slot.label,
        slotIcon: slot.icon,
        time: slot.time,
        minutes: 60 + (items.length % 3) * 30,
        province: place.province,
      });
    }
    return { day: dayIndex + 1, items };
  }).filter(day => day.items.length);

  return {
    id: `trip-${Date.now()}`,
    title: `${province || 'ทั่วไทย'} · ${days} วัน`,
    province,
    days: itinerary.length,
    pace,
    budget,
    interests: [...interests],
    createdAt: Date.now(),
    itinerary,
  };
}

function renderTrip(trip) {
  if (!trip) return;
  currentTrip = trip;
  const box = $('plResult');
  if (!box) return;

  const stops = trip.itinerary.reduce((sum, d) => sum + d.items.length, 0);
  $('plSummary').hidden = false;
  $('plSummary').innerHTML = `
    <div class="pl-summary__item"><b>${trip.days}</b><span>วันเดินทาง</span></div>
    <div class="pl-summary__item"><b>${stops}</b><span>จุดหมาย</span></div>
    <div class="pl-summary__item"><b>${stops * 60}</b><span>โทเคนโดยประมาณ</span></div>`;

  box.innerHTML = `
    <div class="pl-result__head">
      <div>
        <h2>${esc(trip.title)}</h2>
        <p>งบประมาณ ฿${Number(trip.budget || 0).toLocaleString('th-TH')} · ${trip.pace === 'packed' ? 'เที่ยวเต็มวัน' : trip.pace === 'relaxed' ? 'ชิล ๆ' : 'สมดุล'}</p>
      </div>
      <span class="g-chip g-chip--mint">${icon('check', 11)} แผนพร้อมใช้</span>
    </div>
    ${trip.itinerary.map(day => `
      <div class="pl-day">
        <span class="pl-day__dot">D${day.day}</span>
        <div class="pl-day__title"><h3>วันที่ ${day.day}</h3><span>${day.items.length} จุดหมาย</span></div>
        ${day.items.map(item => `
          <a class="pl-stop" href="/place-mobile.html?id=${encodeURIComponent(item.placeId)}">
            <span class="pl-stop__slot"><span class="emoji">${icon(item.slotIcon || 'sun', 13)}</span>${esc(item.slot)}</span>
            <span class="pl-stop__body">
              <strong>${icon('pin', 14)} ${esc(item.name)}</strong>
              <span>${esc(item.time)} · ${esc(item.categoryLabel)} · ${item.minutes} นาที</span>
            </span>
            <span class="pl-stop__go">ดูสถานที่ ${icon('arrow-right', 12)}</span>
          </a>`).join('')}
      </div>`).join('')}
    <div class="pl-actions">
      <button class="g-btn g-btn--mint" type="button" id="plSave">
        ${icon('check', 16)} บันทึกแผนนี้
      </button>
      <a class="g-btn g-btn--ghost" href="/explore-mobile.html">เปิดแผนที่</a>
    </div>`;

  $('plSave')?.addEventListener('click', () => {
    const trips = readJSON(TRIPS_KEY, []);
    trips.unshift({ ...trip, id: `trip-${Date.now()}` });
    writeJSON(TRIPS_KEY, trips.slice(0, 20));
    toast('บันทึกแผนทริปแล้ว');
    renderSaved();
  });

  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSaved() {
  const box = $('plSavedList');
  if (!box) return;
  const trips = readJSON(TRIPS_KEY, []);
  if (!trips.length) {
    box.innerHTML = `<p class="app-tiny" style="margin:0">ยังไม่มีแผนที่บันทึกไว้</p>`;
    return;
  }
  box.innerHTML = trips.map(trip => `
    <div class="pl-saved__row" data-load="${esc(trip.id)}" role="button" tabindex="0">
      <span class="ico">${icon('journal', 17)}</span>
      <span class="body">
        <strong>${esc(trip.title)}</strong>
        <span>${trip.itinerary?.length || trip.days} วัน · ${(trip.itinerary || []).reduce((n, d) => n + (d.items?.length || 0), 0)} จุดหมาย</span>
      </span>
      <button class="trash" type="button" data-del="${esc(trip.id)}" aria-label="ลบแผน">${icon('trash', 13)}</button>
    </div>`).join('');
  box.querySelectorAll('[data-load]').forEach(row => {
    const load = () => {
      const trip = trips.find(t => t.id === row.dataset.load);
      if (trip) { renderTrip(trip); toast('โหลดแผนที่บันทึกไว้'); }
    };
    row.addEventListener('click', load);
    row.addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
  });
  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const next = trips.filter(t => t.id !== btn.dataset.del);
      writeJSON(TRIPS_KEY, next);
      toast('ลบแผนทริปแล้ว');
      renderSaved();
    });
  });
}

async function boot() {
  places = await fetchPlaces();
  renderForm();
  renderSaved();

  $('plannerForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const trip = buildTrip();
    if (trip) renderTrip(trip);
  });

  window.addEventListener('tc-tokens', () => {});
}

document.addEventListener('DOMContentLoaded', boot);
