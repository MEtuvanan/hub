// battle.js — turn-based AR boss battle overlay inspired by Pokémon Go raid battles.
// Features:
// - Top HUD: Active Hero HP/CP/Charge bar (left), Orange circular turn countdown (center), Boss HP/CP (right)
// - 3D Stadium Arena with concentric white court rings, towering Boss in center, Player hero viewed from behind
// - Floating Flee and Swap Character buttons on the bottom right
// - Fast Attack and Charged Special Skill buttons with energy charging and floating damage numbers
// - Team roster drawer for switching active characters mid-battle
// - Persists wins, awards tokens/XP, and updates game progress

import { esc } from './ui.js';
import { icon } from './icons.js';
import { isLocalModelRef, resolveBossModelUrl } from './boss-model-store.js';
import {
  MAX_TEAM, RARITIES, bossById, bossDefeated, bossModel, characterById,
  getTeam, getProgress, recordBossWin, skillById,
} from './game-data.js';

const CSS_HREF = '/css/pages/battle.css';
const TURN_SECONDS = 18;
const rnd = (min, max) => min + Math.random() * (max - min);

function ensureCss() {
  if (document.querySelector(`link[href="${CSS_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  document.head.appendChild(link);
}

function ensureModelViewer() {
  if (typeof customElements !== 'undefined' && customElements.get('model-viewer')) return;
  if (document.querySelector('script[src*="model-viewer"]')) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
  document.head.appendChild(script);
}

function battleTeam() {
  const ids = getTeam().slice(0, MAX_TEAM);
  const chars = ids.map(characterById).filter(Boolean);
  if (chars.length) return chars;
  return [characterById('char-ray')].filter(Boolean);
}

function damageOf(atk, power, def) {
  const raw = atk * power - def * 0.52;
  return Math.max(8, Math.round(raw * rnd(0.9, 1.15)));
}

function barPct(hp, max) {
  return Math.max(0, Math.min(100, (hp / max) * 100));
}

function calcHeroCP(char) {
  if (char.cp) return Number(char.cp);
  return Math.round((Number(char.atk || 48) * 24) + (Number(char.def || 24) * 16) + (Number(char.hp || 320) * 1.8));
}

function calcBossCP(boss) {
  if (boss.cp) return Number(boss.cp);
  const lvl = Number(boss.level || 5);
  return Math.round(lvl * 2800 + (Number(boss.atk || 50) * 90) + (Number(boss.hp || 500) * 14));
}

/**
 * Open a Pokémon Go raid style turn-based boss battle.
 * @param {{boss?: object, bossId?: string, place?: object, onFinish?: Function}} options
 */
export async function openBattle(options = {}) {
  ensureCss();
  ensureModelViewer();
  document.getElementById('tcBattle')?.remove();

  const boss = options.boss || (options.bossId ? bossById(options.bossId) : null);
  if (!boss) {
    console.warn('[battle] missing boss');
    return null;
  }
  const placeName = options.place?.name || boss.placeName || 'สถานที่ท้าประลอง';
  const model = bossModel(boss.model);
  // Models uploaded through the admin console live in IndexedDB; resolve the
  // stored file to an object URL before rendering <model-viewer>.
  const modelUrl = boss.modelUrl ? await resolveBossModelUrl(boss.modelUrl) : '';
  const objectModelUrls = isLocalModelRef(boss.modelUrl) && modelUrl ? [modelUrl] : [];
  const bSkill = skillById(boss.skillId) || skillById('boss-slam');
  const firstClear = !bossDefeated(boss.id);

  const roster = battleTeam().map(char => ({
    char,
    maxHp: Math.round(char.hp || 320),
    hp: Math.round(char.hp || 320),
    cp: calcHeroCP(char),
    energy: 1, // 0 to 3
    shield: 0,
  }));

  if (!roster.length) return null;

  // Resolve each character's model once so render() can stay synchronous.
  for (const unit of roster) {
    unit.modelUrl = '';
    if (!unit.char.modelUrl) continue;
    try {
      unit.modelUrl = await resolveBossModelUrl(unit.char.modelUrl);
      if (isLocalModelRef(unit.char.modelUrl) && unit.modelUrl) objectModelUrls.push(unit.modelUrl);
    } catch { unit.modelUrl = ''; }
  }

  const state = {
    boss,
    bossModel: model,
    bossSkill: bSkill,
    bossMaxHp: Math.round(boss.hp || 540),
    bossHp: Math.round(boss.hp || 540),
    bossAtk: Number(boss.atk || 52),
    bossAtkMod: 0,
    bossDef: Number(boss.def || 26),
    bossCp: calcBossCP(boss),
    team: roster,
    active: 0,
    round: 1,
    turn: 'player', // 'player' | 'boss' | 'end'
    timeLeft: TURN_SECONDS,
    timerId: null,
    busy: false,
    over: false,
    showRoster: false,
    floatingTexts: [],
    log: [],
  };

  const dlg = document.createElement('dialog');
  dlg.id = 'tcBattle';
  dlg.className = 'btl';
  dlg.setAttribute('aria-label', `ท้าประลองบอส ${boss.name}`);
  document.body.appendChild(dlg);

  const active = () => state.team[state.active];
  const aliveUnits = () => state.team.filter(u => u.hp > 0);

  function log(text, tone = '') {
    state.log.unshift({ text, tone });
    state.log = state.log.slice(0, 4);
    const box = dlg.querySelector('[data-btl-log]');
    if (box) {
      box.innerHTML = state.log.map(row =>
        `<p class="btl__log-row${row.tone ? ` is-${row.tone}` : ''}">${esc(row.text)}</p>`).join('');
    }
  }

  function spawnDamage(text, isCrit = false, target = 'boss') {
    const stage = dlg.querySelector('.btl__stage');
    if (!stage) return;
    const floater = document.createElement('div');
    floater.className = `btl__floater ${isCrit ? 'is-crit' : ''} is-${target}`;
    floater.textContent = text;
    stage.appendChild(floater);
    setTimeout(() => floater.remove(), 1200);
  }

  function shakeTarget(target = 'boss') {
    const el = dlg.querySelector(target === 'boss' ? '.btl__boss' : '.btl__hero');
    if (!el) return;
    el.classList.add('is-hit');
    setTimeout(() => el.classList.remove('is-hit'), 500);
  }

  function startTimer() {
    stopTimer();
    state.timeLeft = TURN_SECONDS;
    updateTimerUI();
    state.timerId = setInterval(() => {
      if (state.over || state.busy) return;
      state.timeLeft -= 1;
      updateTimerUI();
      if (state.timeLeft <= 0) {
        if (state.turn === 'player') {
          log('หมดเวลาเทิร์น! โจมตีอัตโนมัติ');
          playerAct('attack');
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerUI() {
    const timerEl = dlg.querySelector('[data-btl-timer]');
    const numEl = dlg.querySelector('[data-btl-timer-num]');
    if (numEl) numEl.textContent = String(Math.max(0, state.timeLeft));
    if (timerEl) {
      const pct = (state.timeLeft / TURN_SECONDS) * 360;
      timerEl.style.setProperty('--sweep', `${360 - pct}deg`);
    }
  }

  function render() {
    if (!dlg.isConnected) return;
    const unit = active();
    const bossPct = barPct(state.bossHp, state.bossMaxHp);
    const heroPct = unit ? barPct(unit.hp, unit.maxHp) : 0;
    const heroEnergyPct = unit ? Math.min(100, (unit.energy / 3) * 100) : 0;
    const rarity = RARITIES[boss.rarity] || RARITIES.epic;
    const alive = aliveUnits();

    dlg.innerHTML = `
      <div class="btl__frame">
        <button class="btl__close" type="button" data-btl-close aria-label="ปิดการต่อสู้">${icon('close', 16)}</button>

        <!-- TOP RAID HUD (POKEMON GO STYLE) -->
        <header class="btl__top-hud">
          <!-- HERO STATUS (LEFT) -->
          <div class="btl__hud-side btl__hud-side--hero">
            <div class="btl__name-row">
              <strong class="btl__char-name">${esc(unit?.char.name || 'นักสำรวจ')}</strong>
            </div>
            <div class="btl__hp-wrap">
              <div class="btl__hp-bar btl__hp-bar--hero" role="progressbar" aria-label="HP ฮีโร่">
                <i style="width:${heroPct}%"></i>
              </div>
              <div class="btl__energy-bar" title="เกจชาร์จสกิลพิเศษ">
                <i style="width:${heroEnergyPct}%"></i>
              </div>
            </div>
            <div class="btl__cp-row">
              <span class="btl__cp-badge">CP ${unit ? unit.cp : 2149}</span>
              ${unit?.shield ? `<span class="btl__shield-tag">${icon('shield', 11)} โล่ ${unit.shield}</span>` : ''}
            </div>
          </div>

          <!-- CENTER ROUND TIMER -->
          <div class="btl__timer-wrap" data-btl-timer aria-label="เวลาที่เหลือ">
            <div class="btl__timer-dial">
              <span class="btl__timer-num" data-btl-timer-num>${state.timeLeft}</span>
            </div>
          </div>

          <!-- BOSS STATUS (RIGHT) -->
          <div class="btl__hud-side btl__hud-side--boss">
            <div class="btl__name-row btl__name-row--right">
              <strong class="btl__boss-name">${esc(boss.name)}</strong>
            </div>
            <div class="btl__hp-wrap">
              <div class="btl__hp-bar btl__hp-bar--boss" role="progressbar" aria-label="HP บอส">
                <i style="width:${bossPct}%"></i>
              </div>
            </div>
            <div class="btl__cp-row btl__cp-row--right">
              <span class="btl__boss-level">Lv.${Number(boss.level || 1)}</span>
              <span class="btl__cp-badge btl__cp-badge--boss">CP ${state.bossCp}</span>
            </div>
          </div>
        </header>

        <!-- 3D POKEMON GO STADIUM ARENA -->
        <div class="btl__stage" style="--btl-tint:${model.tint}">
          <!-- Sky and stadium grandstand -->
          <div class="btl__stadium-sky" aria-hidden="true"></div>
          <div class="btl__stadium-wall" aria-hidden="true">
            <div class="btl__crowd-band"></div>
            <div class="btl__stadium-rail"></div>
          </div>

          <!-- 3D Stadium Field Rings -->
          <div class="btl__court" aria-hidden="true">
            <div class="btl__ring btl__ring--outer"></div>
            <div class="btl__ring btl__ring--mid"></div>
            <div class="btl__ring btl__ring--inner"></div>
            <div class="btl__court-line"></div>
          </div>

          <!-- BOSS 3D MODEL / SPRITE (CENTER/UPPER) -->
          <div class="btl__boss ${state.bossHp <= 0 ? 'is-down' : ''}">
            <div class="btl__boss-aura" style="--glow:${model.tint}"></div>
            ${modelUrl ? `
              <model-viewer src="${esc(modelUrl)}"
                poster="${esc(model.image)}"
                auto-rotate
                rotation-per-second="24deg"
                camera-controls
                shadow-intensity="1.5"
                interaction-prompt="none"
                data-btl-boss-model
                style="width:230px;height:240px;background:transparent;outline:none;"
                class="btl__boss-3d-model"
              ></model-viewer>
              <img src="${esc(model.image)}" alt="${esc(boss.name)}" draggable="false" data-btl-boss-fallback hidden>
            ` : `
              <div class="btl__boss-3d-stage">
                <span class="btl__3d-badge">3D MODEL READY</span>
                <img src="${esc(model.image)}" alt="${esc(boss.name)}" draggable="false">
              </div>
            `}
            <span class="btl__boss-shadow" aria-hidden="true"></span>
          </div>

          <!-- TURN INDICATOR -->
          <div class="btl__turn-pill ${state.turn === 'player' ? 'is-player' : 'is-boss'}">
            ${state.over ? 'จบการประลอง' : state.turn === 'player' ? `${icon('star', 12)} ตาของคุณ — แตะเพื่อโจมตี` : `${icon('flame', 12)} บอสกำลังโจมตี…`}
          </div>

          <!-- PLAYER HERO (FOREGROUND / REAR PERSPECTIVE) -->
          <div class="btl__hero ${unit && unit.hp <= 0 ? 'is-down' : ''}" style="--char:${unit?.char.color || '#0F8A5F'}">
            <div class="btl__hero-media">
              ${unit?.modelUrl ? `
                <model-viewer src="${esc(unit.modelUrl)}"
                  poster="${esc(unit.char.image || '')}"
                  auto-rotate
                  rotation-per-second="14deg"
                  camera-controls
                  shadow-intensity="1.2"
                  interaction-prompt="none"
                  data-btl-hero-model
                  class="btl__hero-3d-model"
                ></model-viewer>
                <img src="${esc(unit.char.image || '')}" alt="${esc(unit.char.name || '')}" draggable="false" data-btl-hero-fallback hidden>
              ` : `
                <img src="${esc(unit?.char.image || '')}" alt="${esc(unit?.char.name || '')}" draggable="false">
              `}
              <span class="btl__hero-shadow" aria-hidden="true"></span>
            </div>
          </div>

          <!-- FLOATING ACTION BUTTONS (BOTTOM RIGHT LIKE POKEMON GO) -->
          <div class="btl__fabs">
            <button class="btl__fab btl__fab--flee" type="button" data-btl-act="flee" title="หนีออกจากการต่อสู้" aria-label="หนี">
              <svg class="btl__fab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13 4v16M13 4l-4 4M13 4l4 4M4 12h9M18 10l3 2-3 2"/>
              </svg>
            </button>
            <button class="btl__fab btl__fab--swap" type="button" data-btl-toggle-roster title="สลับตัวละครในทีม" aria-label="สลับตัวละคร">
              <svg class="btl__fab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l-4-4M17 20l4-4"/>
              </svg>
              <span class="btl__fab-badge">${alive.length}</span>
            </button>
          </div>
        </div>

        <!-- BATTLE COMBAT LOG -->
        <div class="btl__log" data-btl-log aria-live="polite">
          ${state.log.map(row => `<p class="btl__log-row${row.tone ? ` is-${row.tone}` : ''}">${esc(row.text)}</p>`).join('')}
        </div>

        <!-- MAIN ACTION BAR -->
        ${state.over ? resultMarkup() : actionsMarkup()}

        <!-- TEAM ROSTER DRAWER (FOR SWAPPING CHARACTERS) -->
        <div class="btl__roster-drawer ${state.showRoster ? 'is-open' : ''}" id="btlRosterDrawer">
          <div class="btl__roster-head">
            <strong>สลับตัวละครในทีม (${alive.length}/${state.team.length})</strong>
            <button class="btl__roster-close" type="button" data-btl-close-roster aria-label="ปิด">${icon('close', 14)}</button>
          </div>
          <div class="btl__roster-list">
            ${state.team.map((u, i) => {
              const s = skillById(u.char.skillId);
              const isCurrent = i === state.active;
              const isFainted = u.hp <= 0;
              return `
                <button class="btl__roster-card ${isCurrent ? 'is-active' : ''} ${isFainted ? 'is-fainted' : ''}"
                  type="button" data-btl-switch="${i}" ${isCurrent || isFainted || state.turn !== 'player' || state.busy || state.over ? 'disabled' : ''}>
                  <div class="btl__roster-thumb" style="--c:${u.char.color || '#0F8A5F'}">
                    <img src="${esc(u.char.image)}" alt="${esc(u.char.name)}">
                  </div>
                  <div class="btl__roster-info">
                    <div class="btl__roster-name-row">
                      <strong>${esc(u.char.name)}</strong>
                      <span class="btl__roster-cp">CP ${u.cp}</span>
                    </div>
                    <div class="btl__roster-hp-bar">
                      <i style="width:${barPct(u.hp, u.maxHp)}%"></i>
                    </div>
                    <div class="btl__roster-sub">
                      <span>HP ${Math.max(0, u.hp)}/${u.maxHp}</span>
                      <span>${icon(s?.icon || 'star', 11)} ${esc(s?.name || 'โจมตี')}</span>
                    </div>
                  </div>
                  <span class="btl__roster-state">${isCurrent ? 'ในสนาม' : isFainted ? 'หมดสภาพ' : 'พร้อมรบ'}</span>
                </button>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    bind();
  }

  function actionsMarkup() {
    const unit = active();
    const skill = skillById(unit?.char.skillId);
    const canSkill = !!skill && (unit?.energy >= (skill.cost || 2));
    const disabled = state.turn !== 'player' || state.busy;

    return `
      <div class="btl__actions">
        <!-- FAST ATTACK BUTTON -->
        <button class="btl__btn btl__btn--attack" type="button" data-btl-act="attack" ${disabled ? 'disabled' : ''}>
          <span class="btl__btn-ico">${icon('flame', 20)}</span>
          <span class="btl__btn-text">
            <strong>โจมตีปกติ</strong>
            <small>ชาร์จเกจสกิลพิเศษ +1</small>
          </span>
        </button>

        <!-- CHARGED SPECIAL SKILL BUTTON -->
        <button class="btl__btn btl__btn--skill ${canSkill ? 'is-charged' : ''}" type="button" data-btl-act="skill" ${disabled || !canSkill ? 'disabled' : ''}>
          <span class="btl__btn-ico">${icon(skill?.icon || 'star', 20)}</span>
          <span class="btl__btn-text">
            <strong>${esc(skill?.name || 'สกิลพิเศษ')}</strong>
            <small>${canSkill ? 'พลังเต็มพร้อมปล่อย!' : `ต้องการพลัง ${skill?.cost || 2}/3`}</small>
          </span>
          <span class="btl__charge-tag">${unit?.energy || 0}/3</span>
        </button>
      </div>`;
  }

  function resultMarkup() {
    const r = state.result;
    if (!r) return '';
    const win = r.win;
    return `
      <div class="btl__result ${win ? 'is-win' : 'is-loss'}">
        <div class="btl__result-ico">${icon(win ? 'trophy' : 'warning', 32)}</div>
        <div class="btl__result-body">
          <strong class="btl__result-title">${win ? 'พิชิตบอสสำเร็จ! (VICTORY)' : 'พ่ายแพ้ในการประลอง (DEFEAT)'}</strong>
          <p class="btl__result-desc">${win
            ? `สุดยอดฝีมือ! ได้รับ +${r.tokens} โทเคน และ +${r.xp} XP${r.first ? ' (โบนัสพิชิตครั้งแรกของสถานที่นี้!)' : ''}`
            : 'ทีมหมดสภาพ แต่การผจญภัยยังไม่สิ้นสุด ฟื้นฟูทีมแล้วกลับมาท้าใหม่อีกครั้ง!'}</p>
        </div>
        <div class="btl__result-actions">
          <button class="g-btn g-btn--mint" type="button" data-btl-close>${win ? 'รับรางวัล & กลับแผนที่' : 'ออกจากสนาม'}</button>
          <a class="g-btn g-btn--ghost" href="${document.body.classList.contains('app-phone') ? '/team-mobile.html' : '/team.html'}">ปรับแต่งทีม</a>
        </div>
      </div>`;
  }

  function bind() {
    dlg.querySelectorAll('[data-btl-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopTimer();
        dlg.close();
      });
    });

    dlg.querySelector('[data-btl-act="attack"]')?.addEventListener('click', () => playerAct('attack'));
    dlg.querySelector('[data-btl-act="skill"]')?.addEventListener('click', () => playerAct('skill'));

    dlg.querySelector('[data-btl-act="flee"]')?.addEventListener('click', () => {
      if (state.busy) return;
      if (confirm('คุณต้องการถอยออกจากการประลองหรือไม่?')) {
        log('คุณถอยออกจากสนามประลอง');
        stopTimer();
        dlg.close();
      }
    });

    dlg.querySelector('[data-btl-toggle-roster]')?.addEventListener('click', () => {
      state.showRoster = !state.showRoster;
      const drawer = dlg.querySelector('#btlRosterDrawer');
      drawer?.classList.toggle('is-open', state.showRoster);
    });

    dlg.querySelector('[data-btl-close-roster]')?.addEventListener('click', () => {
      state.showRoster = false;
      dlg.querySelector('#btlRosterDrawer')?.classList.remove('is-open');
    });

    dlg.querySelectorAll('[data-btl-switch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.btlSwitch);
        switchTo(idx);
      });
    });

    // If a 3D model cannot load (bad URL, unsupported file, blocked viewer
    // script) fall back to the character/boss artwork instead of empty space.
    [['[data-btl-boss-model]', '[data-btl-boss-fallback]'],
      ['[data-btl-hero-model]', '[data-btl-hero-fallback]']].forEach(([modelSel, fallbackSel]) => {
      dlg.querySelectorAll(modelSel).forEach(mv => {
        mv.addEventListener('error', () => showModelFallback(mv, fallbackSel));
        setTimeout(() => {
          if (!dlg.isConnected || !mv.isConnected) return;
          if (typeof customElements === 'undefined' || !customElements.get('model-viewer')) {
            showModelFallback(mv, fallbackSel);
          }
        }, 8000);
      });
    });
  }

  function showModelFallback(mv, selector) {
    const fallback = dlg.querySelector(selector);
    if (fallback) fallback.hidden = false;
    mv.remove();
  }

  function spendEnergy(unit, cost = 2) {
    unit.energy = Math.max(0, unit.energy - Number(cost || 0));
  }

  function playerAct(kind) {
    if (state.busy || state.turn !== 'player' || state.over) return;
    const unit = active();
    if (!unit || unit.hp <= 0) return;
    state.busy = true;

    if (kind === 'skill') {
      const skill = skillById(unit.char.skillId);
      if (skill && unit.energy >= (skill.cost || 2)) {
        spendEnergy(unit, skill.cost || 2);
        applyHeroSkill(unit, skill);
      } else {
        log('พลังงานยังไม่พอ ใช้โจมตีปกติแทน');
        hitBoss(unit, 1, 'โจมตีปกติ');
      }
    } else {
      // Normal attack charges 1 energy
      unit.energy = Math.min(3, unit.energy + 1);
      hitBoss(unit, 1, 'โจมตีปกติ');
    }

    render();

    if (state.bossHp <= 0) {
      stopTimer();
      finish(true);
      return;
    }

    // Switch to Boss Turn after 750ms
    setTimeout(bossTurn, 750);
  }

  function hitBoss(unit, power, label) {
    const isCrit = Math.random() < 0.22;
    const critMod = isCrit ? 1.5 : 1.0;
    const dmg = Math.round(damageOf(unit.char.atk || 48, power, state.bossDef) * critMod);
    state.bossHp = Math.max(0, state.bossHp - dmg);
    spawnDamage(`-${dmg}${isCrit ? ' CRIT!' : ''}`, isCrit, 'boss');
    shakeTarget('boss');
    log(`${unit.char.name} ใช้${label} สร้าง ${dmg} ดาเมจ!${isCrit ? ' (คริติคอล!)' : ''}`, 'good');
  }

  function applyHeroSkill(unit, skill) {
    if (skill.kind === 'heal') {
      const heal = Math.round(unit.maxHp * Number(skill.power || 0.35));
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      spawnDamage(`+${heal} HP`, true, 'hero');
      log(`${unit.char.name} ปลดปล่อยสกิล ${skill.name} ฟื้นฟู ${heal} HP!`, 'good');
      return;
    }
    if (skill.kind === 'buff') {
      unit.shield = Math.round(unit.maxHp * Number(skill.power || 0.35));
      spawnDamage(`โล่ +${unit.shield}`, true, 'hero');
      log(`${unit.char.name} ปลดปล่อยสกิล ${skill.name} กางม่านบาเรีย ${unit.shield} แต้ม!`, 'good');
      return;
    }
    // High damage special move
    const isCrit = Math.random() < 0.35;
    const power = Number(skill.power || 2.2) * (isCrit ? 1.55 : 1.0);
    const dmg = damageOf(unit.char.atk || 48, power, state.bossDef);
    state.bossHp = Math.max(0, state.bossHp - dmg);
    spawnDamage(`💥 -${dmg} ท่าไม้ตาย!`, true, 'boss');
    shakeTarget('boss');
    log(`${unit.char.name} ปลดปล่อยท่าไม้ตาย ${skill.name} ถล่มสร้าง ${dmg} ดาเมจ!`, 'good');

    if (skill.kind === 'debuff') {
      state.bossAtkMod = Math.round(state.bossAtk * -0.22);
      log(`${state.boss.name} โดนลดพลังโจมตีลง 22%!`, 'good');
    }
  }

  function switchTo(index) {
    if (state.busy || state.turn !== 'player' || state.over) return;
    const next = state.team[index];
    if (!next || next.hp <= 0 || index === state.active) return;
    state.active = index;
    state.showRoster = false;
    log(`เปลี่ยนตัวละคร! ส่ง ${next.char.name} ลงสู่สนาม!`, 'good');
    state.busy = true;
    render();
    setTimeout(bossTurn, 750);
  }

  function bossTurn() {
    if (state.over) return;
    state.turn = 'boss';
    state.showRoster = false;
    render();

    setTimeout(() => {
      if (state.over) return;
      const unit = active();
      const useSpecial = (state.round % 3 === 0);
      const atk = state.bossAtk + state.bossAtkMod;
      const power = useSpecial ? Number(state.bossSkill?.power || 1.8) : 1;
      let dmg = damageOf(atk, power, unit.char.def || 24);

      if (unit.shield > 0) {
        const absorbed = Math.min(unit.shield, Math.round(dmg * 0.7));
        unit.shield -= absorbed;
        dmg -= absorbed;
        if (absorbed) log(`บาเรียดูดซับดาเมจ ${absorbed} แต้ม`, 'good');
      }

      unit.hp = Math.max(0, unit.hp - dmg);
      spawnDamage(`-${dmg}`, useSpecial, 'hero');
      shakeTarget('hero');

      log(useSpecial
        ? `🔥 ${state.boss.name} ปลดปล่อยท่าไม้ตาย ${state.bossSkill?.name || 'คลื่นทำลายล้าง'} ซัดเข้าเป้า ${dmg} ดาเมจ!`
        : `⚡ ${state.boss.name} โจมตีสวนกลับ ${dmg} ดาเมจ`, 'bad');

      if (unit.hp <= 0) {
        log(`💀 ${unit.char.name} หมดสภาพการต่อสู้!`, 'bad');
        const nextIndex = state.team.findIndex(u => u.hp > 0);
        if (nextIndex < 0) {
          stopTimer();
          finish(false);
          return;
        }
        state.active = nextIndex;
        log(`ส่ง ${state.team[nextIndex].char.name} ลงสนามสู้ต่อทันที!`, 'good');
      }

      state.round += 1;
      state.busy = false;
      state.turn = 'player';
      startTimer();
      render();
    }, 600);
  }

  function finish(win) {
    state.over = true;
    state.turn = 'end';
    state.busy = false;
    stopTimer();

    const progress = getProgress();
    const first = !progress.defeated.includes(boss.id);
    const baseTokens = Number(boss.reward || 120);
    const tokens = win ? (first ? baseTokens : Math.max(15, Math.round(baseTokens * 0.4))) : 0;
    const xp = win ? (first ? 180 : 70) : 25;

    if (win) {
      recordBossWin(boss, { tokens, xp });
      log(`🏆 ชนะการประลอง! ได้รับ +${tokens} โทเคน และ +${xp} XP`, 'good');
    } else {
      try {
        const p = getProgress();
        const next = { ...p, xp: p.xp + xp };
        localStorage.setItem('tc_game_progress', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('tc-game-changed', { detail: { key: 'progress' } }));
      } catch { /* ignore */ }
      log(`คุณพ่ายแพ้ ได้รับประสบการณ์ปลอบใจ +${xp} XP`, 'bad');
    }

    state.result = { win, tokens, xp, first };
    render();
    setTimeout(() => options.onFinish?.({ win, tokens, xp, boss }), 60);
  }

  // Initial mount
  state.busy = false;
  render();
  startTimer();

  dlg.addEventListener('close', () => {
    stopTimer();
    dlg.remove();
    if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
      objectModelUrls.forEach(url => URL.revokeObjectURL(url));
    }
    document.documentElement.classList.remove('btl-open');
  });

  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  document.documentElement.classList.add('btl-open');
  log(`⚔️ เผชิญหน้าบอส ${boss.name} ประจำ ${placeName}!`, 'bad');
  render();

  return { close: () => { stopTimer(); dlg.close(); }, boss };
}

/** Convenience helper: open battle for a place if it has an assigned boss */
export async function battleAtPlace(place, onFinish) {
  if (!place) return null;
  const { bossesForPlace } = await import('./game-data.js');
  const boss = bossesForPlace(place.id)[0];
  if (!boss) return null;
  return openBattle({ boss, place, onFinish });
}
