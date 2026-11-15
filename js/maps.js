import { GOOGLE_MAPS_API_KEY, MAP_DEFAULTS } from './config.js';

let gmapsPromise = null;
let leafletPromise = null;

function loadGoogleMaps() {
  if (!/^AIza[\w-]{30,}$/.test(GOOGLE_MAPS_API_KEY)) {
    return Promise.reject(new Error('Google Maps key is not in AIza... format'));
  }
  if (window.google?.maps?.Map) return Promise.resolve();

  gmapsPromise ??= new Promise((resolve, reject) => {
    window.gm_authFailure = () => {
      reject(new Error('Google Maps rejected key'));
    };
    window.__gmapsReady = () => resolve();
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&callback=__gmapsReady&loading=async&v=weekly`;
    s.async = true;
    s.onerror = () => reject(new Error('Google Maps failed to load.'));
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

function loadLeaflet() {
  if (window.L?.map) return Promise.resolve();
  leafletPromise ??= new Promise((resolve, reject) => {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load map library.'));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

// Unified Map Factory: Google Maps (if AIza key provided) or Leaflet/CartoDB (free fallback)
export async function createMap(el) {
  // If key starts with AIza, try Google Maps
  if (/^AIza[\w-]{30,}$/.test(GOOGLE_MAPS_API_KEY)) {
    try {
      await loadGoogleMaps();
      return new google.maps.Map(el, {
        ...MAP_DEFAULTS, mapTypeControl: false, streetViewControl: false, gestureHandling: 'greedy',
      });
    } catch (e) {
      console.warn('Google Maps unavailable, using interactive Leaflet map:', e.message);
    }
  }

  // Interactive Map Engine (OpenStreetMap tiles - crisp, reliable, Thai & English, 100% free)
  await loadLeaflet();
  el.innerHTML = '';
  const lat = MAP_DEFAULTS.center?.lat || 13.7563;
  const lng = MAP_DEFAULTS.center?.lng || 100.5018;
  const zoom = MAP_DEFAULTS.zoom || 7;

  const lMap = L.map(el, { zoomControl: true }).setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(lMap);

  lMap._isLeaflet = true;
  const originalPanTo = lMap.panTo.bind(lMap);
  lMap.panTo = (target, options) => {
    if (target && typeof target === 'object' && 'lat' in target && 'lng' in target) {
      return originalPanTo([target.lat, target.lng], options);
    }
    return originalPanTo(target, options);
  };

  return lMap;
}

const pos = p => ({ lat: Number(p.lat), lng: Number(p.lng) });

export function setMarkers(map, state, places, onSelect, { fit = true } = {}) {
  if (map._isLeaflet) {
    state.markers?.forEach(m => m.remove());
    state.markers = places.map(p => {
      const hasBoss = !!p.boss;
      const pinColor = hasBoss ? 'linear-gradient(135deg, #E040FB, #6200EA)' : 'linear-gradient(135deg, #00A86B, #0B251B)';
      const pinIcon = hasBoss ? '⚔️' : '';
      const pinShadow = hasBoss ? '0 0 16px rgba(224,64,251,0.7)' : '0 4px 12px rgba(0,0,0,0.3)';
      const pin = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background:${pinColor};width:32px;height:32px;border-radius:50%;border:2.5px solid #fff;box-shadow:${pinShadow};display:grid;place-items:center;color:#fff;font-size:14px;cursor:pointer;">${pinIcon}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
      const m = L.marker([Number(p.lat), Number(p.lng)], { icon: pin, title: p.name }).addTo(map);
      const popupHtml = `
        <div style="font-family:inherit;min-width:170px;padding:2px 0;">
          <strong style="font-size:13px;display:block;margin-bottom:4px;color:#1a202c;">${p.name}</strong>
          ${hasBoss ? `<div style="font-size:11px;color:#7B1FA2;font-weight:700;margin-bottom:6px;">⚔️ บอส: ${p.boss.name} (Lv.${p.boss.level})</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            <a href="/place.html?id=${encodeURIComponent(p.id)}" style="display:inline-block;padding:3px 8px;background:#e2e8f0;color:#2d3748;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600;">ดูข้อมูล</a>
            <a href="/navigate.html?lat=${p.lat}&lng=${p.lng}&name=${encodeURIComponent(p.name)}&id=${encodeURIComponent(p.id)}" style="display:inline-block;padding:3px 8px;background:#00A86B;color:#fff;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600;">นำทาง</a>
            ${hasBoss ? `<button type="button" class="btn-popup-boss" data-boss-id="${p.boss.id}" data-place-id="${p.id}" style="display:inline-block;padding:4px 8px;background:linear-gradient(135deg,#D500F9,#7C4DFF);color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;">ท้าบอส</button>` : ''}
          </div>
        </div>
      `;
      m.bindPopup(popupHtml);
      m.on('popupopen', () => {
        const btn = document.querySelector(`.btn-popup-boss[data-boss-id="${p.boss?.id}"]`);
        if (btn) {
          btn.onclick = () => {
            window.dispatchEvent(new CustomEvent('tc-open-boss-battle', { detail: { boss: p.boss, place: p } }));
          };
        }
      });
      m.on('click', () => {
        m.openPopup();
        if (typeof onSelect === 'function') onSelect(p);
      });
      return m;
    });

    if (fit && places.length) {
      if (places.length === 1) {
        map.setView([Number(places[0].lat), Number(places[0].lng)], 14);
      } else {
        const bounds = L.latLngBounds(places.map(p => [Number(p.lat), Number(p.lng)]));
        map.fitBounds(bounds, { padding: [48, 48] });
      }
    }
    return;
  }
      m.bindPopup(popupHtml);
      m.on('click', () => {
        m.openPopup();
        if (typeof onSelect === 'function') onSelect(p);
      });
      return m;
    });

    if (fit && places.length) {
      if (places.length === 1) {
        map.setView([Number(places[0].lat), Number(places[0].lng)], 14);
      } else {
        const bounds = L.latLngBounds(places.map(p => [Number(p.lat), Number(p.lng)]));
        map.fitBounds(bounds, { padding: [48, 48] });
      }
    }
    return;
  }

  // Google Maps implementation
  state.markers?.forEach(m => m.setMap(null));
  state.markers = places.map(p => {
    const m = new google.maps.Marker({ map, position: pos(p), title: p.name });
    m.addListener('click', () => onSelect(p));
    return m;
  });
  if (fit && places.length) {
    const b = new google.maps.LatLngBounds();
    places.forEach(p => b.extend(pos(p)));
    map.fitBounds(b, 48);
    if (places.length === 1) map.setZoom(15);
  }
}

export function drawPath(map, state, places) {
  if (!places?.length) return;
  if (map._isLeaflet) {
    state.line?.remove();
    state.line = L.polyline(places.map(p => [Number(p.lat), Number(p.lng)]), {
      color: '#00A86B',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);
    return;
  }

  // Google Maps polyline
  state.line?.setMap(null);
  state.line = new google.maps.Polyline({
    map, path: places.map(pos), strokeColor: '#00A86B', strokeOpacity: .9, strokeWeight: 4,
    geodesic: true,
  });
}

// SerpApi Google Maps Search (using user's SerpApi key)
export async function searchGoogleMapsSerpApi(query, { lat, lng } = {}) {
  const params = new URLSearchParams({
    engine: 'google_maps',
    q: query,
    api_key: GOOGLE_MAPS_API_KEY
  });
  if (lat && lng) {
    params.set('ll', `@${lat},${lng},14z`);
  }
  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!res.ok) throw new Error(`SerpApi failed: HTTP ${res.status}`);
  return await res.json();
}
