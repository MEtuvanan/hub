// topup-mobile.js — token packs, earning guide, and top-up history (local demo).

import { esc, toast, confirmDialog } from './ui.js';
import { icon } from './icons.js';
import { readJSON, writeJSON } from './mobile-data.js';
import {
  getTokens, awardTokens, confetti, formatNum, levelInfo,
} from './mobile-app.js';

const $ = id => document.getElementById(id);
const TOPUP_KEY = 'tc_mobile_topups';

const PACKS = [
  { id: 'tp300', tokens: 300, bonus: 0, price: 59, emoji: '🪙', note: 'เริ่มต้นสายนักสำรวจ' },
  { id: 'tp700', tokens: 700, bonus: 50, price: 129, emoji: '💰', note: 'คุ้มค่าที่สุดสำหรับเควสท์รายวัน', hot: true },
  { id: 'tp1500', tokens: 1500, bonus: 150, price: 259, emoji: '🧰', note: 'ปลดล็อกตัวละครระดับ Epic' },
  { id: 'tp3200', tokens: 3200, bonus: 400, price: 499, emoji: '💎', note: 'สำหรับนักสะสมตัวจริง' },
];

const EARN = [
  { emoji: '⭐', title: 'ดาวนำทางประจำวัน', desc: 'กดปุ่มดาวมุมขวาบนของแอป', value: '+25', href: '#' },
  { emoji: '🎯', title: 'ทำเควสท์ที่เที่ยว', desc: 'เช็คอินสถานที่เพื่อรับโทเคน', value: '+60–160', href: '/quests-mobile.html' },
  { emoji: '📸', title: 'บันทึกไดอารี่', desc: 'เล่าเรื่องทริปและเก็บความทรงจำ', value: 'สะสม', href: '/journal-mobile.html' },
  { emoji: '💚', title: 'บันทึกสถานที่โปรด', desc: 'กดหัวใจในหน้าค้นหาและหน้ารายละเอียด', value: 'สะสม', href: '/search-mobile.html' },
];

function renderWallet() {
  const tokens = getTokens();
  const info = levelInfo(tokens);
  if ($('tpTokens')) $('tpTokens').textContent = formatNum(tokens);
  if ($('tpLevel')) $('tpLevel').textContent = `Lv.${info.level}`;
  if ($('tpBar')) $('tpBar').style.width = `${info.pct}%`;
  if ($('tpProgress')) $('tpProgress').textContent = `อีก ${formatNum(info.need - info.into)} โทเคนถึงเลเวล ${info.level + 1}`;
}

function renderPacks() {
  const box = $('tpPacks');
  if (!box) return;
  box.innerHTML = PACKS.map(pack => `
    <article class="tp-pack ${pack.hot ? 'is-hot' : ''}">
      <span class="tp-pack__ico">${pack.emoji}</span>
      <div class="tp-pack__body">
        ${pack.hot ? `<span class="tp-pack__badge">คุ้มที่สุด</span>` : ''}
        <strong>${formatNum(pack.tokens + pack.bonus)} โทเคน</strong>
        <span>${esc(pack.note)}</span>
        ${pack.bonus ? `<span class="bonus">+${formatNum(pack.bonus)} โบนัส</span>` : ''}
      </div>
      <div class="tp-pack__price">
        <b>฿${formatNum(pack.price)}</b>
        <button class="g-btn g-btn--sm ${pack.hot ? '' : 'g-btn--ghost'}" type="button" data-pack="${esc(pack.id)}">เติม</button>
      </div>
    </article>`).join('');

  box.querySelectorAll('[data-pack]').forEach(btn => {
    btn.addEventListener('click', () => buy(btn.dataset.pack));
  });
}

function renderEarn() {
  const box = $('tpEarn');
  if (!box) return;
  box.innerHTML = EARN.map(row => `
    <a class="tp-earn__row" href="${esc(row.href)}">
      <span class="tp-earn__ico">${row.emoji}</span>
      <span class="tp-earn__body">
        <strong>${esc(row.title)}</strong>
        <span>${esc(row.desc)}</span>
      </span>
      <span class="tp-earn__value">${esc(row.value)}</span>
    </a>`).join('');
  box.querySelector('[href="#"]')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('appStarBtn')?.click();
  });
}

function renderHistory() {
  const box = $('tpHistory');
  if (!box) return;
  const rows = readJSON(TOPUP_KEY, []);
  if (!rows.length) {
    box.innerHTML = `<div class="tp-empty">ยังไม่มีประวัติการเติมโทเคน<br>เลือกแพ็กด้านบนเพื่อเริ่มต้น</div>`;
    return;
  }
  box.innerHTML = rows.map(r => {
    const d = new Date(r.at);
    const when = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="tp-history__row">
        <span>${esc(when)} · ${esc(r.label || 'เติมโทเคน')}</span>
        <b>+${formatNum(r.tokens)} ${icon('coin', 12)}</b>
      </div>`;
  }).join('');
}

function buy(id) {
  const pack = PACKS.find(p => p.id === id);
  if (!pack) return;
  const total = pack.tokens + pack.bonus;
  if (!confirm(`โหมดตัวอย่าง: เติม ${formatNum(total)} โทเคนในราคา ฿${formatNum(pack.price)}\nโดยไม่มีการชำระเงินจริง\n\nดำเนินการต่อ?`)) return;

  awardTokens(total, `เติม ${formatNum(total)} โทเคน`);
  const history = readJSON(TOPUP_KEY, []);
  history.unshift({
    at: Date.now(),
    tokens: total,
    price: pack.price,
    label: `แพ็ก ${formatNum(pack.tokens)}${pack.bonus ? ` +${formatNum(pack.bonus)}` : ''}`,
  });
  writeJSON(TOPUP_KEY, history.slice(0, 30));
  confetti(42);
  renderWallet();
  renderHistory();
}

async function clearHistory() {
  if (!readJSON(TOPUP_KEY, []).length) {
    toast('ยังไม่มีประวัติให้ล้าง');
    return;
  }
  const ok = await confirmDialog({
    title: 'ล้างประวัติการเติม?',
    message: 'รายการเติมโทเคนทั้งหมดจะถูกลบ แต่โทเคนที่เติมแล้วยังอยู่',
    confirmLabel: 'ล้างประวัติ',
    danger: true,
  });
  if (!ok) return;
  writeJSON(TOPUP_KEY, []);
  toast('ล้างประวัติแล้ว');
  renderHistory();
}

function boot() {
  renderWallet();
  renderPacks();
  renderEarn();
  renderHistory();
  $('tpClear')?.addEventListener('click', clearHistory);
  window.addEventListener('tc-tokens', renderWallet);
}

document.addEventListener('DOMContentLoaded', boot);
