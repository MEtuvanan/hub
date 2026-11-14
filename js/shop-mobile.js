// shop-mobile.js — characters, token packs, and explorer perks (local demo).

import { esc, toast } from './ui.js';
import { icon, iconFor } from './icons.js';
import {
  CHARACTERS, PRESETS, loadOutfit, saveOutfit,
  readJSON, writeJSON,
} from './mobile-data.js';
import {
  getTokens, setTokens, awardTokens, confetti, formatNum,
} from './mobile-app.js';

const $ = id => document.getElementById(id);
const OWNED_KEY = 'tc_mobile_owned_chars';
const PERKS_KEY = 'tc_mobile_perks';
const TOPUP_KEY = 'tc_mobile_topups';

const PACKS = [
  { id: 'p300', tokens: 300, bonus: 0, price: 59, icon: 'coin', note: 'เริ่มต้นสายนักสำรวจ' },
  { id: 'p700', tokens: 700, bonus: 50, price: 129, icon: 'store', note: 'คุ้มค่าที่สุดสำหรับเควสท์รายวัน', hot: true },
  { id: 'p1500', tokens: 1500, bonus: 150, price: 259, icon: 'store', note: 'ปลดล็อกตัวละครระดับ Epic' },
  { id: 'p3200', tokens: 3200, bonus: 400, price: 499, icon: 'star', note: 'สำหรับนักสะสมตัวจริง' },
];

const PERKS = [
  { id: 'double-xp', name: 'XP เร่งด่วน ×2', desc: 'รับ XP เพิ่มเป็นสองเท่าเป็นเวลา 24 ชั่วโมง', cost: 200, icon: 'flame' },
  { id: 'token-boost', name: 'พรนักสำรวจ +10%', desc: 'โทเคนจากเควสท์เพิ่ม 10% ตลอดทั้งสัปดาห์', cost: 300, icon: 'leaf' },
  { id: 'night-map', name: 'ธีมแผนที่กลางคืน', desc: 'เปลี่ยนบรรยากาศแผนที่ AR เป็นโหมดราตรี', cost: 180, icon: 'star' },
  { id: 'outfit-pack', name: 'ชุดนักสำรวจพิเศษ', desc: 'ปลดล็อกชุดและหมวกสำหรับแต่งตัวละคร', cost: 250, icon: 'backpack' },
];

let tab = 'chars';
let outfit = loadOutfit();

function ownedChars() {
  const free = CHARACTERS.filter(c => !c.cost).map(c => c.id);
  return new Set([...free, ...readJSON(OWNED_KEY, [])]);
}

function ownedPerks() {
  return new Set(readJSON(PERKS_KEY, []));
}

function updateWallet() {
  const el = $('shopTokens');
  if (el) el.textContent = formatNum(getTokens());
}

function presetIdFor(charId) {
  return String(charId).replace(/^char-/, '');
}

function renderChars() {
  const box = $('shopChars');
  if (!box) return;
  const owned = ownedChars();
  box.innerHTML = CHARACTERS.map(c => {
    const id = presetIdFor(c.id);
    const isOwned = owned.has(c.id);
    const equipped = outfit.preset === id;
    const price = Number(c.cost || 0);
    return `
      <article class="sh-char ${equipped ? 'is-equipped' : ''}" style="--char-glow:${c.color}33">
        <div class="sh-char__media">
          <span class="sh-char__rarity" data-r="${esc(c.rarity)}">${esc(c.rarity)}</span>
          ${isOwned ? `<span class="sh-char__owned">${icon('check', 12)}</span>` : ''}
          <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.hidden=false">
          <span class="sh-char__emoji" hidden>${icon(c.rarity === 'legendary' ? 'user' : 'compass', 40)}</span>
        </div>
        <div class="sh-char__body">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.desc)}</p>
          <span class="sh-char__bonus">${icon('star', 10)} ${esc(c.bonus)}</span>
          <div class="sh-char__buy">
            ${equipped
              ? `<button class="g-btn g-btn--sm g-btn--ghost" type="button" disabled>กำลังใช้งาน</button>`
              : isOwned
                ? `<button class="g-btn g-btn--sm g-btn--mint" type="button" data-equip="${esc(c.id)}">สวมชุดนี้</button>`
                : `<button class="g-btn g-btn--sm" type="button" data-buy-char="${esc(c.id)}">${icon('coin', 13)} ${price}</button>`}
          </div>
        </div>
      </article>`;
  }).join('');

  box.querySelectorAll('[data-equip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = presetIdFor(btn.dataset.equip);
      if (!PRESETS[id]) return;
      outfit = { ...PRESETS[id] };
      saveOutfit(outfit);
      confetti(16);
      toast('สวมชุดตัวละครแล้ว');
      renderChars();
    });
  });

  box.querySelectorAll('[data-buy-char]').forEach(btn => {
    btn.addEventListener('click', () => buyChar(btn.dataset.buyChar));
  });
}

function buyChar(charId) {
  const char = CHARACTERS.find(c => c.id === charId);
  if (!char) return;
  const cost = Number(char.cost || 0);
  if (getTokens() < cost) {
    toast(`โทเคนไม่พอ ต้องใช้ ${formatNum(cost)} โทเคน`, 'error');
    return;
  }
  if (!confirm(`ปลดล็อก “${char.name}” ด้วย ${formatNum(cost)} โทเคน?`)) return;
  setTokens(getTokens() - cost);
  writeJSON(OWNED_KEY, [...new Set([...readJSON(OWNED_KEY, []), char.id])]);
  const id = presetIdFor(char.id);
  if (PRESETS[id]) {
    outfit = { ...PRESETS[id] };
    saveOutfit(outfit);
  }
  confetti(38);
  toast(`ปลดล็อก ${char.name} แล้ว`);
  updateWallet();
  renderChars();
}

function renderPacks() {
  const box = $('shopPacks');
  if (!box) return;
  box.innerHTML = PACKS.map(pack => `
    <article class="sh-pack ${pack.hot ? 'is-hot' : ''}">
      ${pack.hot ? `<span class="sh-pack__badge">คุ้มที่สุด</span>` : ''}
      <span class="sh-pack__coin">${icon(pack.icon || 'coin', 20)}</span>
      <div class="sh-pack__body">
        <strong>${formatNum(pack.tokens + pack.bonus)} โทเคน</strong>
        <span>${esc(pack.note)}</span>
        ${pack.bonus ? `<span class="bonus">+${formatNum(pack.bonus)} โบนัส</span>` : ''}
      </div>
      <div class="sh-pack__price">
        <b>฿${formatNum(pack.price)}</b>
        <button class="g-btn g-btn--sm ${pack.hot ? '' : 'g-btn--ghost'}" type="button" data-buy-pack="${pack.id}">ซื้อ</button>
      </div>
    </article>`).join('');
  box.querySelectorAll('[data-buy-pack]').forEach(btn => {
    btn.addEventListener('click', () => buyPack(btn.dataset.buyPack));
  });
}

function buyPack(id) {
  const pack = PACKS.find(p => p.id === id);
  if (!pack) return;
  const total = pack.tokens + pack.bonus;
  if (!confirm(`โหมดตัวอย่าง: เติม ${formatNum(total)} โทเคนในราคา ฿${pack.price} โดยไม่มีการชำระเงินจริง\n\nดำเนินการต่อ?`)) return;
  awardTokens(total, `แพ็ก ${formatNum(pack.tokens)} โทเคน`);
  const history = readJSON(TOPUP_KEY, []);
  history.unshift({ at: Date.now(), tokens: total, price: pack.price, label: `แพ็ก ${formatNum(pack.tokens)}` });
  writeJSON(TOPUP_KEY, history.slice(0, 30));
  confetti(42);
  updateWallet();
  renderPacks();
  renderHistory();
}

function renderPerks() {
  const box = $('shopPerks');
  if (!box) return;
  const owned = ownedPerks();
  box.innerHTML = PERKS.map(p => `
    <article class="sh-perk ${owned.has(p.id) ? 'is-owned' : ''}">
      <span class="sh-perk__ico">${icon(p.icon || 'star', 18)}</span>
      <div class="sh-perk__body">
        <strong>${esc(p.name)}</strong>
        <span>${esc(p.desc)}</span>
        <span class="g-coin">${icon('coin', 12)} ${formatNum(p.cost)}</span>
      </div>
      <div class="sh-perk__buy">
        ${owned.has(p.id)
          ? `<span class="g-chip g-chip--mint">${icon('check', 11)} มีแล้ว</span>`
          : `<button class="g-btn g-btn--sm" type="button" data-buy-perk="${esc(p.id)}">ซื้อ</button>`}
      </div>
    </article>`).join('');
  box.querySelectorAll('[data-buy-perk]').forEach(btn => {
    btn.addEventListener('click', () => buyPerk(btn.dataset.buyPerk));
  });
}

function buyPerk(id) {
  const perk = PERKS.find(p => p.id === id);
  if (!perk) return;
  if (getTokens() < perk.cost) {
    toast(`โทเคนไม่พอ ต้องใช้ ${formatNum(perk.cost)} โทเคน`, 'error');
    return;
  }
  if (!confirm(`ซื้อ “${perk.name}” ด้วย ${formatNum(perk.cost)} โทเคน?`)) return;
  setTokens(getTokens() - perk.cost);
  writeJSON(PERKS_KEY, [...new Set([...readJSON(PERKS_KEY, []), perk.id])]);
  confetti(26);
  toast(`เปิดใช้ ${perk.name} แล้ว`);
  updateWallet();
  renderPerks();
}

function renderHistory() {
  const box = $('shopHistory');
  if (!box) return;
  const rows = readJSON(TOPUP_KEY, []).slice(0, 5);
  box.innerHTML = rows.length
    ? rows.map(r => `
      <div class="sh-history__row">
        <span>${new Date(r.at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} · ${esc(r.label)}</span>
        <b class="plus">+${formatNum(r.tokens)}</b>
      </div>`).join('')
    : `<p class="app-tiny" style="margin:0">ยังไม่มีประวัติการเติมโทเคน</p>`;
}

function switchTab(next) {
  tab = next;
  document.querySelectorAll('[data-shop-tab]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.shopTab === tab);
    btn.setAttribute('aria-selected', String(btn.dataset.shopTab === tab));
  });
  $('shopCharsSection').hidden = tab !== 'chars';
  $('shopTokensSection').hidden = tab !== 'tokens';
  $('shopPerksSection').hidden = tab !== 'perks';
}

function boot() {
  renderChars();
  renderPacks();
  renderPerks();
  renderHistory();
  updateWallet();
  document.querySelectorAll('[data-shop-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.shopTab));
  });
  switchTab('chars');

  window.addEventListener('tc-tokens', updateWallet);
}

document.addEventListener('DOMContentLoaded', boot);
