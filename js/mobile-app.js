// mobile-app.js — shared phone shell: profile pill, bottom tab bar, more menu,
// daily star reward, token wallet, and the global quest sheet.
// Auth/Supabase are loaded dynamically so the shell renders even offline.

import { icon, iconFor } from './icons.js';
import { toast } from './ui.js';
import { esc } from './ui.js';
import {
  readJSON, writeJSON,
  COMPLETED_QUESTS_KEY, completedQuests,
  loadOutfit, OUTFIT_KEY,
  getPlace,
} from './mobile-data.js';

const $ = (id, root = document) => root.getElementById ? root.getElementById(id) : root.querySelector(`#${id}`);
const TOKEN_KEY = 'tc_mobile_tokens';
const STAR_KEY = 'tc_mobile_star_days';
const NAME_KEY = 'tc_mobile_guest_name';
const QUEST_LOG_KEY = 'tc_mobile_quest_log';
const TAB_PAGES = new Set(['home', 'quests', 'search', 'shop']);
const MORE_PAGES = new Set([
  'explore', 'planner', 'journal', 'calendar', 'collection', 'topup',
  'partner', 'help', 'admin', 'profile', 'navigate', 'login',
]);

let profile = null;
let session = null;
let moreOpen = false;
let questCallback = null;

/* ----------------------------- wallet ----------------------------- */
export function getTokens() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (raw === null) return 850;
  const v = Number(raw);
  return Number.isFinite(v) ? v : 850;
}
export function setTokens(n) {
  const val = Math.max(0, Math.round(Number(n) || 0));
  localStorage.setItem(TOKEN_KEY, String(val));
  updateTokenUI();
  window.dispatchEvent(new CustomEvent('tc-tokens', { detail: { tokens: val } }));
  return val;
}
export function awardTokens(n, reason = '') {
  const next = setTokens(getTokens() + Number(n || 0));
  const chip = document.querySelector('.app-token-chip');
  if (chip) {
    chip.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'ease-out' }
    );
  }
  if (reason) toast(`+${n} โทเคน · ${reason}`);
  return next;
}
export function levelInfo(tokens = getTokens()) {
  const level = Math.max(1, Math.floor(tokens / 250) + 1);
  const floor = (level - 1) * 250;
  const into = tokens - floor;
  const pct = Math.min(100, Math.round((into / 250) * 100));
  return { level, into, need: 250, pct };
}
export function formatNum(n) {
  return Number(n || 0).toLocaleString('th-TH');
}

/* ----------------------------- toast / confetti ----------------------------- */
export function appToast(message, type = 'ok') {
  toast(message, type);
}

export function confetti(count = 36) {
  const colors = ['#62f2b0', '#f2a81d', '#2ec5e8', '#ff8a5c', '#c9a7ff', '#ffffff'];
  const layer = document.createElement('div');
  layer.className = 'app-confetti';
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('i');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colors[i % colors.length];
    bit.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 180}px`);
    bit.style.width = `${5 + Math.random() * 7}px`;
    bit.style.height = `${8 + Math.random() * 10}px`;
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3000);
}

/* ----------------------------- auth / profile ----------------------------- */
function guestName() {
  return localStorage.getItem(NAME_KEY) || 'นักเดินทาง';
}
export function getDisplayName() {
  return profile?.display_name || guestName();
}
export function getAvatarUrl() {
  return profile?.avatar_url || '';
}
export function isLoggedIn() {
  return !!session;
}
export function levelBadge() {
  return `Lv.${levelInfo().level}`;
}

async function loadAuth() {
  try {
    const auth = await import('./auth.js');
    session = await auth.getSession();
    if (session) {
      profile = await auth.getProfile();
      renderProfilePill();
      renderMoreUser();
    }
  } catch (e) {
    console.warn('mobile shell: auth unavailable', e?.message || e);
  }
}

function renderProfilePill() {
  const pill = document.querySelector('.app-profile-pill');
  if (!pill) return;
  const nameEl = pill.querySelector('.app-profile-name');
  const avatarEl = pill.querySelector('.app-profile-avatar');
  const lvEl = pill.querySelector('.app-profile-lv');
  if (nameEl) nameEl.textContent = getDisplayName();
  if (lvEl) lvEl.textContent = levelBadge();
  if (avatarEl) {
    const url = getAvatarUrl();
    avatarEl.innerHTML = url
      ? `<img src="${esc(url)}" alt="">`
      : icon('user', 17);
  }
  window.dispatchEvent(new CustomEvent('tc-profile', { detail: { name: getDisplayName(), loggedIn: !!session } }));
}

/* ----------------------------- top bar ----------------------------- */
function topbarHTML() {
  return `
    <header class="app-topbar" id="appTopbar">
      <a class="app-profile-pill" href="/profile-mobile.html" aria-label="โปรไฟล์ของฉัน">
        <span class="app-profile-avatar">${icon('user', 17)}</span>
        <span class="app-profile-name">${esc(getDisplayName())}</span>
        <span class="app-profile-lv">${levelBadge()}</span>
      </a>
      <div class="app-topbar-right">
        <a class="app-token-chip" href="/topup-mobile.html" aria-label="โทเคนของฉัน">
          ${icon('coin', 15)}<b data-token-balance>${formatNum(getTokens())}</b>
        </a>
        <button class="app-star-btn" id="appStarBtn" type="button" aria-label="รางวัลประจำวัน">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6c.5 5.8 3.1 8.5 9.9 10.4-6.8 1.9-9.4 4.6-9.9 10.4-.5-5.8-3.1-8.5-9.9-10.4C8.9 10.1 11.5 7.4 12 1.6Z"/></svg>
        </button>
      </div>
    </header>`;
}

/* ----------------------------- bottom tabs ----------------------------- */
function tabbarHTML() {
  const page = document.body.dataset.appPage || '';
  const active = (key) => (TAB_PAGES.has(page) && page === key ? ' is-active' : '');
  return `
    <nav class="app-tabbar" aria-label="เมนูหลัก">
      <a class="app-tab${active('home')}" data-tab="home" href="/index-mobile.html" aria-label="แผนที่หน้าหลัก">
        <span class="app-tab-icon">${icon('map', 21)}</span>
      </a>
      <a class="app-tab${active('quests')}" data-tab="quests" href="/quests-mobile.html" aria-label="เควสท์ที่เที่ยว">
        <span class="app-tab-icon">${icon('quest', 21)}</span>
      </a>
      <a class="app-tab app-tab-search${active('search')}" data-tab="search" href="/search-mobile.html" aria-label="ค้นหา">
        <span class="app-tab-icon">${icon('search', 21)}</span>
      </a>
      <a class="app-tab${active('shop')}" data-tab="shop" href="/shop-mobile.html" aria-label="ร้านค้า">
        <span class="app-tab-icon">${icon('store', 21)}</span>
      </a>
      <button class="app-tab${MORE_PAGES.has(page) ? ' is-active' : ''}" data-tab="more" id="appMoreBtn" type="button" aria-label="เมนูอื่น ๆ" aria-expanded="false">
        <span class="app-tab-icon">
          <svg class="ic" width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/>
          </svg>
        </span>
      </button>
    </nav>`;
}

/* ----------------------------- more menu ----------------------------- */
function moreHTML() {
  return `
    <div class="app-sheet-backdrop" id="appMoreBackdrop"></div>
    <section class="app-more-sheet" id="appMoreSheet" aria-label="เมนูทั้งหมด" aria-hidden="true">
      <div class="app-more-head">
        <h2>เมนูทั้งหมด</h2>
        <button class="sheet-close" type="button" id="appMoreClose" aria-label="ปิดเมนู">${icon('close', 16)}</button>
      </div>
      <div class="app-more-user" id="appMoreUser">
        <span class="app-profile-avatar">${icon('user', 20)}</span>
        <div style="min-width:0;flex:1">
          <strong>${esc(getDisplayName())}</strong>
          <span>${levelBadge()} · ${formatNum(getTokens())} โทเคน</span>
        </div>
        <a class="g-btn g-btn--sm g-btn--ghost" href="/profile-mobile.html">โปรไฟล์</a>
      </div>
      <div class="app-more-grid">
        <a class="app-more-item" href="/explore-mobile.html" data-tone="mint"><span class="app-more-ico">${icon('compass', 21)}</span>แผนที่ AR</a>
        <a class="app-more-item" href="/planner-mobile.html" data-tone="blue"><span class="app-more-ico">${icon('ai', 21)}</span>วางแผนทริป</a>
        <a class="app-more-item" href="/journal-mobile.html" data-tone="gold"><span class="app-more-ico">${icon('journal', 21)}</span>ไดอารี่</a>
        <a class="app-more-item" href="/calendar-mobile.html" data-tone="gold"><span class="app-more-ico">${icon('calendar', 21)}</span>ปฏิทิน</a>
        <a class="app-more-item" href="/collection-mobile.html" data-tone="violet"><span class="app-more-ico">${icon('trophy', 21)}</span>คอลเลกชัน</a>
        <a class="app-more-item" href="/topup-mobile.html" data-tone="gold"><span class="app-more-ico">${icon('coin', 21)}</span>เติมโทเคน</a>
        <a class="app-more-item" href="/partner-mobile.html" data-tone="red"><span class="app-more-ico">${icon('building', 21)}</span>ร้านค้า/พาร์ทเนอร์</a>
        <a class="app-more-item" href="/help-mobile.html" data-tone="mint"><span class="app-more-ico">${icon('book', 21)}</span>คู่มือใช้งาน</a>
        <a class="app-more-item" href="/admin-mobile.html" data-tone="violet"><span class="app-more-ico">${icon('settings', 21)}</span>ผู้ดูแลระบบ</a>
        <button class="app-more-item" type="button" id="appLangBtn" data-tone="blue"><span class="app-more-ico">${icon('sun', 21)}</span><span id="appLangLabel">EN / TH</span></button>
        <button class="app-more-item" type="button" id="appAuthBtn" data-tone="red"><span class="app-more-ico">${icon('user', 21)}</span><span id="appAuthLabel">เข้าสู่ระบบ</span></button>
      </div>
    </section>`;
}

function renderMoreUser() {
  const box = $('appMoreUser');
  if (!box) return;
  const url = getAvatarUrl();
  box.innerHTML = `
    <span class="app-profile-avatar">${url ? `<img src="${esc(url)}" alt="">` : icon('user', 20)}</span>
    <div style="min-width:0;flex:1">
      <strong>${esc(getDisplayName())}</strong>
      <span>${levelBadge()} · ${formatNum(getTokens())} โทเคน${session ? '' : ' · โหมดนักท่องเที่ยว'}</span>
    </div>
    <a class="g-btn g-btn--sm g-btn--ghost" href="/profile-mobile.html">โปรไฟล์</a>`;
  const authLabel = $('appAuthLabel');
  if (authLabel) authLabel.textContent = session ? 'ออกจากระบบ' : 'เข้าสู่ระบบ';
  const langLabel = $('appLangLabel');
  if (langLabel) langLabel.textContent = (document.documentElement.lang || 'th') === 'th' ? 'EN / TH' : 'TH / EN';
}

function openMore() {
  moreOpen = true;
  $('appMoreSheet')?.classList.add('is-open');
  $('appMoreBackdrop')?.classList.add('is-open');
  $('appMoreSheet')?.setAttribute('aria-hidden', 'false');
  $('appMoreBtn')?.setAttribute('aria-expanded', 'true');
  $('appMoreBtn')?.classList.add('is-active');
  renderMoreUser();
}
function closeMore() {
  moreOpen = false;
  $('appMoreSheet')?.classList.remove('is-open');
  $('appMoreBackdrop')?.classList.remove('is-open');
  $('appMoreSheet')?.setAttribute('aria-hidden', 'true');
  $('appMoreBtn')?.setAttribute('aria-expanded', 'false');
  if (!TAB_PAGES.has(document.body.dataset.appPage) && !MORE_PAGES.has(document.body.dataset.appPage)) $('appMoreBtn')?.classList.remove('is-active');
}

async function toggleAuth() {
  if (session) {
    try {
      const auth = await import('./auth.js');
      await auth.signOut();
    } catch {}
    session = null;
    profile = null;
    toast('ออกจากระบบแล้ว');
    closeMore();
    setTimeout(() => location.reload(), 350);
  } else {
    location.href = '/login-mobile.html?next=' + encodeURIComponent(location.pathname + location.search);
  }
}

/* ----------------------------- daily star ----------------------------- */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function starDays() {
  return readJSON(STAR_KEY, []);
}
function hasStarToday() {
  return starDays().includes(todayKey());
}
function starDialogHTML() {
  const days = starDays();
  const claimed = hasStarToday();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { key, done: days.includes(key), today: key === todayKey(), label: d.toLocaleDateString('th-TH', { weekday: 'narrow' }) };
  });
  return `
    <div class="dialog-scroll">
      <div class="star-reward">
        <div class="star-reward__orbit">
          <span class="star-reward__glow"></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6c.5 5.8 3.1 8.5 9.9 10.4-6.8 1.9-9.4 4.6-9.9 10.4-.5-5.8-3.1-8.5-9.9-10.4C8.9 10.1 11.5 7.4 12 1.6Z"/></svg>
        </div>
        <p class="app-kicker" style="justify-content:center">DAILY STAR</p>
        <h2>ดาวนำทางประจำวัน</h2>
        <p class="app-sub">เช็คอินทุกวันเพื่อรับโทเคนโบนัส และสะสมสตรีค 7 วัน</p>
        <div class="star-week">
          ${week.map((d, i) => `<div class="star-day ${d.done ? 'is-done' : ''} ${d.today ? 'is-today' : ''}"><span>${d.label}</span><b>${d.done ? icon('check', 12) : i === 6 ? '+25' : '·'}</b></div>`).join('')}
        </div>
        <div class="star-reward__amount">${claimed ? 'รับรางวัลวันนี้แล้ว' : '<b>+25</b> โทเคน'} ${icon('coin', 18)}</div>
        <button class="g-btn g-btn--mint g-btn--block" id="appStarClaim" type="button" ${claimed ? 'disabled' : ''}>
          ${claimed ? 'กลับมาพรุ่งนี้' : 'รับดาวประจำวัน'}
        </button>
        <a class="g-btn g-btn--ghost g-btn--block" href="/quests-mobile.html" style="margin-top:8px">ไปทำเควสท์ต่อ</a>
      </div>
    </div>`;
}

function openStar() {
  const dlg = $('appStarDialog');
  if (!dlg) return;
  const scroll = dlg.querySelector('#appStarBody');
  if (scroll) scroll.innerHTML = starDialogHTML();
  dlg.showModal();
  dlg.querySelector('#appStarClaim')?.addEventListener('click', () => {
    if (hasStarToday()) return;
    const days = starDays();
    days.push(todayKey());
    writeJSON(STAR_KEY, days.slice(-30));
    awardTokens(25, 'ดาวนำทางประจำวัน');
    confetti(26);
    updateStarButton();
    const body = dlg.querySelector('#appStarBody');
    if (body) body.innerHTML = starDialogHTML();
  });
}
function updateStarButton() {
  const btn = $('appStarBtn');
  if (!btn) return;
  btn.classList.toggle('has-reward', !hasStarToday());
}

/* ----------------------------- quest sheet ----------------------------- */
function questSheetHTML() {
  return `
    <dialog class="app-sheet" id="appQuestSheet" aria-labelledby="appQuestTitle">
      <div class="dialog-bar">
        <strong>รายละเอียดเควสท์</strong>
        <button class="sheet-close" type="button" data-close-quest aria-label="ปิด">${icon('close', 16)}</button>
      </div>
      <div class="dialog-scroll" id="appQuestBody"></div>
    </dialog>`;
}

/* ----------------------------- Quest GPS & Photo Verification ----------------------------- */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GPS_RADIUS_M = 5000; // 5 km radius

function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(ev.target.result);
      img.src = ev.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function openQuestSheet(quest, options = {}) {
  const dlg = $('appQuestSheet');
  if (!dlg || !quest) return;
  questCallback = typeof options.onComplete === 'function' ? options.onComplete : null;
  const done = completedQuests().has(quest.id);
  const diff = quest.difficulty === 'hard' ? 'ท้าทาย' : quest.difficulty === 'medium' ? 'ปานกลาง' : 'ง่าย';
  const diffClass = quest.difficulty === 'hard' ? 'g-chip--danger' : quest.difficulty === 'medium' ? 'g-chip--gold' : 'g-chip--mint';

  // Target coordinates & name
  const placeObj = quest.placeId ? getPlace(quest.placeId) : null;
  const targetLat = Number(quest.lat) || (placeObj?.lat ? Number(placeObj.lat) : 13.7437);
  const targetLng = Number(quest.lng) || (placeObj?.lng ? Number(placeObj.lng) : 100.4889);
  const targetName = quest.placeName || placeObj?.name || quest.title;

  // Retrieve saved check-in if completed
  const questLogs = readJSON(QUEST_LOG_KEY, []);
  const savedLog = questLogs.find(l => l.questId === quest.id);

  let capturedPhoto = null;
  let verifiedGps = null;

  const body = dlg.querySelector('#appQuestBody');
  body.innerHTML = `
    <div class="dialog-hero g-media" data-icon="${esc(quest.icon || quest.emoji || 'quest')}">
      <img src="${esc(quest.image || '')}" alt="${esc(quest.title)}" onerror="this.style.display='none';this.parentElement.classList.add('is-fallback')">
      <span class="media-emoji">${iconFor(quest.emoji || quest.icon || 'quest', 32)}</span>
      <div class="quest-sheet-hero">
        <span class="g-chip ${diffClass}">${done ? 'สำเร็จแล้ว' : esc(diff)}</span>
        <span class="g-coin">${icon('coin', 14)} +${Number(quest.reward || 0)}</span>
      </div>
    </div>
    <h2 class="app-h2" id="appQuestTitle" style="margin-top:14px">${esc(quest.title)}</h2>
    <p class="app-tiny" style="margin-bottom:12px">${icon('pin', 13)} ${esc(targetName)}</p>
    <p class="app-sub">${esc(quest.summary || '')}</p>
    <div class="app-wrap" style="margin:12px 0 18px">
      <span class="g-chip g-chip--blue">${icon('clock', 13)} ${Number(quest.minutes || 20)} นาที</span>
      <span class="g-chip">${icon('quest', 13)} ${esc(quest.typeLabel || 'ภารกิจ')}</span>
      ${quest.province ? `<span class="g-chip">${icon('map', 13)} ${esc(quest.province)}</span>` : ''}
    </div>
    <h3 class="app-h3">ขั้นตอนภารกิจ</h3>
    <ol class="quest-steps">
      ${(quest.steps || []).map(step => `<li><span></span>${esc(step)}</li>`).join('')}
    </ol>
    ${done ? `
      <div class="g-card g-card--mint" style="margin-top:16px;text-align:center">
        <div style="font-size:34px;line-height:1">${icon('trophy', 34)}</div>
        <h3 class="app-h3" style="margin-top:6px">คุณพิชิตเควสท์นี้แล้ว</h3>
        <p class="app-tiny" style="margin:0 0 10px">รับโทเคนไปแล้ว +${Number(quest.reward || 0)}</p>
        ${savedLog?.photo ? `
          <div style="border-radius:14px;overflow:hidden;margin:10px auto 0;max-height:220px;border:1px solid var(--line);box-shadow:var(--shadow-1)">
            <img src="${esc(savedLog.photo)}" alt="รูปถ่ายเช็คอิน" style="width:100%;height:100%;object-fit:cover;display:block">
          </div>
          ${savedLog.caption ? `<p class="app-tiny" style="margin:8px 0 0;font-style:italic;color:var(--ink)">“${esc(savedLog.caption)}”</p>` : ''}
          <div style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:4px 10px;border-radius:999px;background:var(--green-soft);color:var(--green-deep);font-size:10px;font-weight:600">
            ${icon('compass', 11)} พิกัด GPS ได้รับการตรวจสอบแล้ว
          </div>
        ` : ''}
      </div>
    ` : `
      <!-- Photo Check-In Section -->
      <div class="g-card" style="margin-top:16px;background:var(--glass);border:1px solid var(--glass-border);border-radius:20px;box-shadow:var(--shadow-1)">
        <div class="app-between" style="margin-bottom:10px">
          <strong style="font-size:13px;color:var(--ink)">ถ่ายรูป &amp; ตรวจสอบ GPS เช็คอิน</strong>
          <span class="g-coin">${icon('coin', 15)} +${Number(quest.reward || 0)}</span>
        </div>

        <input type="file" id="appQuestPhotoFile" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" style="display:none">

        <!-- Photo Dropzone -->
        <div class="qd-dropzone" id="appQuestDropzone" role="button" tabindex="0">
          <div class="qd-dropzone-icon">${icon('camera', 22)}</div>
          <div class="qd-dropzone-title">ถ่ายรูปหรือเลือกรูปสถานที่ *</div>
          <div class="qd-dropzone-sub">แตะเพื่อถ่ายรูปบรรยากาศ ณ สถานที่จริง</div>
        </div>

        <!-- Photo Preview Wrap -->
        <div class="qd-preview-wrap" id="appQuestPreviewWrap" style="display:none">
          <img src="" id="appQuestPreviewImg" class="qd-preview-img" alt="ภาพถ่ายเช็คอิน">
          <div class="qd-preview-stamp">
            <span>${esc(targetName)}</span>
            <span id="appQuestPreviewTime"></span>
          </div>
          <button type="button" class="qd-preview-retake" id="appQuestRetakeBtn">${icon('camera', 13)} ถ่ายใหม่</button>
        </div>

        <!-- Travel Caption -->
        <div style="margin-top:10px">
          <input class="g-input" id="appQuestCaption" placeholder="บันทึกความรู้สึก หรือเรื่องราว (ไม่บังคับ)" maxlength="120">
        </div>

        <!-- GPS Verification Panel -->
        <div id="appQuestGpsPanel" class="qd-gps-panel gps-idle" style="margin-top:12px"></div>

        <button class="g-btn g-btn--mint g-btn--block" id="appQuestClaim" type="button" style="margin-top:14px;min-height:46px;font-size:14px">
          ${icon('camera', 16)} ส่งรูป &amp; เช็คอินรับ +${Number(quest.reward || 0)} โทเคน
        </button>
        <p class="app-tiny" id="appQuestMsg" style="margin:8px 0 0;text-align:center;color:var(--danger)" hidden></p>
      </div>

      <a class="g-btn g-btn--ghost g-btn--block" href="/navigate-mobile.html?name=${encodeURIComponent(targetName)}&lat=${targetLat}&lng=${targetLng}" style="margin-top:10px">
        ${icon('compass', 16)} นำทางไปสถานที่
      </a>
    `}
    <div style="height:8px"></div>`;

  dlg.showModal();

  if (done) return;

  // GPS Panel Renderer
  const gpsPanel = dlg.querySelector('#appQuestGpsPanel');
  const renderGps = (state, opts = {}) => {
    if (!gpsPanel) return;
    const radiusKm = (GPS_RADIUS_M / 1000).toFixed(0);

    if (state === 'idle') {
      gpsPanel.className = 'qd-gps-panel gps-idle';
      gpsPanel.innerHTML = `
        <div class="gps-panel-header">
          <span class="gps-panel-icon">${icon('compass', 18)}</span>
          <strong class="gps-panel-title">ตรวจสอบพิกัด GPS ผู้ใช้</strong>
        </div>
        <div class="gps-panel-body">
          กติกา: ต้องอยู่ในรัศมี <strong>${radiusKm} กม.</strong> จาก ${esc(targetName)}<br>
          <small>กดปุ่มเพื่อตรวจจับตำแหน่งปัจจุบันของคุณ</small>
        </div>
        <div class="gps-panel-actions">
          <button class="gps-btn gps-btn-primary" id="btnCheckGps" type="button">${icon('compass', 14)} ตรวจสอบพิกัด GPS</button>
          <button class="gps-btn gps-btn-ghost" id="btnSimulateGps" type="button">${icon('check', 12)} จำลองพิกัด ณ สถานที่ (ทดสอบ)</button>
        </div>`;
    } else if (state === 'checking') {
      gpsPanel.className = 'qd-gps-panel gps-checking';
      gpsPanel.innerHTML = `
        <div class="gps-panel-header">
          <span class="gps-panel-icon gps-spin">${icon('compass', 18)}</span>
          <strong class="gps-panel-title">กำลังค้นหาตำแหน่ง GPS...</strong>
        </div>
        <div class="gps-panel-body">
          กรุณารอสักครู่ กำลังรับพิกัดความแม่นยำสูงจากอุปกรณ์
        </div>`;
    } else if (state === 'verified') {
      gpsPanel.className = 'qd-gps-panel gps-ok';
      const distLabel = opts.dist >= 1000 ? `${(opts.dist / 1000).toFixed(2)} กม.` : `${Math.round(opts.dist || 0)} ม.`;
      gpsPanel.innerHTML = `
        <div class="gps-panel-header">
          <span class="gps-panel-icon" style="color:var(--green)">${icon('check', 18)}</span>
          <strong class="gps-panel-title" style="color:var(--green-deep)">พิกัด GPS ถูกต้อง!</strong>
        </div>
        <div class="gps-panel-body">
          คุณอยู่ห่างจากสถานที่ <strong>${distLabel}</strong> (อยู่ในรัศมี ${radiusKm} กม.)<br>
          <small>ความแม่นยำ: ±${Math.round(opts.accuracy || 10)} ม. · ${(opts.lat || 0).toFixed(4)}, ${(opts.lng || 0).toFixed(4)}${opts.isSimulated ? ' (โหมดจำลองพิกัด)' : ''}</small>
        </div>`;
    } else if (state === 'too_far') {
      gpsPanel.className = 'qd-gps-panel gps-far';
      const distKm = (opts.dist / 1000).toFixed(2);
      gpsPanel.innerHTML = `
        <div class="gps-panel-header">
          <span class="gps-panel-icon" style="color:var(--danger)">${icon('close', 18)}</span>
          <strong class="gps-panel-title" style="color:var(--danger)">คุณอยู่นอกรัศมี 5 กิโลเมตร!</strong>
        </div>
        <div class="gps-panel-body">
          ระยะห่างปัจจุบัน: <strong>${distKm} กม.</strong> (ต้องไม่เกิน ${radiusKm} กม.)<br>
          <small style="color:var(--danger);font-weight:600">จำเป็นต้องอยู่ในพื้นที่จริง หรือใช้ปุ่มจำลองพิกัดเพื่อทดสอบ</small>
        </div>
        <div class="gps-panel-actions">
          <button class="gps-btn gps-btn-primary" id="btnCheckGps" type="button">${icon('compass', 14)} ตรวจสอบใหม่</button>
          <button class="gps-btn gps-btn-ghost" id="btnSimulateGps" type="button">${icon('check', 12)} จำลองพิกัด ณ สถานที่ (ทดสอบ)</button>
        </div>`;
    } else if (state === 'denied') {
      gpsPanel.className = 'qd-gps-panel gps-denied';
      gpsPanel.innerHTML = `
        <div class="gps-panel-header">
          <span class="gps-panel-icon" style="color:var(--danger)">${icon('close', 18)}</span>
          <strong class="gps-panel-title" style="color:var(--danger)">ไม่สามารถเข้าถึงพิกัด GPS ได้</strong>
        </div>
        <div class="gps-panel-body">
          ${esc(opts.err || 'กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง')}<br>
          <small style="color:var(--danger);font-weight:600">ต้องเปิดตำแหน่งเพื่อยืนยันว่าคุณอยู่ในพื้นที่</small>
        </div>
        <div class="gps-panel-actions">
          <button class="gps-btn gps-btn-primary" id="btnCheckGps" type="button">${icon('compass', 14)} ลองอีกครั้ง</button>
          <button class="gps-btn gps-btn-ghost" id="btnSimulateGps" type="button">${icon('check', 12)} จำลองพิกัด ณ สถานที่ (ทดสอบ)</button>
        </div>`;
    }

    // Attach button handlers
    gpsPanel.querySelector('#btnCheckGps')?.addEventListener('click', performGpsCheck);
    gpsPanel.querySelector('#btnSimulateGps')?.addEventListener('click', simulateGps);
  };

  const performGpsCheck = () => {
    renderGps('checking');
    if (!navigator.geolocation) {
      renderGps('denied', { err: 'อุปกรณ์ไม่รองรับการระบุพิกัด GPS' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const dist = haversineDistance(userLat, userLng, targetLat, targetLng);
        if (dist <= GPS_RADIUS_M) {
          verifiedGps = { lat: userLat, lng: userLng, dist, accuracy: pos.coords.accuracy, isSimulated: false };
          renderGps('verified', verifiedGps);
        } else {
          verifiedGps = null;
          renderGps('too_far', { dist });
        }
      },
      err => {
        const msgs = {
          1: 'คุณไม่อนุญาตการเข้าถึง GPS กรุณาเปิดสิทธิ์ในเบราว์เซอร์',
          2: 'ไม่สามารถค้นหาสัญญาณดาวเทียม GPS ได้',
          3: 'ใช้เวลาค้นหาพิกัดนานเกินไป'
        };
        verifiedGps = null;
        renderGps('denied', { err: msgs[err.code] || 'เกิดข้อผิดพลาดในการตรวจสอบ GPS' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const simulateGps = () => {
    // Simulate being 120m away from the target place
    const dist = 120;
    verifiedGps = { lat: targetLat + 0.0008, lng: targetLng + 0.0008, dist, accuracy: 12, isSimulated: true };
    renderGps('verified', verifiedGps);
    toast('จำลองพิกัด ณ สถานที่สำเร็จ (โหมดทดสอบ)');
  };

  // Initial GPS state
  renderGps('idle');

  // Wire photo upload
  const fileInput = dlg.querySelector('#appQuestPhotoFile');
  const dropzone = dlg.querySelector('#appQuestDropzone');
  const previewWrap = dlg.querySelector('#appQuestPreviewWrap');
  const previewImg = dlg.querySelector('#appQuestPreviewImg');
  const previewTime = dlg.querySelector('#appQuestPreviewTime');
  const retakeBtn = dlg.querySelector('#appQuestRetakeBtn');
  const msgEl = dlg.querySelector('#appQuestMsg');

  dropzone?.addEventListener('click', () => fileInput?.click());
  retakeBtn?.addEventListener('click', () => {
    capturedPhoto = null;
    if (fileInput) fileInput.value = '';
    if (previewWrap) previewWrap.style.display = 'none';
    if (dropzone) dropzone.style.display = 'flex';
  });

  fileInput?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (dropzone) dropzone.style.opacity = '0.5';
      const compressed = await compressImage(file);
      if (compressed) {
        capturedPhoto = compressed;
        if (previewImg) previewImg.src = capturedPhoto;
        if (previewTime) previewTime.textContent = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        if (dropzone) { dropzone.style.display = 'none'; dropzone.style.opacity = '1'; }
        if (previewWrap) previewWrap.style.display = 'block';
        if (msgEl) msgEl.hidden = true;
      }
    } catch {
      toast('ไม่สามารถประมวลผลรูปภาพได้', 'error');
      if (dropzone) dropzone.style.opacity = '1';
    }
  });

  // Wire Claim Button
  dlg.querySelector('#appQuestClaim')?.addEventListener('click', () => {
    // 1. Check Photo
    if (!capturedPhoto) {
      if (msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = 'กรุณาถ่ายรูปหรืออัปโหลดรูปสถานที่ก่อนยืนยันภารกิจ';
      }
      dropzone?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Check GPS
    if (!verifiedGps) {
      if (msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = 'กรุณาตรวจสอบพิกัด GPS ของคุณก่อนยืนยันภารกิจ';
      }
      gpsPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const caption = dlg.querySelector('#appQuestCaption')?.value.trim() || '';

    // Save completion
    const set = completedQuests();
    set.add(quest.id);
    writeJSON(COMPLETED_QUESTS_KEY, [...set]);

    // Save log with photo & GPS
    const log = readJSON(QUEST_LOG_KEY, []).filter(l => l.questId !== quest.id);
    log.unshift({
      questId: quest.id,
      at: Date.now(),
      photo: capturedPhoto,
      caption,
      lat: verifiedGps.lat,
      lng: verifiedGps.lng,
      distance: verifiedGps.dist,
      isSimulated: verifiedGps.isSimulated || false
    });
    writeJSON(QUEST_LOG_KEY, log.slice(0, 200));

    // Also sync to desktop tc_photo_checkins
    try {
      const checkins = JSON.parse(localStorage.getItem('tc_photo_checkins') || '{}');
      checkins[quest.id] = {
        questId: quest.id,
        photo_url: capturedPhoto,
        caption,
        checked_in_at: new Date().toISOString(),
        target_name: targetName,
        lat: verifiedGps.lat,
        lng: verifiedGps.lng,
        distance: verifiedGps.dist
      };
      localStorage.setItem('tc_photo_checkins', JSON.stringify(checkins));
    } catch {}

    awardTokens(Number(quest.reward || 0), quest.title);
    confetti(46);
    window.dispatchEvent(new CustomEvent('tc-quest-done', { detail: { quest } }));

    body.innerHTML = `
      <div class="quest-success">
        <div class="quest-success__badge">${icon('check', 22)}</div>
        <p class="app-kicker" style="justify-content:center">QUEST COMPLETE</p>
        <h2 class="app-h2">ยินดีด้วย นักสำรวจ!</h2>
        <p class="app-sub">คุณถ่ายรูปและเช็คอิน “${esc(quest.title)}” สำเร็จ</p>

        <div style="border-radius:16px;overflow:hidden;margin:14px auto;max-height:200px;border:1px solid var(--glass-border);box-shadow:var(--shadow-2)">
          <img src="${esc(capturedPhoto)}" alt="รูปถ่ายเช็คอิน" style="width:100%;height:100%;object-fit:cover;display:block">
        </div>
        ${caption ? `<p class="app-tiny" style="margin:0 0 10px;font-style:italic;color:var(--ink)">“${esc(caption)}”</p>` : ''}
        <div style="display:inline-flex;align-items:center;gap:5px;margin-bottom:12px;padding:4px 10px;border-radius:999px;background:var(--green-soft);color:var(--green-deep);font-size:10px;font-weight:600">
          ${icon('compass', 11)} พิกัด GPS ยืนยันแล้ว (${verifiedGps.dist >= 1000 ? (verifiedGps.dist / 1000).toFixed(2) + ' กม.' : Math.round(verifiedGps.dist) + ' ม.'})
        </div>

        <div class="quest-success__reward">${icon('coin', 24)} +${Number(quest.reward || 0)} <span>โทเคน</span></div>
        <a class="g-btn g-btn--block" href="/quests-mobile.html" style="margin-top:18px">กลับไปหาเควสท์ใหม่</a>
        <a class="g-btn g-btn--ghost g-btn--block" href="/journal-mobile.html" style="margin-top:8px">ดูในบันทึกไดอารี่</a>
      </div>`;
    questCallback?.(quest);
  });
}

/* ----------------------------- init ----------------------------- */
function updateTokenUI() {
  document.querySelectorAll('[data-token-balance]').forEach(el => {
    el.textContent = formatNum(getTokens());
  });
}

function bindEvents() {
  $('appMoreBtn')?.addEventListener('click', () => (moreOpen ? closeMore() : openMore()));
  $('appMoreClose')?.addEventListener('click', closeMore);
  $('appMoreBackdrop')?.addEventListener('click', closeMore);
  $('appLangBtn')?.addEventListener('click', async () => {
    try {
      const i18n = await import('./i18n.js');
      i18n.toggleLang();
      document.documentElement.lang = i18n.getLang();
      renderMoreUser();
      toast(i18n.getLang() === 'th' ? 'เปลี่ยนเป็นภาษาไทยแล้ว' : 'Switched to English');
    } catch {
      toast('Language module unavailable', 'error');
    }
  });
  $('appAuthBtn')?.addEventListener('click', toggleAuth);
  $('appStarBtn')?.addEventListener('click', openStar);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && moreOpen) closeMore();
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-quest]')) $('appQuestSheet')?.close();
  });
  window.addEventListener('tc-tokens', () => {
    updateTokenUI();
    renderProfilePill();
  });
  window.addEventListener('tc-level', renderProfilePill);
}

export function initMobileApp() {
  if (document.body.dataset.appReady === '1') return;
  document.body.dataset.appReady = '1';

  if (!document.querySelector('.app-topbar')) {
    document.body.insertAdjacentHTML('afterbegin', topbarHTML());
  }
  if (!document.querySelector('.app-tabbar')) {
    document.body.insertAdjacentHTML('beforeend', tabbarHTML());
  }
  if (!document.querySelector('#appMoreSheet')) {
    document.body.insertAdjacentHTML('beforeend', moreHTML());
  }
  if (!document.querySelector('#appQuestSheet')) {
    document.body.insertAdjacentHTML('beforeend', questSheetHTML());
  }
  if (!document.querySelector('#appStarDialog')) {
    document.body.insertAdjacentHTML('beforeend', `
      <dialog class="app-sheet" id="appStarDialog" aria-labelledby="appStarTitle">
        <div class="dialog-bar"><strong>รางวัลประจำวัน</strong><button class="sheet-close" type="button" onclick="this.closest('dialog').close()" aria-label="ปิด">${icon('close', 16)}</button></div>
        <div id="appStarBody"></div>
      </dialog>`);
  }
  bindEvents();
  updateStarButton();
  updateTokenUI();
  loadAuth();
  window.dispatchEvent(new CustomEvent('tc-shell-ready'));
}

// Auto-init (the shell is useful as soon as the module is imported).
initMobileApp();
