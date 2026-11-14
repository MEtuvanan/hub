// ar-map.js — real interactive map (Leaflet + OpenStreetMap tiles, exact same engine as PC)
// with a CSS chibi avatar that walks on it, plus joystick / tap controls, place pins and HUD.

import { loadOutfit } from './mobile-data.js';
import { icon, iconFor } from './icons.js';
import { esc } from './ui.js';

const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 }; // Bangkok
const DEFAULT_ZOOM = 16;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;
const WALK_SPEED = 24;   // m/s
const SPRINT_SPEED = 58; // m/s

const CAT_ICON = {
  temple: 'building', nature: 'leaf', beach: 'sun',
  market: 'store', culture: 'book', park: 'leaf',
};
const CAT_COLOR = {
  temple: '#C8961F', nature: '#0F8A5F', beach: '#2E8FB5',
  market: '#D9822B', culture: '#0F8A5F', park: '#3F9E6B',
};
const ACCESSORY_ICON = { camera: 'camera', backpack: 'store', map: 'map', sword: 'flag' };

const rad = deg => (deg * Math.PI) / 180;

function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(s)));
}

function offsetLatLng(base, northM, eastM) {
  const lat = base.lat + northM / 111320;
  const lng = base.lng + eastM / (111320 * Math.max(0.15, Math.cos(rad(base.lat))));
  return { lat, lng };
}

function formatDistance(m) {
  if (!Number.isFinite(m)) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} กม.`;
  return `${Math.max(0, Math.round(m))} ม.`;
}

/* ------------------------------ script loading ------------------------------ */
let leafletPromise = null;
function loadLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = (async () => {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Leaflet'));
      document.head.appendChild(s);
    });
    return window.L || null;
  })();
  return leafletPromise;
}

function boundsOf(places) {
  const valid = places.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!valid.length) return null;
  return {
    south: Math.min(...valid.map(p => p.lat)),
    north: Math.max(...valid.map(p => p.lat)),
    west: Math.min(...valid.map(p => p.lng)),
    east: Math.max(...valid.map(p => p.lng)),
  };
}

/* --------------------------------- avatar ---------------------------------- */
function avatarHTML() {
  return `
    <div class="ar-avatar" id="arAvatar" aria-hidden="true">
      <div class="ar-avatar__tag"><b data-ar-name>นักเดินทาง</b><span data-ar-lv>Lv.1</span></div>
      <div class="ar-avatar__figure" data-figure>
        <div class="doll-shadow"></div>
        <div class="doll">
          <div class="doll__head">
            <div class="doll__face"><i class="eye eye--l"></i><i class="eye eye--r"></i><i class="mouth"></i><i class="blush blush--l"></i><i class="blush blush--r"></i></div>
            <div class="doll__hair"></div>
            <div class="doll__hat"></div>
          </div>
          <div class="doll__torso">
            <div class="doll__top"></div>
            <div class="doll__arm doll__arm--l"></div>
            <div class="doll__arm doll__arm--r"></div>
            <div class="doll__accessory"></div>
          </div>
          <div class="doll__legs">
            <div class="doll__leg doll__leg--l"></div>
            <div class="doll__leg doll__leg--r"></div>
          </div>
        </div>
      </div>
      <div class="ar-avatar__spark"></div>
    </div>`;
}

function applyOutfit(root, outfit) {
  const fig = root.querySelector('[data-figure]');
  const avatar = root.querySelector('#arAvatar');
  if (!fig || !avatar) return;
  avatar.dataset.hair = outfit.hair;
  avatar.dataset.top = outfit.top;
  avatar.dataset.bottom = outfit.bottom;
  avatar.dataset.hat = outfit.hat;
  avatar.dataset.shoes = outfit.shoes;
  avatar.dataset.accessory = outfit.accessory;
  const styles = {
    '--doll-skin': outfit.skin,
    '--doll-hair': outfit.hairColor,
    '--doll-top': outfit.topColor,
    '--doll-bottom': outfit.bottomColor,
    '--doll-shoe': outfit.shoeColor,
    '--doll-hat': outfit.hatColor,
  };
  Object.entries(styles).forEach(([k, v]) => { if (v) fig.style.setProperty(k, v); });
  const acc = fig.querySelector('.doll__accessory');
  if (acc) {
    const name = ACCESSORY_ICON[outfit.accessory];
    acc.innerHTML = name ? icon(name, 13) : '';
  }
  const hat = fig.querySelector('.doll__hat');
  if (hat) hat.className = `doll__hat doll__hat--${outfit.hat || 'none'}`;
}

/* -------------------------------- the map ---------------------------------- */
export function initARMap(container, {
  places = [],
  interactive = true,
  compact = false,
  autoWalk = false,
  showPins = true,
  fitPlaces = false,
  focus = { x: 0, y: 0 },
  center = null,
  zoom = DEFAULT_ZOOM,
  onPlaceClick = null,
  onArrive = null,
  onMove = null,
} = {}) {
  if (!container) return null;
  container.classList.add('ar-world', compact ? 'ar-world--compact' : 'ar-world--full');

  container.innerHTML = `
    <div class="ar-map" data-map></div>
    <div class="ar-map__tint" aria-hidden="true"></div>
    <div class="ar-pins" data-pins></div>
    <div class="ar-weather">${icon('sun', 14)}<span>28°</span><span class="ar-weather__live">AR LIVE</span></div>
    ${avatarHTML()}
    ${interactive ? `
      <div class="ar-joystick" data-joystick aria-label="จอยสติ๊กเดิน"><span class="ar-joystick__ring"></span><span class="ar-joystick__knob" data-knob></span></div>
      <div class="ar-controls">
        <button class="ar-ctrl" type="button" data-sprint title="วิ่ง" aria-label="วิ่ง">${icon('flame', 17)}</button>
        <button class="ar-ctrl" type="button" data-recenter title="กลับจุดเริ่ม" aria-label="กลับจุดเริ่ม">${icon('gps', 17)}</button>
      </div>
      <div class="ar-hint">ลากแผนที่ หรือใช้จอยสติ๊กเพื่อเดิน</div>
    ` : `<div class="ar-hint">${compact ? 'ลากแผนที่เพื่อสำรวจ' : 'แตะหมุดเพื่อสำรวจสถานที่'}</div>`}
    <div class="ar-vignette"></div>`;

  const mapEl = container.querySelector('[data-map]');
  const pinsEl = container.querySelector('[data-pins]');
  const avatar = container.querySelector('#arAvatar');
  const joystick = container.querySelector('[data-joystick]');
  const knob = container.querySelector('[data-knob]');
  const sprintBtn = container.querySelector('[data-sprint]');
  const recenterBtn = container.querySelector('[data-recenter]');

  applyOutfit(container, loadOutfit());

  const startLat = Number.isFinite(center?.lat) ? Number(center.lat) : (places[0]?.lat ? Number(places[0].lat) : DEFAULT_CENTER.lat);
  const startLng = Number.isFinite(center?.lng) ? Number(center.lng) : (places[0]?.lng ? Number(places[0].lng) : DEFAULT_CENTER.lng);
  const start = { lat: startLat, lng: startLng };

  const state = {
    player: { ...start },
    home: { ...start },
    startZoom: zoom,
    target: null,
    arrivePlace: null,
    stick: { x: 0, y: 0, active: false },
    keys: new Set(),
    sprint: false,
    walking: false,
    facing: 1,
    follow: true,
    vw: 360,
    vh: 320,
    offset: { x: focus?.x || 0, y: focus?.y || 0 },
    lMap: null,
    ready: false,
    destroyed: false,
    raf: 0,
    last: 0,
    pins: [],
  };

  /* pins ---------------------------------------------------------------- */
  function pinMarkup(pin) {
    const color = CAT_COLOR[pin.place.category] || '#0F8A5F';
    const ico = CAT_ICON[pin.place.category] || 'pin';
    return `<button class="ar-pin" type="button" data-place-id="${esc(pin.place.id)}" style="--pin-color:${color}" aria-label="${esc(pin.place.name)}">
      <span class="ar-pin__beacon">${icon(ico, 15)}</span>
      <span class="ar-pin__label">${esc(pin.place.name)}<small data-pin-dist>—</small></span>
    </button>`;
  }

  function bindPins() {
    state.pins.forEach(pin => {
      pin.el = pinsEl.querySelector(`[data-place-id="${CSS.escape(String(pin.place.id))}"]`);
      pin.el?.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        setTarget(pin.place.lat, pin.place.lng, pin.place);
        onPlaceClick?.(pin.place, pin);
      });
    });
  }

  function buildPins(list) {
    state.pins = (list || []).filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))).map(place => ({
      place: { ...place, lat: Number(place.lat), lng: Number(place.lng) },
      el: null,
    }));
    if (showPins) {
      pinsEl.innerHTML = state.pins.map(pinMarkup).join('');
      bindPins();
    } else {
      pinsEl.innerHTML = '';
    }
  }

  function setTarget(lat, lng, place = null) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    state.target = { lat, lng };
    state.arrivePlace = place;
    state.follow = true;
  }

  function walkToPlace(place) {
    if (!place || !Number.isFinite(Number(place.lat))) return;
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    const d = haversine(state.player, { lat, lng });
    if (d > 1800) {
      // Reposition avatar near destination so walk doesn't take 10 minutes
      const scale = 320 / d;
      const north = (state.player.lat - lat) * scale;
      const east = (state.player.lng - lng) * scale;
      state.player = { lat: lat + north, lng: lng + east };
      if (state.lMap) state.lMap.setView([lat, lng], Math.max(15, state.lMap.getZoom()), { animate: false });
    } else if (state.lMap) {
      state.lMap.panTo([lat, lng], { animate: true, duration: 0.8 });
    }
    setTarget(lat, lng, place);
  }

  /* movement ------------------------------------------------------------ */
  function step(dt) {
    let dx = 0;
    let dy = 0;
    if (state.stick.active) {
      dx = state.stick.x;
      dy = state.stick.y;
    } else if (state.keys.size) {
      if (state.keys.has('ArrowLeft') || state.keys.has('a')) dx -= 1;
      if (state.keys.has('ArrowRight') || state.keys.has('d')) dx += 1;
      if (state.keys.has('ArrowUp') || state.keys.has('w')) dy -= 1;
      if (state.keys.has('ArrowDown') || state.keys.has('s')) dy += 1;
    }

    const manual = Math.hypot(dx, dy) > 0.08;
    if (manual) {
      state.target = null;
      state.arrivePlace = null;
    } else if (state.target) {
      const distance = haversine(state.player, state.target);
      if (distance < 5) {
        const arrived = state.arrivePlace;
        state.target = null;
        state.arrivePlace = null;
        if (arrived) onArrive?.(arrived);
      } else {
        const north = (state.target.lat - state.player.lat) * 111320;
        const east = (state.target.lng - state.player.lng) * 111320 * Math.cos(rad(state.player.lat));
        const mag = Math.hypot(north, east) || 1;
        const scale = Math.min(1, distance / 60);
        dx = (east / mag) * scale;
        dy = (-north / mag) * scale;
      }
    }

    const mag = Math.hypot(dx, dy);
    if (mag > 0.04) {
      const meters = (state.sprint ? SPRINT_SPEED : WALK_SPEED) * dt * Math.min(1, mag);
      const nx = dx / mag;
      const ny = dy / mag;
      state.player = offsetLatLng(state.player, -ny * meters, nx * meters);
      state.walking = true;
      if (Math.abs(nx) > 0.08) state.facing = nx < 0 ? -1 : 1;
    } else {
      state.walking = false;
    }

    if (!state.walking && autoWalk && !state.target && Math.random() < 0.006) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 90;
      state.target = offsetLatLng(state.player, Math.sin(angle) * radius, Math.cos(angle) * radius);
    }

    if (state.follow) followPlayer();
  }

  function followPlayer() {
    const map = state.lMap;
    if (!map) return;
    try {
      const pt = map.latLngToContainerPoint([state.player.lat, state.player.lng]);
      if (!pt) return;
      const cx = state.vw / 2 + state.offset.x * state.vw;
      const cy = state.vh / 2 + state.offset.y * state.vh;
      const padX = Math.max(30, state.vw * 0.16);
      const padY = Math.max(30, state.vh * 0.16);
      let px = 0;
      let py = 0;
      if (pt.x < cx - padX) px = pt.x - (cx - padX);
      else if (pt.x > cx + padX) px = pt.x - (cx + padX);
      if (pt.y < cy - padY) py = pt.y - (cy - padY);
      else if (pt.y > cy + padY) py = pt.y - (cy + padY);
      if (px || py) map.panBy([px, py], { animate: false });
    } catch { /* ignore */ }
  }

  /* rendering ----------------------------------------------------------- */
  function render() {
    const map = state.lMap;
    if (!map) return;

    try {
      const pt = map.latLngToContainerPoint([state.player.lat, state.player.lng]);
      if (pt) {
        avatar.style.left = `${pt.x}px`;
        avatar.style.top = `${pt.y}px`;
      }
    } catch { /* ignore */ }

    avatar.classList.toggle('is-walking', state.walking);
    avatar.classList.toggle('is-left', state.facing < 0);

    state.pins.forEach(pin => {
      const el = pin.el;
      if (!el) return;
      try {
        const p = map.latLngToContainerPoint([pin.place.lat, pin.place.lng]);
        if (!p) { el.style.display = 'none'; return; }
        const visible = p.x > -90 && p.x < state.vw + 90 && p.y > -70 && p.y < state.vh + 90;
        el.style.display = visible ? '' : 'none';
        if (!visible) return;
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
        const distance = haversine(state.player, { lat: pin.place.lat, lng: pin.place.lng });
        const near = distance < 260;
        el.classList.toggle('is-near', near);
        const small = el.querySelector('[data-pin-dist]');
        if (small) small.textContent = formatDistance(distance);
      } catch {
        el.style.display = 'none';
      }
    });

    const nearest = state.pins.reduce((best, pin) => {
      const d = haversine(state.player, { lat: pin.place.lat, lng: pin.place.lng });
      return d < best.d ? { d, pin } : best;
    }, { d: Infinity, pin: null });

    container.querySelectorAll('[data-ar-nearest]').forEach(el => {
      el.textContent = nearest.pin ? `${nearest.pin.place.name} · ${formatDistance(nearest.d)}` : '—';
    });
    container.querySelectorAll('[data-ar-near-count]').forEach(el => {
      el.textContent = String(state.pins.filter(pin =>
        haversine(state.player, { lat: pin.place.lat, lng: pin.place.lng }) < 800).length);
    });

    onMove?.({ lat: state.player.lat, lng: state.player.lng, walking: state.walking });
  }

  function loop(now) {
    if (state.destroyed) return;
    const dt = Math.min(0.05, (now - state.last) / 1000 || 0.016);
    state.last = now;
    step(dt);
    render();
    state.raf = requestAnimationFrame(loop);
  }

  /* mount --------------------------------------------------------------- */
  async function mount() {
    const L = await loadLeaflet();
    if (state.destroyed) return;
    if (!L) {
      container.classList.add('ar-map--offline');
      mapEl.innerHTML = `<div class="ar-map__offline">${icon('map', 20)}<span>โหลดแผนที่ไม่สำเร็จ</span></div>`;
      return;
    }

    mapEl.innerHTML = '';
    const map = L.map(mapEl, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      fadeAnimation: true,
      zoomAnimation: true,
      preferCanvas: true,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    }).setView([state.player.lat, state.player.lng], zoom);

    // Exact same OpenStreetMap tile layer as PC explore.html / maps.js
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    state.lMap = map;
    state.ready = true;

    map.on('move', render);
    map.on('zoom', render);
    map.on('resize', render);

    if (fitPlaces) {
      const bounds = boundsOf(state.pins.map(p => p.place));
      if (bounds) {
        map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { padding: [48, 48], maxZoom: 16 });
      }
    }

    if (interactive) {
      map.on('click', e => {
        if (e.latlng) setTarget(e.latlng.lat, e.latlng.lng);
      });
      map.on('dragstart', () => { state.follow = false; });
    }

    map.invalidateSize();
    followPlayer();
    render();

    requestAnimationFrame(t => {
      state.last = t;
      state.raf = requestAnimationFrame(loop);
    });
  }

  /* controls ------------------------------------------------------------ */
  if (joystick) {
    let active = false;
    let centerPt = { x: 0, y: 0 };
    const radius = 34;
    const move = e => {
      if (!active) return;
      const dx = e.clientX - centerPt.x;
      const dy = e.clientY - centerPt.y;
      const mag = Math.hypot(dx, dy);
      const clamp = Math.min(1, mag / radius);
      const ux = mag ? dx / mag : 0;
      const uy = mag ? dy / mag : 0;
      state.stick = { x: ux * clamp, y: uy * clamp, active: true };
      state.follow = true;
      if (knob) knob.style.transform = `translate(${ux * clamp * radius}px, ${uy * clamp * radius}px)`;
    };
    const end = () => {
      active = false;
      state.stick = { x: 0, y: 0, active: false };
      if (knob) knob.style.transform = '';
    };
    joystick.addEventListener('pointerdown', e => {
      active = true;
      const r = joystick.getBoundingClientRect();
      centerPt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      joystick.setPointerCapture(e.pointerId);
      move(e);
    });
    joystick.addEventListener('pointermove', move);
    joystick.addEventListener('pointerup', end);
    joystick.addEventListener('pointercancel', end);
  }

  sprintBtn?.addEventListener('click', () => {
    state.sprint = !state.sprint;
    sprintBtn.classList.toggle('is-on', state.sprint);
  });

  function recenter() {
    state.target = null;
    state.arrivePlace = null;
    state.player = { ...state.home };
    state.follow = true;
    if (state.lMap) state.lMap.setView([state.home.lat, state.home.lng], state.startZoom, { animate: true });
  }
  recenterBtn?.addEventListener('click', recenter);

  const onKeyDown = e => {
    if (!interactive) return;
    if (e.target?.matches?.('input, textarea, select, [contenteditable]')) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(e.key)) {
      state.keys.add(e.key);
      state.follow = true;
      if (e.key.startsWith('Arrow')) e.preventDefault();
    }
  };
  const onKeyUp = e => state.keys.delete(e.key);
  if (interactive) {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }

  const resize = () => {
    const r = container.getBoundingClientRect();
    state.vw = Math.max(200, r.width);
    state.vh = Math.max(160, r.height);
    try { state.lMap?.invalidateSize(); } catch {}
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  buildPins(places);
  mount();

  container.__arMap = { state, map: () => state.lMap };

  return {
    destroy() {
      state.destroyed = true;
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      if (interactive) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
      }
      try { state.lMap?.remove(); } catch {}
      state.lMap = null;
    },
    walkToPlace,
    setPlaces(next, { fit = fitPlaces } = {}) {
      buildPins(next);
      if (fit && state.lMap) {
        const bounds = boundsOf(state.pins.map(p => p.place));
        if (bounds) {
          state.lMap.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { padding: [48, 48], maxZoom: 16 });
        }
      }
      render();
    },
    setOutfit(outfit) {
      applyOutfit(container, outfit);
    },
    getNameEl() { return container.querySelector('[data-ar-name]'); },
    getLevelEl() { return container.querySelector('[data-ar-lv]'); },
    getPlayer() { return { ...state.player }; },
    recenter,
    getEngine() { return 'leaflet'; },
  };
}
