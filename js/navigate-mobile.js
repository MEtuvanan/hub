// navigate-mobile.js — resolve a place from URL, show OSM map and distance.

import { toast } from './ui.js';
import { findPlace, fetchPlaces } from './mobile-data.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

let target = null;

function haversine(a, b) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${km.toFixed(1)} กม.`;
}

function mapUrl(lat, lng) {
  const d = 0.012;
  const bbox = [lng - d, lat - d, lng + d, lat + d].map(n => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function applyTarget() {
  if (!target) return;
  const name = target.name || 'สถานที่ท่องเที่ยว';
  document.title = `นำทางไป ${name} — Travel and Challenge`;
  $('navName').textContent = name;
  $('navEmoji').textContent = target.fallbackEmoji || target.emoji || '📍';
  $('navMeta').textContent = [target.district, target.province].filter(Boolean).join(' · ') ||
    target.summary || 'สถานที่ท่องเที่ยว';
  $('navSub').textContent = `เส้นทางและระยะทางไปยัง ${name}`;
  $('navDetail').href = target.id ? `/place-mobile.html?id=${encodeURIComponent(target.id)}` : '/explore-mobile.html';

  const lat = Number(target.lat);
  const lng = Number(target.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    $('navMap').src = mapUrl(lat, lng);
    $('navCoords').textContent = `พิกัด ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    $('navGoogle').href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else {
    $('navMapWrap').hidden = true;
    $('navCoords').textContent = 'ยังไม่มีพิกัดสำหรับสถานที่นี้';
    $('navGoogle').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
    $('navLocate').disabled = true;
  }

  $('navCopy').addEventListener('click', async () => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast('สถานที่นี้ยังไม่มีพิกัด', 'error');
      return;
    }
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('คัดลอกพิกัดแล้ว');
    } catch {
      toast(text);
    }
  });

  $('navLocate').addEventListener('click', locate);
}

function locate() {
  if (!target || !Number.isFinite(Number(target.lat))) return;
  const btn = $('navLocate');
  if (!navigator.geolocation) {
    toast('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง', 'error');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'กำลังหาตำแหน่ง…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const km = haversine(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        { lat: Number(target.lat), lng: Number(target.lng) }
      );
      $('navDistance').textContent = formatDistance(km);
      $('navDistanceNote').textContent = km < 1
        ? 'คุณอยู่ใกล้มาก — เดินต่ออีกนิด'
        : `ห่างจากคุณประมาณ ${formatDistance(km)} (เส้นตรง)`;
      btn.disabled = false;
      btn.textContent = 'อัปเดตตำแหน่ง';
      toast('อัปเดตระยะทางแล้ว');
    },
    error => {
      btn.disabled = false;
      btn.textContent = 'ตำแหน่งฉัน';
      const msg = error.code === 1 ? 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง'
        : error.code === 3 ? 'หาตำแหน่งนานเกินไป ลองอีกครั้ง'
        : 'ไม่สามารถระบุตำแหน่งได้';
      $('navDistanceNote').textContent = msg;
      toast(msg, 'error');
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
  );
}

async function boot() {
  const id = params.get('id') || params.get('placeId');
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const hasCoords = params.has('lat') && params.has('lng') && Number.isFinite(lat) && Number.isFinite(lng);
  const name = params.get('name') || '';

  if (id) {
    target = await findPlace(id);
  }

  if (!target) {
    const places = await fetchPlaces();
    target = places.find(p => name && p.name === name)
      || places.find(p => name && p.name.includes(name))
      || null;
    if (!target && hasCoords) {
      target = { id: '', name: name || 'จุดหมายของคุณ', lat, lng, fallbackEmoji: '📍' };
    }
    if (!target) {
      target = places[0] || { id: '', name: 'วัดอรุณราชวราราม', lat: 13.7437, lng: 100.4889, fallbackEmoji: '🛕' };
      $('navSub').textContent = 'ยังไม่ได้เลือกสถานที่ — กำลังแสดงตัวอย่าง';
    }
  }

  applyTarget();
}

document.addEventListener('DOMContentLoaded', boot);
