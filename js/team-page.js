// team-page.js — shared team builder + boss targets screen.
// Works inside the desktop shell (team.html) and the phone shell (team-mobile.html).

import { esc, toast } from './ui.js';
import { icon, iconFor } from './icons.js';
import { openBattle } from './battle.js';
import {
  MAX_TEAM, RARITIES, bossDefeated, bossModel, characterById, getProgress,
  getTeam, isOwned, listBosses, listCharacters, playerLevel, skillById,
  subscribe, toggleTeamMember,
} from './game-data.js';

const $ = id => document.getElementById(id);

let busy = false;

function rarityChip(rarity) {
  const r = RARITIES[rarity] || RARITIES.common;
  return `<span class="tm-rarity" style="--r:${r.tone};--rb:${r.bg}">${esc(r.label)}</span>`;
}

function hpBar(value, max, tone = 'green') {
  const pct = Math.max(0, Math.min(100, (Number(value) / Math.max(1, Number(max))) * 100));
  return `<span class="tm-bar tm-bar--${tone}"><i style="width:${pct}%"></i></span>`;
}

function renderHero() {
  const level = playerLevel();
  const progress = getProgress();
  const bosses = listBosses();
  const beaten = bosses.filter(b => progress.defeated.includes(b.id)).length;
  return `
    <section class="tm-hero">
      <div class="tm-hero__copy">
        <p class="tm-kicker">AR BATTLE TEAM</p>
        <h1>ทีมนักสำรวจ</h1>
        <p>จัดทีมสูงสุด ${MAX_TEAM} คน ตั้งสกิลประจำตัวและออกไปท้าบอสที่ประจำอยู่ในสถานที่จริง</p>
      </div>
      <div class="tm-hero__stats">
        <div class="tm-stat"><b>Lv.${level.level}</b><span>ระดับทีม</span></div>
        <div class="tm-stat"><b>${progress.wins}</b><span>ชนะบอส</span></div>
        <div class="tm-stat"><b>${beaten}/${bosses.length}</b><span>บอสที่พิชิต</span></div>
      </div>
      <div class="tm-xp">
        <span>${level.into} / ${level.need} XP</span>
        <span>${icon('coin', 11)} ${progress.tokens} โทเคนจากบอส</span>
      </div>
      ${hpBar(level.into, level.need, 'gold')}
    </section>`;
}

function renderTeam() {
  const team = getTeam();
  const chars = team.map(characterById).filter(Boolean);
  const slots = Array.from({ length: MAX_TEAM }, (_, i) => chars[i] || null);
  return `
    <section class="tm-section">
      <div class="tm-section__head">
        <div>
          <h2>ทีมปัจจุบัน</h2>
          <p>เลือกได้ ${MAX_TEAM} คน · คนแรกจะลงสนามก่อน</p>
        </div>
        <span class="g-chip g-chip--mint">${chars.length}/${MAX_TEAM} พร้อมรบ</span>
      </div>
      <div class="tm-slots">
        ${slots.map((c, i) => c ? `
          <article class="tm-slot is-filled" style="--char:${c.color || '#0F8A5F'}">
            <span class="tm-slot__idx">${i + 1}</span>
            <div class="tm-slot__media"><img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"></div>
            <div class="tm-slot__body">
              <strong>${esc(c.name)}</strong>
              <span>${esc(c.role || 'นักเดินทาง')} · ${esc(skillById(c.skillId)?.name || 'ไม่มีสกิล')}</span>
            </div>
            <button class="tm-slot__x" type="button" data-team-remove="${esc(c.id)}" aria-label="เอาออกจากทีม">${icon('close', 12)}</button>
          </article>` : `
          <article class="tm-slot is-empty">
            <span class="tm-slot__idx">${i + 1}</span>
            <span class="tm-slot__plus">${icon('plus', 20)}</span>
            <span class="tm-slot__hint">ช่องว่าง — เลือกตัวละครด้านล่าง</span>
          </article>`).join('')}
      </div>
    </section>`;
}

function renderRoster() {
  const team = getTeam();
  const chars = listCharacters();
  return `
    <section class="tm-section">
      <div class="tm-section__head">
        <div>
          <h2>ตัวละครของฉัน</h2>
          <p>แตะการ์ดเพื่อใส่หรือถอดจากทีม</p>
        </div>
      </div>
      <div class="tm-roster">
        ${chars.map(c => {
          const owned = isOwned(c.id);
          const inTeam = team.includes(c.id);
          const skill = skillById(c.skillId);
          return `
          <article class="tm-char ${owned ? '' : 'is-locked'} ${inTeam ? 'is-picked' : ''}" style="--char:${c.color || '#0F8A5F'}">
            <button class="tm-char__btn" type="button" data-team-toggle="${esc(c.id)}" ${owned ? '' : 'disabled'}
              aria-pressed="${inTeam}" aria-label="${inTeam ? 'ถอด' : 'ใส่'} ${esc(c.name)} ในทีม">
              <span class="tm-char__media">
                <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">
                ${owned ? '' : `<span class="tm-char__lock">${icon('lock', 20)}</span>`}
                ${inTeam ? `<span class="tm-char__check">${icon('check', 12)}</span>` : ''}
              </span>
              <span class="tm-char__body">
                <span class="tm-char__top">
                  <strong>${esc(owned ? c.name : 'ยังไม่ปลดล็อก')}</strong>
                  ${rarityChip(c.rarity)}
                </span>
                <span class="tm-char__role">${esc(c.role || 'นักเดินทาง')}</span>
                <span class="tm-stats">
                  <span>${icon('heart', 11)} ${Number(c.hp || 0)}</span>
                  <span>${icon('flame', 11)} ${Number(c.atk || 0)}</span>
                  <span>${icon('shield', 11)} ${Number(c.def || 0)}</span>
                </span>
                <span class="tm-skill">${icon(skill?.icon || 'star', 12)} ${esc(skill?.name || 'โจมตีพื้นฐาน')}</span>
              </span>
              <span class="tm-char__state">${inTeam ? 'อยู่ในทีม' : owned ? 'แตะเพื่อใส่ทีม' : 'ปลดล็อกด้วยโทเคนในร้านค้า'}</span>
            </button>
          </article>`;
        }).join('')}
      </div>
    </section>`;
}

function renderBosses() {
  const bosses = listBosses();
  const progress = getProgress();
  return `
    <section class="tm-section">
      <div class="tm-section__head">
        <div>
          <h2>บอสประจำสถานที่</h2>
          <p>บอสจะปรากฏบนแผนที่ AR — แตะเพื่อท้าสู้แบบเทิร์นเบส</p>
        </div>
        <a class="g-chip g-chip--gold" href="${document.body.classList.contains('app-phone') ? '/explore-mobile.html' : '/adventure.html'}">
          ${icon('map', 12)} เปิดแผนที่
        </a>
      </div>
      <div class="tm-bosses">
        ${bosses.map(b => {
          const model = bossModel(b.model);
          const done = progress.defeated.includes(b.id) || bossDefeated(b.id);
          const skill = skillById(b.skillId);
          return `
          <article class="tm-boss ${done ? 'is-done' : ''}" style="--char:${model.tint}">
            <div class="tm-boss__media">
              <img src="${esc(model.image)}" alt="${esc(b.name)}" loading="lazy">
              <span class="tm-boss__lv">Lv.${Number(b.level || 1)}</span>
            </div>
            <div class="tm-boss__body">
              <strong>${esc(b.name)}</strong>
              <span>${icon('pin', 11)} ${esc(b.placeName || 'สถานที่')}</span>
              <span class="tm-boss__skill">${icon(skill?.icon || 'flame', 11)} ${esc(skill?.name || 'โจมตี')}</span>
              <span class="tm-boss__reward">${icon('coin', 11)} +${Number(b.reward || 0)} โทเคน</span>
            </div>
            <button class="g-btn ${done ? 'g-btn--ghost' : 'g-btn--mint'} g-btn--sm" type="button"
              data-boss-fight="${esc(b.id)}" ${done ? 'disabled' : ''}>
              ${done ? `${icon('check', 12)} พิชิตแล้ว` : `${icon('quest', 12)} ท้าสู้`}
            </button>
          </article>`;
        }).join('')}
      </div>
    </section>`;
}

function render() {
  const root = $('teamRoot');
  if (!root) return;
  root.innerHTML = `
    <div class="tm-page">
      ${renderHero()}
      ${renderTeam()}
      ${renderRoster()}
      ${renderBosses()}
    </div>`;
  bind();
}

function bind() {
  const root = $('teamRoot');
  if (!root) return;

  root.querySelectorAll('[data-team-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.teamToggle;
      const team = getTeam();
      if (!team.includes(id) && team.length >= MAX_TEAM) toast(`ทีมเต็มแล้ว (${MAX_TEAM} คน) — ถอดตัวเดิมก่อน`);
      toggleTeamMember(id);
    });
  });

  root.querySelectorAll('[data-team-remove]').forEach(btn => {
    btn.addEventListener('click', () => toggleTeamMember(btn.dataset.teamRemove));
  });

  root.querySelectorAll('[data-boss-fight]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (busy) return;
      const { bossById } = await import('./game-data.js');
      const boss = bossById(btn.dataset.bossFight);
      if (!boss) return;
      if (!getTeam().length) { toast('เลือกตัวละครเข้าทีมก่อนออกสู้'); return; }
      busy = true;
      openBattle({
        boss,
        onFinish: result => {
          busy = false;
          if (result?.win) toast(`ชนะ ${boss.name}! ได้ ${result.tokens} โทเคน`);
        },
      });
      setTimeout(() => { busy = false; }, 800);
    });
  });
}

export function initTeamPage() {
  render();
  subscribe(() => render());
}
