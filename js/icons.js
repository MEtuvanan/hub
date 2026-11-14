/**
 * icons.js — SVG icon utility
 * Usage: icon('camera', 20) → '<svg class="ic" ...><use href="...#i-camera"></svg>'
 * Import this anywhere HTML strings are built to replace emoji with crisp SVG icons.
 */

const SPRITE = '/assets/icons/sprite.svg';

/**
 * Returns an inline SVG <use> string for a named icon.
 * @param {string} name   - icon id without "i-" prefix (e.g. 'camera', 'pin')
 * @param {number} size   - width & height in px (default 18)
 * @param {string} cls    - extra CSS classes (default '')
 * @param {string} label  - aria-label if not decorative (default '' = aria-hidden)
 */
export function icon(name, size = 18, cls = '', label = '') {
  const ariaAttr = label
    ? `role="img" aria-label="${label}"`
    : `aria-hidden="true"`;
  const classes = ['ic', cls].filter(Boolean).join(' ');
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ${ariaAttr} focusable="false"><use href="${SPRITE}#i-${name}"></use></svg>`;
}

/**
 * Emoji → sprite icon name. Demo data still carries emoji as a legacy label,
 * so renderers translate them here instead of printing the glyph.
 */
export const EMOJI_ICON = {
  '🛕': 'building', '🏯': 'building', '🏛️': 'building', '🏛': 'building', '⛩️': 'building',
  '🏢': 'building', '🏙️': 'building', '🪟': 'building',
  '⛰️': 'leaf', '⛰': 'leaf', '🌳': 'leaf', '🌵': 'leaf', '🌿': 'leaf', '🌫️': 'leaf',
  '🌫': 'leaf', '🍀': 'leaf', '🏞️': 'leaf',
  '🏖️': 'sun', '🏝️': 'sun', '🌊': 'sun', '🌇': 'sun', '🌅': 'sun', '🌄': 'sun',
  '☀️': 'sun', '🏄': 'sun', '🍢': 'store',
  '🍜': 'store', '🍸': 'store', '🦐': 'store', '🦀': 'store', '🛍️': 'store',
  '🏪': 'store', '🧰': 'store', '🎒': 'store', '📦': 'store',
  '📸': 'camera', '📷': 'camera', '📱': 'camera',
  '🧠': 'ai', '🤖': 'ai', '💭': 'ai', '📡': 'ai',
  '⚔️': 'flame', '⚡': 'flame', '🐉': 'flame',
  '🔖': 'flag', '🏁': 'flag', '🗡️': 'flag',
  '⚠️': 'warning', '⚠': 'warning',
  '✨': 'star', '⭐': 'star', '🌟': 'star', '💎': 'star', '🎉': 'star', '🌙': 'star',
  '🔍': 'search', '🔎': 'search', '🔭': 'search',
  '📋': 'journal', '📔': 'journal', '📜': 'journal', '🗂️': 'journal', '✉️': 'journal',
  '✉': 'journal', '📧': 'journal',
  '📍': 'pin', '📌': 'pin', '🗺️': 'map', '🗺': 'map', '🌏': 'map',
  '💡': 'info', '💬': 'info', '❓': 'info',
  '😄': 'smile', '🤩': 'smile', '😌': 'smile', '🥱': 'smile',
  '❤️': 'heart', '❤': 'heart', '💚': 'heart', '🥰': 'heart', '🤝': 'heart', '🧘': 'heart',
  '💆': 'heart',
  '👑': 'trophy', '🏆': 'trophy', '🏅': 'trophy', '🥇': 'trophy', '🥈': 'trophy',
  '🥉': 'trophy',
  '🧙': 'user', '🧝': 'user', '🧑‍🚀': 'user', '🧍': 'user', '👤': 'user', '👥': 'user',
  '👕': 'user', '👖': 'user', '🥾': 'user', '🧢': 'user', '🎩': 'user', '👗': 'user',
  '👘': 'user', '🩳': 'user', '🥋': 'user', '👟': 'user', '🩴': 'user', '🧥': 'user',
  '🎭': 'user', '👹': 'user', '💇': 'user',
  '🪙': 'coin', '💰': 'coin', '💳': 'coin',
  '🎯': 'quest', '🔐': 'lock', '🔒': 'lock', '🔑': 'lock', '🔓': 'lock', '🛡️': 'lock',
  '🛡': 'lock',
  '📖': 'book', '🎓': 'book', '✍️': 'edit', '✍': 'edit', '✏️': 'edit', '📝': 'edit',
  '🖼️': 'image', '🖼': 'image', '🎨': 'image',
  '📅': 'calendar', '📆': 'calendar', '🗓️': 'calendar', '🗓': 'calendar',
  '🕐': 'clock', '🚇': 'bike', '🚲': 'bike', '🚴': 'bike',
  '🏠': 'navigate', '🚀': 'navigate', '⛵': 'navigate', '🚤': 'navigate', '🛶': 'navigate',
  '🚌': 'navigate', '🛺': 'navigate', '🎿': 'navigate', '🏃': 'navigate',
  '🎁': 'gift', '🎀': 'gift', '🧭': 'compass', '🐢': 'compass', '🤿': 'compass',
  '🧗': 'compass', '🎮': 'play', '♥': 'heart', '★': 'star', '✓': 'check', '✔️': 'check',
  '✅': 'check-circle', '❌': 'close', '✖️': 'close', '✕': 'close', '🚫': 'close',
  '🔄': 'refresh', '🔁': 'refresh', '➕': 'plus', '➔': 'arrow-right', '⬅': 'arrow-right',
  '📊': 'chart', '📈': 'chart', '📣': 'volume', '📤': 'upload', '📩': 'upload',
  '🗑️': 'trash', '🧹': 'trash', '⚙️': 'settings', '⚙': 'settings', '🇹🇭': 'map',
  '🟢': 'check-circle', '🟡': 'clock', '🔴': 'warning',
};

/** Render a legacy emoji label as a sprite icon (falls back to a star). */
export function iconFor(emoji, size = 16, cls = '') {
  const key = String(emoji ?? '').replace(/\uFE0F/g, '');
  const name = EMOJI_ICON[key] || EMOJI_ICON[String(emoji ?? '')] || 'star';
  return icon(name, size, cls);
}

/**
 * Convenience map — use these instead of emoji throughout the app.
 * ic.camera(20) === icon('camera', 20)
 */
export const ic = new Proxy({}, {
  get: (_, name) => (size = 18, cls = '', label = '') => icon(name, size, cls, label)
});
