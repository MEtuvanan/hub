// swipe-deck.js — reusable Tinder-style card deck with drag, like / pass / info
// and undo. Used by the quests page and the search (places) page.

export function createSwipeDeck({
  mount,
  items = [],
  renderCard,
  onLike,
  onPass,
  onInfo,
  onUndo,
  onProgress,
  emptyHTML = '',
  likeLabel = 'สนใจ',
  passLabel = 'ข้าม',
} = {}) {
  if (!mount) throw new Error('createSwipeDeck: mount required');
  let queue = items.slice();
  const history = [];
  let busy = false;

  mount.innerHTML = `
    <div class="swipe-stage" data-stage></div>
    <div class="swipe-actions">
      <button class="swipe-action swipe-action--undo" type="button" data-deck="undo" aria-label="ย้อนกลับ" title="ย้อนกลับ">↺</button>
      <button class="swipe-action swipe-action--nope" type="button" data-deck="pass" aria-label="${passLabel}">
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
      <button class="swipe-action swipe-action--info" type="button" data-deck="info" aria-label="รายละเอียด">
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 8h.01" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
      </button>
      <button class="swipe-action swipe-action--like" type="button" data-deck="like" aria-label="${likeLabel}">
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.7 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
      </button>
      <span style="width:48px"></span>
    </div>
    <div class="swipe-progress"><span data-count>0 / 0</span><span class="bar"><i data-bar style="width:0%"></i></span><span>ปัดซ้าย/ขวา</span></div>`;

  const stage = mount.querySelector('[data-stage]');
  const countEl = mount.querySelector('[data-count]');
  const barEl = mount.querySelector('[data-bar]');
  const undoBtn = mount.querySelector('[data-deck="undo"]');

  const total = () => queue.length + history.length;
  const updateProgress = () => {
    const done = history.length;
    const all = Math.max(1, total());
    if (countEl) countEl.textContent = `${done} / ${total()}`;
    if (barEl) barEl.style.width = `${Math.min(100, (done / all) * 100)}%`;
    if (undoBtn) undoBtn.disabled = history.length === 0;
    onProgress?.({ done, remaining: queue.length, total: total() });
  };

  const cardHTML = (item, position) => {
    const inner = typeof renderCard === 'function' ? renderCard(item) : '';
    return `<article class="swipe-card${position ? ` is-behind-${position}` : ''}" data-swipe-card data-id="${escapeAttr(item.id)}">
      ${inner}
      <span class="swipe-stamp swipe-stamp--like">${likeLabel.toUpperCase()}</span>
      <span class="swipe-stamp swipe-stamp--nope">${passLabel.toUpperCase()}</span>
    </article>`;
  };

  function escapeAttr(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    if (!queue.length) {
      const html = typeof emptyHTML === 'function' ? emptyHTML() : emptyHTML;
      stage.innerHTML = html || `<div class="swipe-empty"><div class="emoji">✨</div><h3>ครบทุกใบแล้ว</h3><p>กลับมาดูอีกครั้งภายหลัง หรือกดย้อนกลับเพื่อทบทวนการ์ดก่อนหน้า</p></div>`;
      updateProgress();
      return;
    }
    stage.innerHTML = queue.slice(0, 3).map((item, i) => cardHTML(item, i)).join('');
    updateProgress();
    attachDrag(stage.querySelector('[data-swipe-card]'));
  }

  function attachDrag(card) {
    if (!card) return;
    let startX = 0, startY = 0, dx = 0, dy = 0, active = false, moved = false, startT = 0;

    const onDown = e => {
      if (busy) return;
      if (e.target.closest('button, a')) return;
      active = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      startT = performance.now();
      card.classList.add('is-dragging');
      card.setPointerCapture?.(e.pointerId);
    };
    const onMove = e => {
      if (!active) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      const rot = Math.max(-16, Math.min(16, dx / 16));
      card.style.transform = `translate(${dx}px, ${dy * 0.35}px) rotate(${rot}deg)`;
      card.classList.toggle('show-like', dx > 34);
      card.classList.toggle('show-nope', dx < -34);
    };
    const onUp = e => {
      if (!active) return;
      active = false;
      card.classList.remove('is-dragging');
      const dt = Math.max(1, performance.now() - startT);
      const velocity = Math.abs(dx) / dt;
      card.style.transform = '';
      card.classList.remove('show-like', 'show-nope');
      if (Math.abs(dx) > 92 || (Math.abs(dx) > 46 && velocity > 0.55)) {
        if (dx > 0) swipe('like', card); else swipe('pass', card);
      } else if (dy < -110 && Math.abs(dx) < 70) {
        swipe('info', card);
      }
      dx = 0;
      dy = 0;
    };

    card.addEventListener('pointerdown', onDown);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onUp);
    card.addEventListener('pointercancel', onUp);
    card.addEventListener('click', e => {
      if (moved) { e.preventDefault(); return; }
      if (e.target.closest('[data-card-action]')) return;
      if (typeof onInfo === 'function') onInfo(queue[0]);
    });
  }

  function swipe(action, card = stage.querySelector('[data-swipe-card]')) {
    if (busy || !queue.length) return;
    if (action === 'info') {
      onInfo?.(queue[0]);
      return;
    }
    busy = true;
    const item = queue[0];
    if (card) {
      card.classList.add(action === 'like' ? 'is-fly-right' : 'is-fly-left');
    }
    setTimeout(() => {
      history.push({ item, action });
      queue.shift();
      busy = false;
      if (action === 'like') onLike?.(item);
      else onPass?.(item);
      render();
    }, 230);
  }

  function undo() {
    if (busy || !history.length) return;
    const last = history.pop();
    queue.unshift(last.item);
    onUndo?.(last.item, last.action);
    render();
  }

  mount.addEventListener('click', e => {
    const btn = e.target.closest('[data-deck]');
    if (!btn) return;
    const action = btn.dataset.deck;
    if (action === 'like') swipe('like');
    else if (action === 'pass') swipe('pass');
    else if (action === 'info') onInfo?.(queue[0]);
    else if (action === 'undo') undo();
  });

  const keyHandler = e => {
    if (!mount.isConnected) { document.removeEventListener('keydown', keyHandler); return; }
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); swipe('like'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); swipe('pass'); }
    if (e.key === 'ArrowUp') { e.preventDefault(); onInfo?.(queue[0]); }
  };
  document.addEventListener('keydown', keyHandler);

  render();

  return {
    setItems(next) {
      queue = Array.isArray(next) ? next.slice() : [];
      history.length = 0;
      busy = false;
      render();
    },
    like: () => swipe('like'),
    pass: () => swipe('pass'),
    undo,
    get current() { return queue[0] || null; },
    get remaining() { return queue.length; },
  };
}
