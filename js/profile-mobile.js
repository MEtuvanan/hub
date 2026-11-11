// profile-mobile.js — explorer avatar, wardrobe/dress-up, stats, and account menu.

import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import {
  CHARACTERS, OUTFIT_OPTIONS, PRESETS, DEFAULT_OUTFIT,
  loadOutfit, saveOutfit, completedQuests, favoritePlaces,
} from './mobile-data.js';
import { getDisplayName, getTokens, levelInfo, isLoggedIn, confetti, formatNum } from './mobile-app.js';

const $ = id => document.getElementById(id);
const NAME_KEY = 'tc_mobile_guest_name';

const TABS = [
  { id: 'hair', label: 'ทรงผม', emoji: '💇', options: 'hair', color: 'hairColor' },
  { id: 'top', label: 'เสื้อ', emoji: '👕', options: 'top', color: 'topColor' },
  { id: 'bottom', label: 'กางเกง', emoji: '👖', options: 'bottom', color: 'bottomColor' },
  { id: 'shoes', label: 'รองเท้า', emoji: '🥾', options: 'shoes', color: 'shoeColor' },
  { id: 'hat', label: 'หมวก', emoji: '🧢', options: 'hat', color: 'hatColor' },
  { id: 'accessory', label: 'ของพก', emoji: '🎒', options: 'accessory', color: null },
  { id: 'skin', label: 'สีผิว', emoji: '🎨', options: null, color: 'skin' },
];

const PRESET_LABELS = {
  ray: 'เรย์', maya: 'มายา', zael: 'ซาเอล', luna: 'ลูน่า',
};
const ACCESSORY_ICONS = { camera: '📷', backpack: '🎒', map: '🗺️', sword: '🗡️', none: '' };

let outfit = loadOutfit();
let tab = 'hair';

function dollHTML() {
  return `
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
    </div>`;
}

function mountDoll() {
  const stage = $('pfDoll');
  if (!stage) return;
  stage.insertAdjacentHTML('beforeend', dollHTML());
}

function applyOutfit(persist = true) {
  const doll = $('pfDoll');
  if (!doll) return;
  doll.dataset.hair = outfit.hair;
  doll.dataset.top = outfit.top;
  doll.dataset.bottom = outfit.bottom;
  doll.dataset.shoes = outfit.shoes;
  doll.dataset.hat = outfit.hat;
  doll.dataset.accessory = outfit.accessory;
  const vars = {
    '--doll-skin': outfit.skin,
    '--doll-hair': outfit.hairColor,
    '--doll-top': outfit.topColor,
    '--doll-bottom': outfit.bottomColor,
    '--doll-shoe': outfit.shoeColor,
    '--doll-hat': outfit.hatColor,
  };
  Object.entries(vars).forEach(([key, value]) => doll.style.setProperty(key, value));
  const acc = doll.querySelector('.doll__accessory');
  if (acc) acc.textContent = ACCESSORY_ICONS[outfit.accessory] || '';
  const hat = doll.querySelector('.doll__hat');
  if (hat) hat.className = `doll__hat doll__hat--${outfit.hat}`;
  if (persist) saveOutfit(outfit);
  renderPresets();
  renderOptions();
  renderColors();
}

function renderPresets() {
  const box = $('pfPresets');
  if (!box) return;
  box.innerHTML = Object.keys(PRESETS).map(id => {
    const char = CHARACTERS.find(c => c.id === `char-${id}`);
    return `<button class="pf-preset ${outfit.preset === id ? 'is-active' : ''}" type="button" data-preset="${esc(id)}" title="${esc(char?.name || id)}">
      <span class="emoji">${char?.image ? '🧭' : '🧑‍🚀'}</span>${esc(PRESET_LABELS[id] || id)}
    </button>`;
  }).join('');
  box.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      outfit = { ...preset };
      applyOutfit();
      toast(`สวมชุด “${PRESET_LABELS[btn.dataset.preset] || btn.dataset.preset}” แล้ว`, 'ok');
    });
  });
}

function renderTabs() {
  const box = $('pfTabs');
  if (!box) return;
  box.innerHTML = TABS.map(t => `
    <button class="pf-tab ${tab === t.id ? 'is-active' : ''}" type="button" data-ptab="${t.id}">
      <span class="emoji">${t.emoji}</span>${t.label}
    </button>`).join('');
  box.querySelectorAll('[data-ptab]').forEach(btn => {
    btn.addEventListener('click', () => {
      tab = btn.dataset.ptab;
      renderTabs();
      renderOptions();
      renderColors();
    });
  });
}

function currentTab() {
  return TABS.find(t => t.id === tab) || TABS[0];
}

function renderOptions() {
  const box = $('pfOptions');
  const t = currentTab();
  if (!box) return;
  if (!t.options) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  const options = OUTFIT_OPTIONS[t.options] || [];
  box.innerHTML = options.map(opt => `
    <button class="pf-option ${outfit[t.options] === opt.id ? 'is-active' : ''}" type="button" data-popt="${esc(opt.id)}">
      <span class="emoji">${esc(opt.emoji || '•')}</span>${esc(opt.label || opt.id)}
    </button>`).join('');
  box.querySelectorAll('[data-popt]').forEach(btn => {
    btn.addEventListener('click', () => {
      outfit[t.options] = btn.dataset.popt;
      outfit.preset = 'custom';
      applyOutfit();
    });
  });
}

function renderColors() {
  const box = $('pfColors');
  const t = currentTab();
  if (!box) return;
  if (!t.color) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  const colors = OUTFIT_OPTIONS[t.color] || [];
  box.innerHTML = colors.map(color => `
    <button class="pf-color ${outfit[t.color] === color ? 'is-active' : ''}" type="button"
      style="--swatch:${esc(color)}" data-pcolor="${esc(color)}" aria-label="สี ${esc(color)}"></button>`).join('');
  box.querySelectorAll('[data-pcolor]').forEach(btn => {
    btn.addEventListener('click', () => {
      outfit[t.color] = btn.dataset.pcolor;
      outfit.preset = 'custom';
      applyOutfit();
    });
  });
}

function randomOutfit() {
  const pick = key => {
    const list = OUTFIT_OPTIONS[key] || [];
    return list[Math.floor(Math.random() * list.length)];
  };
  outfit = {
    preset: 'custom',
    hair: pick('hair').id,
    hairColor: pick('hairColor'),
    top: pick('top').id,
    topColor: pick('topColor'),
    bottom: pick('bottom').id,
    bottomColor: pick('bottomColor'),
    shoes: pick('shoes').id,
    shoeColor: pick('shoeColor'),
    hat: pick('hat').id,
    hatColor: pick('hatColor'),
    accessory: pick('accessory').id,
    skin: pick('skin'),
  };
  applyOutfit();
  confetti(18);
  toast('สุ่มชุดใหม่แล้ว ลองปรับต่อได้เลย');
}

function refreshIdentity() {
  const lvl = levelInfo();
  const done = completedQuests();
  const liked = favoritePlaces();
  const name = getDisplayName();
  const set = (id, value) => { const el = $(id); if (el) el.textContent = String(value); };
  set('pfName', name);
  set('pfLevel', `Lv.${lvl.level}`);
  set('pfStageLv', `Lv.${lvl.level} · ${lvl.level >= 5 ? 'นักสำรวจระดับสูง' : lvl.level >= 3 ? 'นักสำรวจฝึกหัด' : 'นักสำรวจหน้าใหม่'}`);
  set('pfToken', formatNum(getTokens()));
  set('pfDone', done.size);
  set('pfLiked', liked.size);
  set('pfTokenStat', formatNum(getTokens()));
  set('pfLvStat', lvl.level);
  const xp = $('pfXp');
  if (xp) xp.textContent = `${formatNum(lvl.into)} / ${lvl.need} XP`;
  const bar = $('pfXpBar');
  if (bar) bar.style.width = `${lvl.pct}%`;
  const authLabel = $('pfAuthLabel');
  const authSub = $('pfAuthSub');
  if (authLabel) authLabel.textContent = isLoggedIn() ? 'ออกจากระบบ' : 'เข้าสู่ระบบ / สมัครฟรี';
  if (authSub) authSub.textContent = isLoggedIn() ? 'บัญชีนี้ซิงก์ความคืบหน้ากับคลาวด์' : 'ซิงก์เควสท์และโทเคนข้ามอุปกรณ์';
}

function bindName() {
  $('pfEditName')?.addEventListener('click', () => {
    const name = prompt('ชื่อนักสำรวจของคุณ', getDisplayName());
    if (!name) return;
    const clean = name.trim().slice(0, 24);
    if (!clean) return;
    localStorage.setItem(NAME_KEY, clean);
    refreshIdentity();
    toast('เปลี่ยนชื่อนักสำรวจแล้ว');
  });
}

async function toggleAuth() {
  if (!isLoggedIn()) {
    location.href = `/login-mobile.html?next=${encodeURIComponent('/profile-mobile.html')}`;
    return;
  }
  if (!confirm('ต้องการออกจากระบบใช่ไหม? ความคืบหน้าในเครื่องจะยังอยู่')) return;
  try {
    const auth = await import('./auth.js');
    await auth.signOut();
  } catch {}
  toast('ออกจากระบบแล้ว');
  setTimeout(() => location.reload(), 350);
}

function boot() {
  mountDoll();
  renderTabs();
  applyOutfit(false);
  refreshIdentity();
  bindName();

  $('pfRandom')?.addEventListener('click', randomOutfit);
  $('pfAuthBtn')?.addEventListener('click', toggleAuth);
  $('pfSave')?.addEventListener('click', () => {
    saveOutfit(outfit);
    applyOutfit(false);
    confetti(28);
    toast('บันทึกชุดนักสำรวจแล้ว');
  });

  window.addEventListener('tc-tokens', refreshIdentity);
  window.addEventListener('tc-profile', refreshIdentity);
  // auth resolves asynchronously in the shell
  setTimeout(refreshIdentity, 900);
}

document.addEventListener('DOMContentLoaded', boot);
