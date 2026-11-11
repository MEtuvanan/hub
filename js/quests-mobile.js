// quests-mobile.js — swipeable quest deck with saved and completed lists.

import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import { createSwipeDeck } from './swipe-deck.js';
import {
  fetchQuests, readJSON, writeJSON,
  LIKED_QUESTS_KEY, PASSED_QUESTS_KEY,
  completedQuests,
} from './mobile-data.js';
import { openQuestSheet } from './mobile-app.js';

const $ = id => document.getElementById(id);

let quests = [];
let filter = 'all';
let deck = null;
let tab = 'deck';

const likedIds = () => new Set(readJSON(LIKED_QUESTS_KEY, []));
const passedIds = () => new Set(readJSON(PASSED_QUESTS_KEY, []));

function toggleSet(key, id, on) {
  const set = new Set(readJSON(key, []));
  if (on) set.add(id); else set.delete(id);
  writeJSON(key, [...set]);
  return set;
}

function difficultyChip(q) {
  if (completedQuests().has(q.id)) return `<span class="qm-card__done">${icon('check', 10)} สำเร็จแล้ว</span>`;
  const label = q.difficulty === 'hard' ? 'ท้าทาย' : q.difficulty === 'medium' ? 'ปานกลาง' : 'ง่าย';
  const cls = q.difficulty === 'hard' ? 'g-chip--danger' : q.difficulty === 'medium' ? 'g-chip--gold' : 'g-chip--mint';
  return `<span class="g-chip ${cls}">${label}</span>`;
}

function renderCard(q) {
  return `
    <div class="qm-card">
      <div class="swipe-card__media g-media">
        <img src="${esc(q.image || '')}" alt="${esc(q.title)}" loading="lazy"
          onerror="this.style.display='none';this.parentElement.classList.add('is-fallback')">
        <span class="media-emoji">${esc(q.emoji || '🎯')}</span>
        <div class="swipe-card__top">
          <div class="app-wrap">
            <span class="g-chip g-chip--gold">${esc(q.typeLabel || 'ภารกิจ')}</span>
            ${difficultyChip(q)}
          </div>
          <span class="qm-card__code">${icon('quest', 10)} QUEST</span>
        </div>
      </div>
      <div class="swipe-card__body">
        <h3 class="swipe-card__title">${esc(q.title)}</h3>
        <p class="swipe-card__place">${icon('pin', 13)} <span>${esc(q.placeName || q.province || 'สถานที่ท่องเที่ยว')}</span></p>
        <p class="swipe-card__desc qm-card__summary">${esc(q.summary || '')}</p>
        <div class="swipe-card__meta">
          ${q.province ? `<span class="g-chip">${icon('map', 11)} ${esc(q.province)}</span>` : ''}
          <span class="g-chip">${icon('clock', 11)} ${Number(q.minutes || 20)} นาที</span>
        </div>
        <div class="swipe-card__stats">
          <span class="swipe-card__reward">${icon('coin', 17)} +${Number(q.reward || 0)} <small>โทเคน</small></span>
          <span class="qm-card__cta">แตะดูรายละเอียด ${icon('arrow-right', 13)}</span>
        </div>
      </div>
    </div>`;
}

function questById(id) {
  return quests.find(q => q.id === id) || null;
}

function filtered() {
  if (filter === 'all') return quests.slice();
  return quests.filter(q => q.type === filter);
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateTabs() {
  const done = completedQuests();
  const liked = likedIds();
  document.querySelectorAll('[data-qtab]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.qtab === tab);
    btn.setAttribute('aria-selected', String(btn.dataset.qtab === tab));
    const badge = btn.querySelector('b');
    const key = btn.dataset.qtab;
    if (badge) badge.textContent = key === 'liked' ? String(liked.size) : key === 'done' ? String(done.size) : '';
  });
  $('deckPanel').hidden = tab !== 'deck';
  $('likedPanel').hidden = tab !== 'liked';
  $('donePanel').hidden = tab !== 'done';
}

function renderLiked() {
  const box = $('likedList');
  if (!box) return;
  const liked = [...likedIds()];
  const items = liked.map(questById).filter(Boolean);
  if (!items.length) {
    box.innerHTML = `
      <div class="qm-empty">
        <div class="emoji">💚</div>
        <h3>ยังไม่มีเควสท์ที่ถูกใจ</h3>
        <p>กลับไปที่การ์ดแล้วปัดขวาเพื่อเก็บเควสท์ที่อยากทำไว้ที่นี่</p>
        <button class="g-btn g-btn--sm g-btn--mint" type="button" data-go-deck>ไปปัดการ์ด</button>
      </div>`;
  } else {
    box.innerHTML = items.map(q => `
      <article class="qm-saved">
        <span class="qm-saved__media">
          <img src="${esc(q.image || '')}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false">
          <span class="fallback" hidden>${esc(q.emoji || '🎯')}</span>
        </span>
        <div class="qm-saved__body">
          <h3>${esc(q.title)}</h3>
          <span class="qm-saved__meta">${esc(q.placeName || '')} · ${Number(q.reward || 0)} โทเคน</span>
          <div class="qm-saved__actions">
            <button class="g-btn g-btn--sm g-btn--mint" type="button" data-open="${esc(q.id)}">ดูเควสท์</button>
            <a class="g-btn g-btn--sm g-btn--ghost" href="/place-mobile.html?id=${encodeURIComponent(q.placeId || '')}">สถานที่</a>
          </div>
        </div>
        <button class="qm-saved__remove" type="button" data-unlike="${esc(q.id)}" aria-label="เอาออก">${icon('close', 14)}</button>
      </article>`).join('');
  }
  box.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = questById(btn.dataset.open);
      if (q) openQuestSheet(q, { onComplete: refreshAll });
    });
  });
  box.querySelectorAll('[data-unlike]').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleSet(LIKED_QUESTS_KEY, btn.dataset.unlike, false);
      toast('นำออกจากรายการถูกใจแล้ว');
      syncDeck();
      renderLiked();
      updateTabs();
    });
  });
  box.querySelector('[data-go-deck]')?.addEventListener('click', () => switchTab('deck'));
}

function renderDone() {
  const box = $('doneList');
  if (!box) return;
  const done = completedQuests();
  const items = quests.filter(q => done.has(q.id));
  if (!items.length) {
    box.innerHTML = `
      <div class="qm-empty">
        <div class="emoji">🏅</div>
        <h3>ยังไม่มีเควสท์ที่สำเร็จ</h3>
        <p>เลือกเควสท์จากการ์ด ทำภารกิจ และกรอกรหัสเช็คอินเพื่อรับโทเคน</p>
        <button class="g-btn g-btn--sm g-btn--mint" type="button" data-go-deck>เริ่มทำเควสท์</button>
      </div>`;
  } else {
    box.innerHTML = `
      <div class="g-card g-card--mint" style="margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <span class="qm-done__badge">${done.size}</span>
        <div style="flex:1">
          <strong style="font:600 13px/1.3 var(--app-font-head);color:#fff;display:block">เควสท์ที่พิชิตแล้ว</strong>
          <span class="app-tiny">สะสมโทเคนจากภารกิจจริงต่อได้เรื่อย ๆ</span>
        </div>
      </div>
      ${items.map(q => `
        <article class="qm-done">
          <span class="qm-done__badge">✓</span>
          <div class="qm-done__body">
            <strong>${esc(q.title)}</strong>
            <span>${esc(q.placeName || '')}</span>
          </div>
          <span class="qm-done__reward">+${Number(q.reward || 0)}</span>
        </article>`).join('')}`;
  }
  box.querySelector('[data-go-deck]')?.addEventListener('click', () => switchTab('deck'));
}

function renderFilters() {
  const box = $('questFilters');
  if (!box) return;
  const types = [...new Map(quests.map(q => [q.type, q.typeLabel || q.type])).entries()];
  box.innerHTML = `
    <button class="qm-filter ${filter === 'all' ? 'is-active' : ''}" type="button" data-qfilter="all"><span class="emoji">✨</span>ทั้งหมด</button>
    ${types.map(([id, label]) => `
      <button class="qm-filter ${filter === id ? 'is-active' : ''}" type="button" data-qfilter="${esc(id)}"><span class="emoji">${esc(questEmoji(id))}</span>${esc(label)}</button>
    `).join('')}`;
  box.querySelectorAll('[data-qfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.qfilter;
      renderFilters();
      deck?.setItems(shuffle(filtered()));
    });
  });
}

function questEmoji(type) {
  return ({ photo: '📸', quiz: '🧠', culture: '🏛️', exploration: '🧭', nature: '⛰️' })[type] || '🎯';
}

function syncDeck() {
  if (!deck) return;
  deck.setItems(shuffle(filtered()));
}

function switchTab(next) {
  tab = next;
  updateTabs();
  if (tab === 'liked') renderLiked();
  if (tab === 'done') renderDone();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function refreshAll() {
  updateTabs();
  renderLiked();
  renderDone();
}

function bootDeck() {
  const mount = $('questDeck');
  if (!mount) return;
  deck = createSwipeDeck({
    mount,
    items: shuffle(filtered()),
    renderCard,
    likeLabel: 'เก็บไว้',
    passLabel: 'ข้าม',
    emptyHTML: () => `
      <div class="qm-deck-empty">
        <div class="emoji">🗺️</div>
        <h3>การ์ดครบแล้ว</h3>
        <p>คุณปัดครบทุกเควสท์ในหมวดนี้แล้ว ลองเปลี่ยนหมวดหรือเริ่มสับการ์ดใหม่</p>
        <button class="g-btn g-btn--mint g-btn--sm" type="button" data-reset-deck">สับการ์ดใหม่</button>
        <button class="g-btn g-btn--ghost g-btn--sm" type="button" data-go-liked>ดูเควสท์ที่ถูกใจ</button>
      </div>`,
    onLike: q => {
      toggleSet(LIKED_QUESTS_KEY, q.id, true);
      toggleSet(PASSED_QUESTS_KEY, q.id, false);
      toast(`เก็บ “${q.title}” ไว้แล้ว`);
      renderLiked();
      updateTabs();
    },
    onPass: q => {
      toggleSet(PASSED_QUESTS_KEY, q.id, true);
      toggleSet(LIKED_QUESTS_KEY, q.id, false);
      renderLiked();
      updateTabs();
    },
    onUndo: (q, action) => {
      if (action === 'like') toggleSet(LIKED_QUESTS_KEY, q.id, false);
      if (action === 'pass') toggleSet(PASSED_QUESTS_KEY, q.id, false);
      renderLiked();
      updateTabs();
    },
    onInfo: q => openQuestSheet(q, { onComplete: () => { refreshAll(); } }),
    onProgress: () => updateTabs(),
  });

  mount.addEventListener('click', e => {
    if (e.target.closest('[data-reset-deck]')) {
      filter = 'all';
      renderFilters();
      deck.setItems(shuffle(quests));
    }
    if (e.target.closest('[data-go-liked]')) switchTab('liked');
  });
}

async function boot() {
  updateTabs();
  $('likedList').innerHTML = `<div class="g-loading">กำลังโหลดเควสท์…</div>`;
  $('doneList').innerHTML = `<div class="g-loading">กำลังโหลดเควสท์…</div>`;
  quests = await fetchQuests();
  renderFilters();
  bootDeck();
  refreshAll();

  document.querySelectorAll('[data-qtab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.qtab));
  });
  $('questReset')?.addEventListener('click', () => {
    filter = 'all';
    renderFilters();
    deck?.setItems(shuffle(quests));
    switchTab('deck');
    toast('สับการ์ดเควสท์ใหม่แล้ว');
  });

  window.addEventListener('tc-tokens', refreshAll);
  window.addEventListener('tc-quest-done', () => {
    refreshAll();
    syncDeck();
  });
}

document.addEventListener('DOMContentLoaded', boot);
