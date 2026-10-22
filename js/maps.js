import { GOOGLE_MAPS_API_KEY, MAP_DEFAULTS } from './config.js';

let loading;
export function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.length < 20) {
    return Promise.reject(new Error('Google Maps API key is not configured or invalid in js/config.js.'));
  }
  if (window.google?.maps) return Promise.resolve();

  loading ??= new Promise((resolve, reject) => {
    // Catch Google Maps authentication failures (e.g. invalid key, referrer blocked, billing disabled)
    window.gm_authFailure = () => {
      console.warn('Google Maps authentication failure detected.');
      const err = new Error('Google Maps API authentication failed. Check key restrictions and billing.');
      window.dispatchEvent(new CustomEvent('gmaps_error', { detail: err }));
    };

    window.__gmapsReady = () => resolve();

    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&callback=__gmapsReady&loading=async`;
    s.async = true;
    s.onerror = () => reject(new Error('Google Maps script failed to load. Check your network connection.'));
    document.head.appendChild(s);
  });
  return loading;
}

// Whole-of-Thailand map; markers are supplied by the caller.
export async function createMap(el) {
  await loadGoogleMaps();
  return new google.maps.Map(el, {
    ...MAP_DEFAULTS,
    mapTypeControl: false,
    streetViewControl: false,
    gestureHandling: 'greedy',
  });
}

export function setMarkers(map, state, places, onSelect) {
  state.markers?.forEach(m => m.setMap(null));
  state.markers = places.map(p => {
    const m = new google.maps.Marker({
      map,
      position: { lat: Number(p.lat), lng: Number(p.lng) },
      title: p.name
    });
    m.addListener('click', () => onSelect(p));
    return m;
  });

  if (places.length > 0) {
    const b = new google.maps.LatLngBounds();
    places.forEach(p => b.extend({ lat: Number(p.lat), lng: Number(p.lng) }));
    map.fitBounds(b, 48);
    if (places.length === 1) map.setZoom(15);
  }
}
