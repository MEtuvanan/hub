// search-mobile.js — text search, province/district/category filters, deck + list.

import { esc, toast } from './ui.js';
import { icon, iconFor } from './icons.js';
import { createSwipeDeck } from './swipe-deck.js';
import {
  fetchPlaces, CATEGORIES, categoryMeta,
  favoritePlaces, toggleFavoritePlace,
} from './mobile-data.js';

const $ = id => document.getElementById(id);

let places = [];
let deck = null;
let debounce = 0;

const state = {
  q: '',
  province: '',
  district: '',
  categories: new Set(),
  sort: 'recommended',
  view: 'deck',
  coords: null,
};

function favoriteSet() {
  return favoritePlaces();
}

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function distanceOf(p) {
  if (!state.coords || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  return haversine(state.coords, { lat: p.lat, lng: p.lng });
}

function provinceList() {
  return [...new Set(places.map(p => p.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
}

function districtList(province) {
  const rows = province ? places.filter(p => p.province === province) : places;
  return [...new Set(rows.map(p => p.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
}

function categoriesOf(p) {
  return [p.category, p.categoryLabel].filter(Boolean);
}

function results() {
  const q = state.q.trim().toLowerCase();
  const fav = favoriteSet();
  let rows = places.filter(p => {
    if (state.province && p.province !== state.province) return false;
    if (state.district && p.district !== state.district) return false;
    if (state.categories.size && !state.categories.has(p.category)) return false;
    if (!q) return true;
    const hay = [
      p.name, p.name_en, p.summary, p.description, p.province, p.district, p.categoryLabel,
      ...(p.tags || []),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });

  const sorters = {
    recommended: (a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0),
    rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    reviews: (a, b) => (b.reviews || 0) - (a.reviews || 0),
    name: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th'),
    distance: (a, b) => {
      const da = distanceOf(a);
      const db = distanceOf(b);
      if (da == null && db == null) return (b.rating || 0) - (a.rating || 0);
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    },
  };
  rows.sort(sorters[state.sort] || sorters.recommended);
  return rows.map(p => ({ ...p, _distance: distanceOf(p), _fav: fav.has(p.id) }));
}

function activeFilterCount() {
  let n = state.categories.size;
  if (state.province) n++;
  if (state.district) n++;
  if (state.sort !== 'recommended') n++;
  if (state.coords && state.sort === 'distance') n++;
  return n;
}

function renderActive() {
  const box = $('smActive');
  if (!box) return;
  const chips = [];
  if (state.province) chips.push({ key: 'province', label: `จังหวัด: ${state.province}` });
  if (state.district) chips.push({ key: 'district', label: `อำเภอ: ${state.district}` });
  [...state.categories].forEach(id => chips.push({ key: `cat:${id}`, label: categoryMeta(id).label }));
  if (state.coords && state.sort === 'distance') chips.push({ key: 'geo', label: 'เรียงตามระยะทาง' });
  if (state.sort !== 'recommended' && state.sort !== 'distance') {
    const labels = { rating: 'คะแนนสูงสุด', reviews: 'รีวิวมากสุด', name: 'ชื่อ ก–ฮ' };
    chips.push({ key: 'sort', label: labels[state.sort] || state.sort });
  }
  if (chips.length) chips.push({ key: 'all', label: 'ล้างทั้งหมด' });

  box.innerHTML = chips.map(c => `
    <button class="sm-active-chip" type="button" data-clear="${esc(c.key)}">
      ${esc(c.label)} ${icon('close', 11)}
    </button>`).join('');
  box.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.clear;
      if (key === 'all') clearAll();
      else if (key === 'province') { state.province = ''; state.district = ''; }
      else if (key === 'district') state.district = '';
      else if (key === 'geo') { state.coords = null; state.sort = 'recommended'; }
      else if (key === 'sort') state.sort = 'recommended';
      else if (key.startsWith('cat:')) state.categories.delete(key.slice(4));
      renderAll();
    });
  });

  const fb = $('smFilterBtn');
  if (fb) {
    const n = activeFilterCount();
    fb.classList.toggle('has-filters', n > 0);
    const badge = fb.querySelector('.sm-filter-badge');
    if (badge) { badge.textContent = String(n); badge.hidden = n === 0; }
  }
}

function imageFallback(p) {
  return `
    <img src="${esc(p.image || '')}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false">
    <span class="fallback" hidden>${iconFor(p.fallbackEmoji, 20)}</span>`;
}

function ratingMarkup(p) {
  return `<span class="g-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>${Number(p.rating || 0).toFixed(1)}</span>
    <span class="sm-card__reviews">(${Number(p.reviews || 0).toLocaleString('th-TH')})</span>`;
}

function renderCard(p) {
  const meta = categoryMeta(p.category);
  const dist = p._distance != null ? `<span class="g-chip g-chip--blue">${p._distance.toFixed(1)} กม.</span>` : '';
  return `
    <div class="sm-card">
      <div class="swipe-card__media g-media">
        <img src="${esc(p.image || '')}" alt="${esc(p.name)}" loading="lazy"
          onerror="this.style.display='none';this.parentElement.classList.add('is-fallback')">
        <span class="media-emoji">${iconFor(p.fallbackEmoji || meta.emoji, 30)}</span>
        <div class="swipe-card__top">
          <div class="app-wrap">
            <span class="g-chip" style="border-color:${meta.color}66;color:${meta.color}">${iconFor(meta.emoji, 12)} ${esc(p.categoryLabel || meta.label)}</span>
            ${p._fav ? `<span class="g-chip g-chip--danger">${icon('heart', 10)} ถูกใจ</span>` : ''}
          </div>
          ${dist}
        </div>
      </div>
      <div class="swipe-card__body">
        <h3 class="swipe-card__title">${esc(p.name)}</h3>
        <p class="swipe-card__place sm-card__district">${icon('pin', 12)} ${esc([p.district, p.province].filter(Boolean).join(' · '))}</p>
        <p class="swipe-card__desc">${esc(p.summary || 'สถานที่ท่องเที่ยวที่น่าสนใจ')}</p>
        <div class="swipe-card__stats">
          <span class="app-inline">${ratingMarkup(p)}</span>
          <span class="sm-card__open">แตะดูสถานที่ ${icon('arrow-right', 13)}</span>
        </div>
      </div>
    </div>`;
}

function renderList(rows) {
  if (!rows.length) return `<div class="sm-empty">
      <div class="emoji">${icon('search', 30)}</div><h3>ไม่พบสถานที่ที่ตรงกับเงื่อนไข</h3>
      <p>ลองลบตัวกรองบางอย่าง หรือค้นหาด้วยชื่อจังหวัด/อำเภอ</p>
      <button class="g-btn g-btn--sm g-btn--mint" type="button" data-clear-all>ล้างตัวกรอง</button>
    </div>`;
  return rows.map(p => {
    const meta = categoryMeta(p.category);
    const dist = p._distance != null ? ` · ${p._distance.toFixed(1)} กม.` : '';
    return `
    <article class="sm-result" data-place="${esc(p.id)}" tabindex="0" role="link" aria-label="${esc(p.name)}">
      <span class="sm-result__media">${imageFallback(p)}</span>
      <div class="sm-result__body">
        <h3>${esc(p.name)}</h3>
        <span class="sm-result__meta">
          ${ratingMarkup(p)}
          <span>· ${esc(p.province || '')}${dist}</span>
        </span>
        <p class="sm-result__summary">${esc(p.summary || '')}</p>
        <span class="sm-result__meta">${iconFor(meta.icon || meta.emoji, 12)} ${esc(p.categoryLabel || meta.label)}</span>
      </div>
      <button class="sm-result__fav ${p._fav ? 'is-on' : ''}" type="button" data-fav="${esc(p.id)}" aria-label="${p._fav ? 'เอาออกจากรายการถูกใจ' : 'เพิ่มในรายการถูกใจ'}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.7 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
      </button>
    </article>`;
  }).join('');
}

function renderAll() {
  const rows = results();
  const count = $('smCount');
  if (count) count.innerHTML = `<b>${rows.length}</b> สถานที่`;
  renderActive();

  const note = $('smSortNote');
  if (note) {
    const labels = { recommended: 'แนะนำสำหรับคุณ', rating: 'คะแนนสูงสุด', reviews: 'รีวิวมากที่สุด', name: 'ชื่อ ก–ฮ', distance: state.coords ? 'ใกล้คุณที่สุด' : 'ต้องเปิดตำแหน่งก่อน' };
    note.innerHTML = `${icon('filter', 12)} ${esc(labels[state.sort] || '')}`;
  }

  const deckPanel = $('smDeckPanel');
  const listPanel = $('smListPanel');
  if (deckPanel) deckPanel.hidden = state.view !== 'deck';
  if (listPanel) listPanel.hidden = state.view !== 'list';

  if (state.view === 'deck') {
    if (!deck) {
      deck = createSwipeDeck({
        mount: $('searchDeck'),
        items: rows,
        renderCard,
        likeLabel: 'ถูกใจ',
        passLabel: 'ข้าม',
        emptyHTML: () => `<div class="sm-empty" style="min-height:420px">
          <div class="emoji">${icon('compass', 30)}</div><h3>ไม่พบสถานที่ที่ตรงกับเงื่อนไข</h3>
          <p>ลองเปลี่ยนจังหวัด อำเภอ หรือหมวดหมู่ แล้วปัดการ์ดอีกครั้ง</p>
          <button class="g-btn g-btn--sm g-btn--mint" type="button" data-clear-all>ล้างตัวกรอง</button>
        </div>`,
        onLike: p => {
          toggleFavoritePlace(p.id);
        },
        onPass: () => {},
        onInfo: p => { location.href = `/place-mobile.html?id=${encodeURIComponent(p.id)}`; },
      });
      $('searchDeck')?.addEventListener('click', e => {
        if (e.target.closest('[data-clear-all]')) clearAll();
      });
    } else {
      deck.setItems(rows);
    }
  } else {
    const list = $('searchList');
    if (list) {
      list.innerHTML = renderList(rows);
      list.querySelectorAll('[data-fav]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          toggleFavoritePlace(btn.dataset.fav);
          renderAll();
        });
      });
      list.querySelectorAll('[data-place]').forEach(row => {
        const go = () => { location.href = `/place-mobile.html?id=${encodeURIComponent(row.dataset.place)}`; };
        row.addEventListener('click', go);
        row.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      });
      list.querySelector('[data-clear-all]')?.addEventListener('click', clearAll);
    }
  }
}

function clearAll() {
  state.q = '';
  state.province = '';
  state.district = '';
  state.categories.clear();
  state.sort = 'recommended';
  state.coords = null;
  const input = $('smInput');
  if (input) input.value = '';
  $('smClearInput')?.classList.remove('is-visible');
  syncFilterUI();
  renderAll();
}

/* ---------------------------- filter sheet ---------------------------- */
function populateSelects() {
  const pSel = $('smProvince');
  if (pSel) {
    const current = state.province;
    pSel.innerHTML = `<option value="">ทุกจังหวัด</option>` +
      provinceList().map(p => `<option value="${esc(p)}" ${p === current ? 'selected' : ''}>${esc(p)}</option>`).join('');
    pSel.value = current;
  }
  const dSel = $('smDistrict');
  if (dSel) {
    const list = districtList(state.province);
    dSel.innerHTML = `<option value="">ทุกอำเภอ / เขต</option>` +
      list.map(d => `<option value="${esc(d)}" ${d === state.district ? 'selected' : ''}>${esc(d)}</option>`).join('');
    dSel.value = state.district;
    dSel.disabled = false;
  }
}

function syncFilterUI() {
  populateSelects();
  document.querySelectorAll('[data-sm-cat]').forEach(btn => {
    btn.classList.toggle('is-active', state.categories.has(btn.dataset.smCat));
  });
  const sort = $('smSort');
  if (sort) sort.value = state.sort;
  const geo = $('smGeo');
  geo?.classList.toggle('is-on', !!state.coords);
  const geoLabel = geo?.querySelector('span');
  if (geoLabel) geoLabel.textContent = state.coords ? 'ใช้ตำแหน่งของคุณอยู่' : 'เรียงผลลัพธ์ตามระยะทางจากคุณ';
}

function openFilter() {
  syncFilterUI();
  $('filterSheet')?.showModal();
}

function bindFilters() {
  $('smFilterBtn')?.addEventListener('click', openFilter);
  document.querySelectorAll('[data-close-filter]').forEach(btn => btn.addEventListener('click', () => $('filterSheet')?.close()));

  $('smProvince')?.addEventListener('change', e => {
    state.province = e.target.value;
    state.district = '';
    populateSelects();
  });
  $('smDistrict')?.addEventListener('change', e => {
    state.district = e.target.value;
    if (state.district && !state.province) {
      const match = places.find(p => p.district === state.district);
      if (match?.province) {
        state.province = match.province;
        const pSel = $('smProvince');
        if (pSel) pSel.value = match.province;
        populateSelects();
      }
    }
  });
  $('smSort')?.addEventListener('change', e => { state.sort = e.target.value; });

  $('smGeo')?.addEventListener('click', () => {
    if (!navigator.geolocation) { toast('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง', 'error'); return; }
    const geo = $('smGeo');
    geo?.classList.add('is-on');
    const label = geo?.querySelector('span');
    if (label) label.textContent = 'กำลังหาตำแหน่ง…';
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.sort = 'distance';
        syncFilterUI();
        toast('เปิดตำแหน่งแล้ว · เรียงตามระยะทาง');
      },
      () => {
        geo?.classList.remove('is-on');
        if (label) label.textContent = 'ไม่สามารถเข้าถึงตำแหน่งได้';
        toast('ไม่สามารถเข้าถึงตำแหน่งได้', 'error');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  });

  $('smApply')?.addEventListener('click', () => {
    $('filterSheet')?.close();
    renderAll();
  });
  $('smReset')?.addEventListener('click', () => { clearAll(); });

  $('smClearInput')?.addEventListener('click', () => {
    const input = $('smInput');
    if (input) input.value = '';
    state.q = '';
    $('smClearInput')?.classList.remove('is-visible');
    renderAll();
  });

  document.querySelectorAll('[data-sm-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.smView;
      document.querySelectorAll('[data-sm-view]').forEach(b => b.classList.toggle('is-active', b.dataset.smView === state.view));
      renderAll();
    });
  });
}

function renderCategoryChoices() {
  const box = $('smCategories');
  if (!box) return;
  box.innerHTML = CATEGORIES.map(c => `
    <button class="sm-choice ${state.categories.has(c.id) ? 'is-active' : ''}" type="button" data-sm-cat="${esc(c.id)}">
      <span class="emoji">${iconFor(c.emoji, 13)}</span>${esc(c.label)}
    </button>`).join('');
  box.querySelectorAll('[data-sm-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.smCat;
      if (state.categories.has(id)) state.categories.delete(id); else state.categories.add(id);
      btn.classList.toggle('is-active', state.categories.has(id));
    });
  });
}

async function boot() {
  renderCategoryChoices();
  bindFilters();
  places = await fetchPlaces();
  populateSelects();
  renderAll();

  const input = $('smInput');
  input?.addEventListener('input', e => {
    state.q = e.target.value;
    $('smClearInput')?.classList.toggle('is-visible', !!state.q);
    clearTimeout(debounce);
    debounce = setTimeout(renderAll, 220);
  });

  window.addEventListener('tc-tokens', renderAll);
}

document.addEventListener('DOMContentLoaded', boot);
