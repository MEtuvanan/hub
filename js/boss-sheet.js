// boss-sheet.js — boss encounter card shared by PC and mobile.
// Tapping a boss pin on the AR map opens this sheet, then the turn-based
// battle overlay takes over once the player confirms.

import { esc } from './ui.js';
import { icon } from './icons.js';
import { openBattle } from './battle.js';
import { RARITIES, bossDefeated, bossModel, skillById } from './game-data.js';

const CSS_HREF = '/css/pages/battle.css';

function ensureCss() {
  if (document.querySelector(`link[href="${CSS_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  document.head.appendChild(link);
}

/**
 * Show the boss encounter card.
 * @param {object} boss
 * @param {{place?: object, onFinish?: Function, onTeam?: Function}} options
 */
export function openBossPrompt(boss, options = {}) {
  if (!boss) return null;
  ensureCss();
  document.getElementById('tcBossSheet')?.remove();

  const model = bossModel(boss.model);
  const skill = skillById(boss.skillId);
  const rarity = RARITIES[boss.rarity] || RARITIES.epic;
  const done = bossDefeated(boss.id) || false;
  const placeName = options.place?.name || boss.placeName || 'สถานที่นี้';
  const isPhone = document.body.classList.contains('app-phone');
  const teamHref = isPhone ? '/team-mobile.html' : '/team.html';

  const dlg = document.createElement('dialog');
  dlg.id = 'tcBossSheet';
  dlg.className = 'boss-sheet';
  dlg.setAttribute('aria-label', `พบบอส ${boss.name}`);
  dlg.innerHTML = `
    <div class="boss-sheet__inner">
      <button class="boss-sheet__close" type="button" data-boss-close aria-label="ปิด">${icon('close', 15)}</button>

      <div class="boss-sheet__hero" style="--boss-color:${model.tint}">
        <span class="boss-sheet__halo" aria-hidden="true"></span>
        <img src="${esc(model.image)}" alt="${esc(boss.name)}" draggable="false">
        <span class="boss-sheet__lv">Lv.${Number(boss.level || 1)}</span>
      </div>

      <p class="boss-sheet__kicker">${icon('warning', 11)} บอสประจำสถานที่</p>
      <h2 class="boss-sheet__name">${esc(boss.name)}</h2>
      <p class="boss-sheet__place">${icon('pin', 11)} ${esc(placeName)}</p>
      <p class="boss-sheet__desc">${esc(boss.desc || 'ผู้พิทักษ์แห่งสถานที่นี้ รอผู้กล้ามาท้าทาย')}</p>

      <div class="boss-sheet__stats">
        <span>${icon('heart', 11)} ${Number(boss.hp || 0)}</span>
        <span>${icon('flame', 11)} ${Number(boss.atk || 0)}</span>
        <span>${icon('shield', 11)} ${Number(boss.def || 0)}</span>
        <span>${icon('clock', 11)} ${Number(boss.spd || 0)}</span>
      </div>

      <div class="boss-sheet__rows">
        <div class="boss-sheet__row">
          <span>${icon(skill?.icon || 'star', 12)} สกิล</span>
          <b>${esc(skill?.name || 'โจมตีพื้นฐาน')}</b>
        </div>
        <div class="boss-sheet__row">
          <span>${icon('coin', 12)} รางวัล</span>
          <b>+${Number(boss.reward || 0)} โทเคน</b>
        </div>
        <div class="boss-sheet__row">
          <span>${icon('trophy', 12)} ระดับ</span>
          <b style="color:${rarity.tone}">${esc(rarity.label)}</b>
        </div>
      </div>

      ${done ? `<p class="boss-sheet__note">${icon('check', 11)} พิชิตบอสตัวนี้แล้ว — ยังท้าซ้ำเพื่อสะสมโทเคนได้</p>` : ''}

      <div class="boss-sheet__actions">
        <button class="g-btn g-btn--gold" type="button" data-boss-fight>
          ${icon('flame', 15)} ท้าสู้แบบเทิร์นเบส
        </button>
        <a class="g-btn g-btn--ghost" href="${teamHref}">${icon('shield', 14)} จัดทีมก่อน</a>
      </div>
    </div>`;

  document.body.appendChild(dlg);

  const close = () => dlg.close();
  dlg.querySelectorAll('[data-boss-close]').forEach(btn => btn.addEventListener('click', close));
  dlg.querySelector('[data-boss-fight]')?.addEventListener('click', () => {
    close();
    openBattle({
      boss,
      place: options.place,
      onFinish: result => options.onFinish?.(result),
    });
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => dlg.remove());

  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  return { close };
}
