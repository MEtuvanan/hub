/**
 * ai-mobile-chat.js — AI chat popup for the mobile shell (*-mobile.html pages).
 *
 * Features:
 *  - Round floating "AI" button above the tab bar on every mobile page
 *  - Bottom-sheet popup with a scrollable message list (overscroll contained)
 *  - Swipe the grab handle / header down to dismiss
 *  - Suggestion pills from the live place catalog (first entry only)
 *  - Full AI chatbot + trip-planning capability, shared with the desktop dock
 *  - Itinerary cards link to mobile pages (navigate-mobile / place-mobile)
 */

import {
  parseMarkdown, callTravelAI, extractItineraryBlock,
} from './ai-planner-modal.js';
import { loadAiCatalog } from './ai-catalog.js';
import { esc } from './ui.js';

let instance = null;

class MobileAIChat {
  constructor() {
    this.isOpen = false;
    this.hasInteracted = false;
    this.messages = [];
    this.catalog = [];
    this.initCatalog();
    this.initDOM();
  }

  async initCatalog() {
    try {
      this.catalog = await loadAiCatalog();
    } catch (_) {
      this.catalog = [];
    }
    this.applyCatalogPills();
  }

  applyCatalogPills() {
    const wrap = document.getElementById('aiMchatPills');
    if (!wrap || !this.catalog.length) return;
    const [a, b, c] = this.catalog;
    const pills = [];
    if (a) pills.push([`แนะนำ ${a.name}`, `${a.name} มีจุดเด่นอะไร เปิดกี่โมง และเดินทางยังไง จากข้อมูลในเว็บ`]);
    if (b) pills.push(['ทริป 1 วัน', `จัดทริปเที่ยว 1 วันจากสถานที่ที่มีในเว็บนี้ โดยเริ่มที่ ${b.name}`]);
    if (this.catalog.some(p => p.quests?.length)) {
      pills.push(['เควสท์ในเว็บ', 'มีเควสท์อะไรในเว็บนี้บ้าง แนะนำจากสถานที่ที่มีเควสท์ในระบบเท่านั้น']);
    } else if (c && a) {
      pills.push(['เปรียบเทียบ', `เปรียบเทียบ ${a.name} กับ ${c.name} จากข้อมูลในเว็บนี้เท่านั้น`]);
    }
    wrap.innerHTML = pills.map(([label, q]) =>
      `<button class="ai-mchat-pill" type="button" data-q="${esc(q)}">${esc(label)}</button>`
    ).join('');
    wrap.querySelectorAll('.ai-mchat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('aiMchatInput');
        if (btn.dataset.q && input) {
          input.value = btn.dataset.q;
          this.handleSend();
        }
      });
    });
  }

  initDOM() {
    // 1. Floating round button above the tab bar
    const fab = document.createElement('button');
    fab.className = 'ai-mfab';
    fab.id = 'aiMfab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'เปิด AI ผู้ช่วยท่องเที่ยว');
    fab.innerHTML = `<span class="ai-mfab__badge">AI</span>`;
    document.body.appendChild(fab);

    // 2. Backdrop + bottom-sheet popup
    const backdrop = document.createElement('div');
    backdrop.className = 'ai-mchat-backdrop';
    backdrop.id = 'aiMchatBackdrop';
    backdrop.hidden = true;

    const sheet = document.createElement('section');
    sheet.className = 'ai-mchat';
    sheet.id = 'aiMchat';
    sheet.setAttribute('aria-label', 'AI ผู้ช่วยท่องเที่ยว');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = `
      <div class="ai-mchat__handle" id="aiMchatHandle" role="presentation"><i></i></div>
      <header class="ai-mchat__head">
        <div class="ai-mchat__title">
          <span class="ai-mchat__spark"></span>
          <div class="ai-mchat__title-copy">
            <strong>AI ผู้ช่วยท่องเที่ยว</strong>
            <span>ถามได้ทุกอย่าง · วางแผนทริปได้</span>
          </div>
        </div>
        <div class="ai-mchat__actions">
          <button class="ai-mchat__reset" id="aiMchatReset" type="button" hidden>แชทใหม่</button>
          <button class="ai-mchat__close" id="aiMchatClose" type="button" aria-label="ปิดหน้าต่างแชท">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </header>

      <!-- Scrollable message list -->
      <div class="ai-mchat__messages" id="aiMchatMsgs">
        <div class="ai-mchat__row ai">
          <div class="ai-mchat__avatar">AI</div>
          <div class="ai-mchat__bubble">สวัสดีครับ นักเดินทาง 👋<br>ถามเรื่องสถานที่ เวลาเปิด การเดินทาง หรือขอให้จัดทริปเที่ยวได้เลย</div>
        </div>
      </div>

      <!-- Suggestion pills (first entry only, scrollable) -->
      <div class="ai-mchat__pills" id="aiMchatPills">
        <button class="ai-mchat-pill" type="button" data-q="มีสถานที่อะไรในเว็บบ้าง แนะนำจากรายการในระบบ">สถานที่ในเว็บ</button>
        <button class="ai-mchat-pill" type="button" data-q="จัดทริป 1 วันจากสถานที่ที่มีในเว็บนี้">จัดทริป 1 วัน</button>
        <button class="ai-mchat-pill" type="button" data-q="มีเควสท์อะไรในเว็บนี้บ้าง">เควสท์ในเว็บ</button>
      </div>

      <form class="ai-mchat__form" id="aiMchatForm">
        <textarea id="aiMchatInput" rows="1" placeholder="ถาม หรือขอจัดทริป..." autocomplete="off"></textarea>
        <button class="ai-mchat__send" id="aiMchatSend" type="submit" aria-label="ส่งข้อความ">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    `;
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    // --- events ---
    fab.addEventListener('click', () => this.open());
    document.getElementById('aiMchatClose').addEventListener('click', () => this.close());
    backdrop.addEventListener('click', () => this.close());
    document.getElementById('aiMchatReset').addEventListener('click', () => this.resetChat());

    const input = document.getElementById('aiMchatInput');
    const form = document.getElementById('aiMchatForm');

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      this.handleSend();
    });

    document.querySelectorAll('.ai-mchat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('aiMchatInput');
        if (btn.dataset.q && input) {
          input.value = btn.dataset.q;
          this.handleSend();
        }
      });
    });

    this.bindSwipeToClose();
  }

  /** Drag the sheet (handle/header) down to dismiss — mobile-friendly. */
  bindSwipeToClose() {
    const sheet = document.getElementById('aiMchat');
    const zone = document.getElementById('aiMchatHandle');
    const head = sheet.querySelector('.ai-mchat__head');
    let startY = 0, dy = 0, dragging = false;

    const begin = e => {
      if (this.isOpen && e.target.closest('button')) return;
      dragging = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      dy = 0;
      sheet.style.transition = 'none';
    };
    const move = e => {
      if (!dragging) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      dy = Math.max(0, y - startY);
      sheet.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      if (dy > 90) this.close();
      else sheet.style.transform = '';
    };

    [zone, head].forEach(el => {
      el.addEventListener('touchstart', begin, { passive: true });
      el.addEventListener('touchmove', move, { passive: false });
      el.addEventListener('touchend', end);
      el.addEventListener('pointerdown', begin);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  }

  open() {
    this.isOpen = true;
    document.getElementById('aiMfab').classList.add('is-hidden');
    document.getElementById('aiMchatBackdrop').hidden = false;
    const sheet = document.getElementById('aiMchat');
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ai-mchat-lock');
    setTimeout(() => {
      const box = document.getElementById('aiMchatMsgs');
      if (box) box.scrollTop = box.scrollHeight;
    }, 120);
  }

  close() {
    this.isOpen = false;
    const sheet = document.getElementById('aiMchat');
    sheet.classList.remove('is-open');
    sheet.style.transform = '';
    sheet.setAttribute('aria-hidden', 'true');
    document.getElementById('aiMchatBackdrop').hidden = true;
    document.getElementById('aiMfab').classList.remove('is-hidden');
    document.body.classList.remove('ai-mchat-lock');
  }

  resetChat() {
    this.messages = [];
    const box = document.getElementById('aiMchatMsgs');
    if (box) box.innerHTML = `
      <div class="ai-mchat__row ai">
        <div class="ai-mchat__avatar">AI</div>
        <div class="ai-mchat__bubble">เริ่มแชทใหม่แล้ว ถามอะไรได้เลยครับ 🙂</div>
      </div>`;
    document.getElementById('aiMchatReset').hidden = true;
    if (!this.hasInteracted) {
      this.hasInteracted = true;
      document.getElementById('aiMchatPills')?.remove();
    }
  }

  removeSuggestions() {
    if (!this.hasInteracted) {
      this.hasInteracted = true;
      document.getElementById('aiMchatPills')?.remove();
    }
  }

  async handleSend() {
    const input = document.getElementById('aiMchatInput');
    const query = input.value.trim();
    if (!query || !this.isOpen) return;

    this.removeSuggestions();
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('aiMchatReset').hidden = false;

    this.appendUserMsg(query);
    this.showTyping();

    const sendBtn = document.getElementById('aiMchatSend');
    sendBtn.disabled = true;

    try {
      const rawReply = await callTravelAI(query, this.messages);
      this.removeTyping();

      const { cleanText, itinerary } = extractItineraryBlock(rawReply, this.catalog);
      this.messages.push({ role: 'user', content: query });
      this.messages.push({ role: 'assistant', content: cleanText });

      this.appendAIMsg(cleanText, itinerary);
    } catch (err) {
      console.error(err);
      this.removeTyping();
      this.appendAIMsg(`ขออภัยครับ เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถรับคำตอบได้'}`);
    } finally {
      sendBtn.disabled = false;
      input.focus({ preventScroll: true });
    }
  }

  appendUserMsg(text) {
    const box = document.getElementById('aiMchatMsgs');
    const row = document.createElement('div');
    row.className = 'ai-mchat__row user';
    row.innerHTML = `
      <div class="ai-mchat__bubble">${esc(text).replace(/\n/g, '<br>')}</div>
      <div class="ai-mchat__avatar user">คุณ</div>
    `;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  showTyping() {
    const box = document.getElementById('aiMchatMsgs');
    const row = document.createElement('div');
    row.className = 'ai-mchat__row ai';
    row.id = 'aiMchatTyping';
    row.innerHTML = `
      <div class="ai-mchat__avatar">AI</div>
      <div class="ai-mchat__bubble">
        <div class="ai-mchat__typing"><i></i><i></i><i></i></div>
      </div>`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  removeTyping() {
    document.getElementById('aiMchatTyping')?.remove();
  }

  appendAIMsg(cleanText, itinerary = null) {
    const box = document.getElementById('aiMchatMsgs');
    const row = document.createElement('div');
    row.className = 'ai-mchat__row ai';

    let itinHtml = '';
    if (itinerary && Array.isArray(itinerary.stops)) {
      itinHtml = `
        <div class="ai-mchat__itin">
          <div class="ai-mchat__itin-title">${esc(itinerary.trip_title || 'แผนท่องเที่ยวแนะนำ')}</div>
          ${itinerary.summary ? `<p class="ai-mchat__itin-sum">${esc(itinerary.summary)}</p>` : ''}
          <div class="ai-mchat__stops">
            ${itinerary.stops.map((s, idx) => `
              <div class="ai-mchat__stop">
                <span class="ai-mchat__stop-num">${idx + 1}</span>
                <div class="ai-mchat__stop-info">
                  <div class="ai-mchat__stop-name">${esc(s.name)}${s.arrival_time ? ` <small>(${esc(s.arrival_time)})</small>` : ''}</div>
                  ${s.why ? `<div class="ai-mchat__stop-why">${esc(s.why)}</div>` : ''}
                  <div class="ai-mchat__stop-actions">
                    ${s.lat && s.lng ? `
                      <a href="/navigate-mobile.html?name=${encodeURIComponent(s.name)}&lat=${s.lat}&lng=${s.lng}">นำทาง GPS</a>
                      ${this.findPlaceId(s.name) ? `<a href="/place-mobile.html?id=${encodeURIComponent(this.findPlaceId(s.name))}">ดูสถานที่</a>` : ''}
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="ai-mchat__avatar">AI</div>
      <div class="ai-mchat__bubble">${parseMarkdown(cleanText)}${itinHtml}</div>
    `;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  findPlaceId(name = '') {
    const hit = this.catalog.find(p => p.name && p.name === name);
    return hit?.id || '';
  }
}

export function initMobileAIChat() {
  if (!instance) {
    instance = new MobileAIChat();
  }
  return instance;
}

// Quiet helper for shell logging (kept minimal like other shell modules).
export function mobileAIChatAvailable() {
  return !!instance;
}
