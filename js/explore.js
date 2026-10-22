import { listPlaces, getFilterOptions, esc } from './places.js';
import { createMap, setMarkers } from './maps.js';

const $ = id => document.getElementById(id);
const state = { map: null, markers: [] };
let options;

function fill(sel, rows, label) {
  sel.innerHTML = `<option value="">${label}</option>` +
    rows.map(r => `<option value="${r.id}">${esc(r.name_en ?? r.name)}</option>`).join('');
}

function updateDistricts() {
  const pid = Number($('province').value);
  fill($('district'), options.districts.filter(d => !pid || d.province_id === pid), 'All districts');
}

function renderList(places) {
  $('list').innerHTML = places.map(p => `
    <li data-id="${p.id}">
      <h2><a href="/place?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h2>
      <span class="tag">${esc(p.place_categories?.name ?? 'Place')}</span>
      <span class="tag">${esc(p.districts?.name_en ? p.districts.name_en + ', ' : '')}${esc(p.provinces?.name_en)}</span>
      <p>${esc(p.summary)}</p>
    </li>`).join('');
}

function select(p) {
  document.querySelectorAll('#list li').forEach(li => li.toggleAttribute('aria-current', li.dataset.id === p.id));
  document.querySelector(`#list li[data-id="${p.id}"]`)?.scrollIntoView({ block: 'nearest' });
  state.map?.panTo({ lat: p.lat, lng: p.lng });
}

async function refresh() {
  $('status').textContent = 'Loading…';
  try {
    const places = await listPlaces({
      search: $('search').value,
      provinceId: Number($('province').value) || null,
      districtId: Number($('district').value) || null,
      categoryId: Number($('category').value) || null,
    });
    renderList(places);
    $('status').textContent = places.length ? `${places.length} destination(s)` : 'No destinations match your filters.';
    if (state.map) setMarkers(state.map, state, places, select);
  } catch (e) {
    $('list').innerHTML = '';
    $('status').textContent = 'Could not load destinations. Please try again.';
    console.error(e);
  }
}

function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

async function init() {
  try {
    options = await getFilterOptions();
    fill($('province'), options.provinces, 'All provinces');
    fill($('category'), options.categories, 'All categories');
    updateDistricts();
  } catch (e) { console.error(e); }

  $('filters').addEventListener('submit', e => e.preventDefault());
  $('search').addEventListener('input', debounce(refresh, 300));
  $('province').addEventListener('change', () => { updateDistricts(); refresh(); });
  $('district').addEventListener('change', refresh);
  $('category').addEventListener('change', refresh);

  window.addEventListener('gmaps_error', ev => {
    $('map-error').hidden = false;
    $('map-error').textContent = (ev.detail?.message || 'Google Maps authentication error.') + ' You can continue discovering places and quests from the list below.';
  });

  try { state.map = await createMap($('map')); }
  catch (e) { $('map-error').hidden = false; $('map-error').textContent = e.message + ' The list still works.'; }
  refresh();
}
init();
