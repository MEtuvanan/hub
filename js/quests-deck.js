// quests-deck.js — desktop swipe deck for quests (parity with the phone build).
// Uses the same swipe engine and the same saved-quest storage key as mobile.

import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import { createSwipeDeck } from './swipe-deck.js';
import { fetchQuests, LIKED_QUESTS_KEY } from './mobile-data.js';

const LIKED_KEY = LIKED_QUESTS_KEY || 'tc_mobile_liked_quests';
const $ = id => document.getElementById(id);

const DIFF = {
  easy: { label: 'ง่าย', tone: '#0A6B49', bg: '#E8F7EF' },
  medium: { label: 'ปานกลาง', tone: '#A97400', bg: '#FFF6D8' },
  hard: { label: 'ยาก', tone: '#C4483A', bg: '#FCEDEA' },
};

function liked() {
  try {
    const rows = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]');
    return new Set(Array.isArray(rows) ? rows : []);
  } catch {
    return new Set();
  }
}

function saveLiked(set) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

function cardHTML(q) {
  const diff = DIFF[q.difficulty] || DIFF.easy;
  return `
    <div class="qd-card">
      <div class="qd-card__media">
        <img src="${esc(q.image || '')}" alt="" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.hidden=false">
        <span class="qd-card__fallback" hidden>${icon('image', 34)}</span>
        <span class="qd-card__badge" style="--t:${diff.tone};--b:${diff.bg}">${esc(diff.label)}</span>
        <span class="qd-card__type">${icon('quest', 12)} ${esc(q.typeLabel || 'ภารกิจ')}</span>
      </div>
      <div class="qd-card__body">
        <h3 class="qd-card__title">${esc(q.title)}</h3>
        <p class="qd-card__place">${icon('pin', 13)} ${esc(q.placeName || q.province || 'สถานที่ท่องเที่ยว')}</p>
        <p class="qd-card__desc">${esc(q.summary || '')}</p>
        <div class="qd-card__stats">
          <span class="qd-card__reward">${icon('coin', 17)} +${Number(q.reward || 0)} <small>โทเคน</small></span>
          <span class="qd-card__radius">${icon('gps', 12)} ${Number(q.radius || 100)} ม.</span>
        </div>
      </div>
    </div>`;
}

function progressText(done, total) {
  const el = $('qdDeckProgress');
  if (el) el.textContent = `${done} / ${total}`;
}

async function openDeck() {
  const dialog = $('questDeckDialog');
  const mount = $('questDeckMount');
  if (!dialog || !mount) return;

  let quests = [];
  try {
    quests = await fetchQuests();
  } catch (e) {
    console.warn('quest deck: no data', e);
  }
  if (!quests.length) {
    mount.innerHTML = `<div class="qd-empty">${icon('quest', 30)}<strong>ยังไม่มีเควสท์ให้ปัด</strong><span>ลองโหลดหน้าใหม่</span></div>`;
  } else {
    const saved = liked();
    const ordered = [
      ...quests.filter(q => !saved.has(q.id)),
      ...quests.filter(q => saved.has(q.id)),
    ];
    createSwipeDeck({
      mount,
      items: ordered,
      renderCard: cardHTML,
      likeLabel: 'บันทึก',
      passLabel: 'ข้าม',
      onLike: q => {
        const set = liked();
        set.add(q.id);
        saveLiked(set);
        toast(`บันทึก ${q.title} แล้ว`);
      },
      onPass: () => {},
      onInfo: q => {
        const placeId = q.placeId || q.place?.id;
        if (placeId) location.href = `/place.html?id=${encodeURIComponent(placeId)}`;
        else toast(q.title);
      },
      onProgress: ({ done, total }) => progressText(done, total),
      emptyHTML: `<div class="qd-empty">${icon('check', 30)}<strong>ปัดครบทุกเควสท์แล้ว</strong><span>กลับมาดูรายการที่บันทึกไว้ได้ในหน้าเควสท์</span></div>`,
    });
  }

  try { dialog.showModal(); } catch { dialog.setAttribute('open', ''); }
}

export function initQuestDeck() {
  if (!$('btn-quest-deck')) return;
  $('btn-quest-deck').addEventListener('click', openDeck);
  $('qdDeckClose')?.addEventListener('click', () => $('questDeckDialog')?.close());
  $('questDeckDialog')?.addEventListener('click', e => {
    if (e.target === $('questDeckDialog')) $('questDeckDialog').close();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initQuestDeck);
else initQuestDeck();
