// ar-map.js — stylized AR adventure map: canvas world, glowing landmarks,
// a CSS-3D chibi avatar that walks with a joystick / tap, and game HUD hooks.

import { loadOutfit, categoryMeta } from './mobile-data.js';

const WORLD_W = 2200;
const WORLD_H = 1700;

const REGION_POS = {
  'กรุงเทพมหานคร': [1390, 790],
  'เชียงใหม่': [860, 320],
  'พระนครศรีอยุธยา': [1090, 600],
  'ภูเก็ต': [760, 1300],
  'กระบี่': [930, 1430],
  'กาญจนบุรี': [720, 780],
  'ชลบุรี': [1290, 830],
  'สุโขทัย': [940, 500],
};

const rng = (seed => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
})(42);

function placeWorld(place, indexInRegion = 0) {
  const base = REGION_POS[place.province] || [1180, 780];
  const angle = indexInRegion * 2.1 + 0.7;
  const radius = indexInRegion ? 40 + indexInRegion * 8 : 0;
  return {
    x: Math.max(360, Math.min(WORLD_W - 360, base[0] + Math.cos(angle) * radius)),
    y: Math.max(220, Math.min(WORLD_H - 220, base[1] + Math.sin(angle) * radius)),
  };
}

function worldDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function meters(d) {
  return Math.round(d * 18);
}

function buildWorldCanvas() {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = WORLD_H;
  const g = c.getContext('2d');

  // Deep ocean + subtle gradient
  const sea = g.createLinearGradient(0, 0, WORLD_W, WORLD_H);
  sea.addColorStop(0, '#0a3442');
  sea.addColorStop(0.45, '#082a37');
  sea.addColorStop(1, '#051c27');
  g.fillStyle = sea;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // water texture
  g.strokeStyle = 'rgba(120, 226, 255, .07)';
  g.lineWidth = 2;
  for (let i = 0; i < 50; i++) {
    const y = rng() * WORLD_H;
    const x = rng() * WORLD_W;
    g.beginPath();
    g.arc(x, y, 18 + rng() * 40, 0.2, 2.6);
    g.stroke();
  }

  const land = new Path2D();
  land.moveTo(800, 180);
  land.bezierCurveTo(1000, 130, 1300, 190, 1470, 300);
  land.bezierCurveTo(1620, 390, 1720, 500, 1690, 640);
  land.bezierCurveTo(1660, 750, 1560, 820, 1510, 900);
  land.bezierCurveTo(1460, 980, 1500, 1060, 1420, 1120);
  land.bezierCurveTo(1330, 1190, 1240, 1210, 1180, 1300);
  land.bezierCurveTo(1120, 1390, 1080, 1520, 980, 1580);
  land.bezierCurveTo(880, 1640, 780, 1570, 760, 1460);
  land.bezierCurveTo(740, 1360, 800, 1280, 760, 1190);
  land.bezierCurveTo(720, 1100, 640, 1080, 560, 1010);
  land.bezierCurveTo(450, 920, 380, 840, 420, 740);
  land.bezierCurveTo(450, 660, 540, 640, 580, 560);
  land.bezierCurveTo(620, 480, 600, 400, 660, 320);
  land.bezierCurveTo(710, 250, 720, 200, 800, 180);
  land.closePath();

  // sand rim
  g.save();
  g.shadowColor = 'rgba(0,0,0,.5)';
  g.shadowBlur = 30;
  g.strokeStyle = '#e6d19b';
  g.lineWidth = 34;
  g.stroke(land);
  g.restore();

  const landGrad = g.createLinearGradient(500, 200, 1500, 1500);
  landGrad.addColorStop(0, '#2f9c6d');
  landGrad.addColorStop(0.4, '#1f7a5c');
  landGrad.addColorStop(1, '#0d4a36');
  g.fillStyle = landGrad;
  g.fill(land);

  // inner plateau
  g.save();
  g.clip(land);
  const inner = g.createRadialGradient(1120, 720, 120, 1120, 720, 760);
  inner.addColorStop(0, 'rgba(126, 231, 135, .28)');
  inner.addColorStop(0.55, 'rgba(48, 150, 105, .12)');
  inner.addColorStop(1, 'rgba(4, 30, 22, .38)');
  g.fillStyle = inner;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // rice fields / farmland
  for (let i = 0; i < 7; i++) {
    const fx = 860 + rng() * 520;
    const fy = 640 + rng() * 420;
    g.save();
    g.translate(fx, fy);
    g.rotate(-0.25 + rng() * 0.3);
    g.fillStyle = 'rgba(201, 220, 110, .2)';
    g.strokeStyle = 'rgba(230, 240, 160, .22)';
    g.lineWidth = 1.5;
    for (let row = 0; row < 4; row++) {
      g.fillRect(row * 11, 0, 6, 34);
      g.strokeRect(row * 11, 0, 6, 34);
    }
    g.restore();
  }

  // river
  g.save();
  g.strokeStyle = 'rgba(80, 190, 230, .75)';
  g.lineWidth = 26;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(1010, 210);
  g.bezierCurveTo(1040, 430, 960, 520, 1010, 680);
  g.bezierCurveTo(1050, 820, 1180, 860, 1190, 980);
  g.bezierCurveTo(1200, 1120, 1100, 1220, 1110, 1400);
  g.stroke();
  g.strokeStyle = 'rgba(160, 235, 255, .35)';
  g.lineWidth = 6;
  g.stroke();
  g.restore();

  // roads
  const roads = [
    [[860, 320], [940, 500], [1090, 600], [1390, 790]],
    [[1390, 790], [1290, 830], [1240, 980], [930, 1430]],
    [[1090, 600], [1000, 850], [720, 780]],
    [[1390, 790], [1460, 1120], [1180, 1300], [760, 1300]],
  ];
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  roads.forEach(points => {
    g.strokeStyle = 'rgba(230, 209, 155, .5)';
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
    g.stroke();
    g.strokeStyle = 'rgba(255, 255, 255, .18)';
    g.lineWidth = 2;
    g.stroke();
  });
  g.restore();

  // forests
  for (let i = 0; i < 120; i++) {
    const x = 500 + rng() * 1100;
    const y = 240 + rng() * 1240;
    if (!g.isPointInPath(land, x, y)) continue;
    const r = 6 + rng() * 9;
    g.fillStyle = `rgba(${12 + rng() * 16}, ${70 + rng() * 40}, ${44 + rng() * 26}, .72)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(140, 240, 180, .12)';
    g.beginPath();
    g.arc(x - r * 0.28, y - r * 0.3, r * 0.6, 0, Math.PI * 2);
    g.fill();
  }

  // mountains (north + west)
  const peaks = [[790, 330], [850, 290], [910, 350], [690, 760], [640, 830], [760, 860], [980, 430]];
  peaks.forEach(([x, y], i) => {
    const h = 46 + (i % 3) * 18;
    g.save();
    g.translate(x, y);
    g.fillStyle = 'rgba(9, 46, 34, .85)';
    g.beginPath();
    g.moveTo(-46, 20);
    g.lineTo(0, -h);
    g.lineTo(46, 20);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(126, 231, 135, .22)';
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(22, -6);
    g.lineTo(0, 2);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, .55)';
    g.beginPath();
    g.moveTo(-10, -h + 18);
    g.lineTo(0, -h);
    g.lineTo(10, -h + 18);
    g.closePath();
    g.fill();
    g.restore();
  });

  // city blocks around Bangkok
  for (let i = 0; i < 26; i++) {
    const x = 1300 + rng() * 180;
    const y = 700 + rng() * 160;
    if (!g.isPointInPath(land, x, y)) continue;
    const w = 7 + rng() * 12;
    const h = 10 + rng() * 32;
    g.fillStyle = `rgba(${32 + rng() * 40}, ${54 + rng() * 30}, ${68 + rng() * 30}, .85)`;
    g.fillRect(x, y - h, w, h);
    g.fillStyle = 'rgba(255, 213, 122, .55)';
    g.fillRect(x + 2, y - h + 3, 2, 2);
  }

  // temples and landmarks
  const temples = [[1390, 760], [1090, 580], [860, 300], [760, 1290], [940, 490], [1290, 810]];
  temples.forEach(([x, y], idx) => {
    g.save();
    g.translate(x, y);
    // base
    g.fillStyle = '#f4e2b4';
    g.fillRect(-18, -8, 36, 16);
    g.fillStyle = '#c99a42';
    g.fillRect(-22, 8, 44, 5);
    // roof tiers
    g.fillStyle = idx % 2 ? '#d9a33c' : '#b96b32';
    for (let t = 0; t < 3; t++) {
      const w = 34 - t * 8;
      g.beginPath();
      g.moveTo(-w, -8 - t * 12);
      g.lineTo(0, -26 - t * 12);
      g.lineTo(w, -8 - t * 12);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#ffd57a';
    g.beginPath();
    g.arc(0, -64, 4, 0, Math.PI * 2);
    g.fill();
    g.restore();
  });

  // beach umbrellas
  [[730, 1330], [800, 1380], [1210, 1160], [980, 1520]].forEach(([x, y]) => {
    g.fillStyle = '#f2a81d';
    g.beginPath();
    g.arc(x, y, 12, Math.PI, 0);
    g.fill();
    g.fillStyle = '#e85c4a';
    g.beginPath();
    g.arc(x + 10, y, 9, Math.PI, 0);
    g.fill();
  });

  // satellite islands
  [[650, 1470, 70, 34], [1030, 1620, 90, 40], [1610, 1210, 66, 30], [520, 460, 46, 24]].forEach(([x, y, rx, ry]) => {
    g.fillStyle = '#d9c38e';
    g.beginPath(); g.ellipse(x, y, rx + 8, ry + 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d7a57';
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(126,231,135,.25)';
    g.beginPath(); g.ellipse(x - 10, y - 6, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2); g.fill();
  });

  g.restore();
  return { canvas: c, land };
}

function avatarHTML() {
  return `
    <div class="ar-avatar" id="arAvatar" aria-hidden="true">
      <div class="ar-avatar__tag"><b data-ar-name>นักเดินทาง</b><span data-ar-lv>Lv.1</span></div>
      <div class="ar-avatar__figure" data-figure>
        <div class="doll-shadow"></div>
        <div class="doll">
          <div class="doll__head">
            <div class="doll__face"><i class="eye eye--l"></i><i class="eye eye--r"></i><i class="mouth"></i><i class="blush blush--l"></i><i class="blush blush--r"></i></div>
            <div class="doll__hair"></div>
            <div class="doll__hat"></div>
          </div>
          <div class="doll__torso">
            <div class="doll__top"></div>
            <div class="doll__arm doll__arm--l"></div>
            <div class="doll__arm doll__arm--r"></div>
            <div class="doll__accessory"></div>
          </div>
          <div class="doll__legs">
            <div class="doll__leg doll__leg--l"></div>
            <div class="doll__leg doll__leg--r"></div>
          </div>
        </div>
      </div>
      <div class="ar-avatar__spark"></div>
    </div>`;
}

function applyOutfit(root, outfit) {
  const fig = root.querySelector('[data-figure]');
  const avatar = root.querySelector('#arAvatar');
  if (!fig || !avatar) return;
  avatar.dataset.hair = outfit.hair;
  avatar.dataset.top = outfit.top;
  avatar.dataset.bottom = outfit.bottom;
  avatar.dataset.hat = outfit.hat;
  avatar.dataset.shoes = outfit.shoes;
  avatar.dataset.accessory = outfit.accessory;
  const styles = {
    '--doll-skin': outfit.skin,
    '--doll-hair': outfit.hairColor,
    '--doll-top': outfit.topColor,
    '--doll-bottom': outfit.bottomColor,
    '--doll-shoe': outfit.shoeColor,
    '--doll-hat': outfit.hatColor,
  };
  Object.entries(styles).forEach(([k, v]) => fig.style.setProperty(k, v));
  const acc = fig.querySelector('.doll__accessory');
  if (acc) {
    const icons = { camera: '📷', backpack: '🎒', map: '🗺️', sword: '🗡️', none: '' };
    acc.textContent = icons[outfit.accessory] || '';
  }
  const hat = fig.querySelector('.doll__hat');
  if (hat) hat.className = `doll__hat doll__hat--${outfit.hat}`;
}

export function initARMap(container, {
  places = [],
  interactive = true,
  compact = false,
  autoWalk = false,
  showPins = true,
  onPlaceClick = null,
  onArrive = null,
  onMove = null,
} = {}) {
  if (!container) return null;
  container.classList.add('ar-world', compact ? 'ar-world--compact' : 'ar-world--full');
  container.innerHTML = `
    <canvas class="ar-canvas" data-canvas></canvas>
    <div class="ar-glow"></div>
    <div class="ar-pins" data-pins></div>
    <div class="ar-weather"><span>☀️ 28°</span><span class="ar-weather__live">AR LIVE</span></div>
    ${avatarHTML()}
    ${interactive ? `
      <div class="ar-joystick" data-joystick aria-label="จอยสติ๊กเดิน"><span class="ar-joystick__ring"></span><span class="ar-joystick__knob" data-knob></span></div>
      <div class="ar-controls">
        <button class="ar-ctrl" type="button" data-sprint title="วิ่ง" aria-label="วิ่ง">⚡</button>
        <button class="ar-ctrl" type="button" data-recenter title="กลับจุดเริ่ม" aria-label="กลับจุดเริ่ม">⌖</button>
      </div>
    ` : `<div class="ar-hint">${compact ? 'ลากแผนที่เพื่อเลือกจุดหมาย' : 'แตะแผนที่เพื่อเดิน'}</div>`}
    <div class="ar-vignette"></div>`;

  const canvas = container.querySelector('[data-canvas]');
  const ctx = canvas.getContext('2d');
  const pinsEl = container.querySelector('[data-pins]');
  const avatar = container.querySelector('#arAvatar');
  const figure = container.querySelector('[data-figure]');
  const joystick = container.querySelector('[data-joystick]');
  const knob = container.querySelector('[data-knob]');
  const sprintBtn = container.querySelector('[data-sprint]');
  const recenterBtn = container.querySelector('[data-recenter]');

  applyOutfit(container, loadOutfit());
  const { canvas: worldCanvas, land } = buildWorldCanvas();

  const state = {
    player: { x: 1390, y: 790 },
    camera: { x: 1390, y: 790 },
    vw: 360,
    vh: 420,
    dpr: Math.min(2, window.devicePixelRatio || 1),
    target: null,
    autoTarget: null,
    arrivePlace: null,
    stick: { x: 0, y: 0, active: false },
    keys: new Set(),
    sprint: false,
    walking: false,
    facing: 1,
    t: 0,
    raf: 0,
    destroyed: false,
    pins: [],
    dust: [],
    clouds: Array.from({ length: 7 }, (_, i) => ({
      x: rng() * WORLD_W,
      y: 120 + rng() * 1200,
      s: 0.6 + rng() * 0.9,
      v: 4 + rng() * 7,
      a: 0.06 + rng() * 0.08,
      i,
    })),
    fireflies: Array.from({ length: 26 }, () => ({
      x: 520 + rng() * 1100,
      y: 300 + rng() * 1100,
      p: rng() * Math.PI * 2,
      s: 0.5 + rng(),
    })),
  };

  // Place pins (stable positions per province)
  const regionCounts = {};
  state.pins = places.map(place => {
    regionCounts[place.province] = (regionCounts[place.province] || 0) + 1;
    const pos = placeWorld(place, regionCounts[place.province] - 1);
    return { place, x: pos.x, y: pos.y, el: null };
  });
  if (showPins) {
    pinsEl.innerHTML = state.pins.map(pin => {
      const meta = categoryMeta(pin.place.category);
      return `<button class="ar-pin" type="button" data-place-id="${pin.place.id}" style="--pin-color:${meta.color}" aria-label="${pin.place.name}">
        <span class="ar-pin__beacon"><span>${pin.place.fallbackEmoji || meta.emoji}</span></span>
        <span class="ar-pin__label">${pin.place.name}<small data-pin-dist>—</small></span>
      </button>`;
    }).join('');
    state.pins.forEach(pin => {
      pin.el = pinsEl.querySelector(`[data-place-id="${CSS.escape(pin.place.id)}"]`);
      pin.el?.addEventListener('click', e => {
        e.stopPropagation();
        setTarget(pin.x, pin.y, pin.place);
        onPlaceClick?.(pin.place, pin);
        if (!interactive) {
          // compact map still allows a quick fly-to
          state.player = { x: pin.x, y: pin.y };
        }
      });
    });
  } else {
    pinsEl.innerHTML = '';
  }

  function resize() {
    const r = container.getBoundingClientRect();
    state.vw = Math.max(200, r.width);
    state.vh = Math.max(220, r.height);
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(state.vw * state.dpr);
    canvas.height = Math.round(state.vh * state.dpr);
    canvas.style.width = `${state.vw}px`;
    canvas.style.height = `${state.vh}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    // keep the camera inside the world
    cameraClamp();
  }

  function cameraClamp() {
    state.camera.x = Math.max(0, Math.min(WORLD_W - state.vw, state.player.x - state.vw / 2));
    state.camera.y = Math.max(0, Math.min(WORLD_H - state.vh, state.player.y - state.vh / 2));
  }

  function setTarget(x, y, place = null) {
    state.autoTarget = { x, y };
    state.arrivePlace = place;
    state.target = { x, y };
  }

  function walkToPlace(place) {
    const pin = state.pins.find(p => p.place.id === place.id);
    if (pin) setTarget(pin.x, pin.y, place);
    else setTarget(state.player.x + 120, state.player.y, place);
  }

  function update(dt) {
    let dx = state.stick.x;
    let dy = state.stick.y;
    if (state.keys.has('ArrowLeft') || state.keys.has('a')) dx -= 1;
    if (state.keys.has('ArrowRight') || state.keys.has('d')) dx += 1;
    if (state.keys.has('ArrowUp') || state.keys.has('w')) dy -= 1;
    if (state.keys.has('ArrowDown') || state.keys.has('s')) dy += 1;

    if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08 && state.autoTarget) {
      const tx = state.autoTarget.x - state.player.x;
      const ty = state.autoTarget.y - state.player.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 18) {
        const arrived = state.arrivePlace;
        state.autoTarget = null;
        state.arrivePlace = null;
        state.target = null;
        if (arrived) onArrive?.(arrived);
      } else {
        dx = tx / dist;
        dy = ty / dist;
        if (dist < 80) { dx *= dist / 80; dy *= dist / 80; }
      }
    } else if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) {
      state.autoTarget = null;
      state.arrivePlace = null;
      state.target = null;
    }

    const mag = Math.hypot(dx, dy);
    if (mag > 0.05) {
      const norm = mag > 1 ? 1 / mag : 1;
      const speed = (state.sprint ? 265 : 150) * dt;
      state.player.x += dx * norm * speed;
      state.player.y += dy * norm * speed;
      state.player.x = Math.max(80, Math.min(WORLD_W - 80, state.player.x));
      state.player.y = Math.max(80, Math.min(WORLD_H - 80, state.player.y));
      state.facing = dx < -0.05 ? -1 : dx > 0.05 ? 1 : state.facing;
      state.walking = true;
      if (Math.random() < 0.3) {
        state.dust.push({ x: state.player.x + (Math.random() - 0.5) * 18, y: state.player.y, life: 1 });
      }
    } else {
      state.walking = false;
    }

    if (!state.autoTarget && autoWalk && Math.random() < 0.006) {
      const angle = Math.random() * Math.PI * 2;
      const r = 80 + Math.random() * 180;
      setTarget(state.player.x + Math.cos(angle) * r, state.player.y + Math.sin(angle) * r);
    }

    state.camera.x += (state.player.x - state.vw / 2 - state.camera.x) * Math.min(1, dt * 4.5);
    state.camera.y += (state.player.y - state.vh / 2 - state.camera.y) * Math.min(1, dt * 4.5);
    cameraClamp();

    state.dust.forEach(d => { d.life -= dt * 1.6; });
    state.dust = state.dust.filter(d => d.life > 0);

    avatar.classList.toggle('is-walking', state.walking);
    avatar.classList.toggle('is-left', state.facing < 0);
    const sx = state.player.x - state.camera.x;
    const sy = state.player.y - state.camera.y;
    avatar.style.left = `${sx}px`;
    avatar.style.top = `${sy}px`;
    avatar.style.zIndex = String(60 + Math.round(sy));
    onMove?.({ x: state.player.x, y: state.player.y, walking: state.walking });

    // DOM markers
    state.pins.forEach(pin => {
      if (!pin.el) return;
      const px = pin.x - state.camera.x;
      const py = pin.y - state.camera.y;
      const visible = px > -120 && px < state.vw + 120 && py > -80 && py < state.vh + 80;
      pin.el.style.display = visible ? '' : 'none';
      if (!visible) return;
      pin.el.style.left = `${px}px`;
      pin.el.style.top = `${py}px`;
      pin.el.style.zIndex = String(40 + Math.round(py));
      pin.el.classList.toggle('is-near', worldDistance(pin, state.player) < 160);
      const dist = meters(worldDistance(pin, state.player));
      const small = pin.el.querySelector('[data-pin-dist]');
      if (small) small.textContent = dist >= 1000 ? `${(dist / 1000).toFixed(1)} กม.` : `${dist} ม.`;
    });

    // HUD counters
    const nearest = state.pins.reduce((best, pin) => {
      const d = worldDistance(pin, state.player);
      return d < best.d ? { d, pin } : best;
    }, { d: Infinity, pin: null });
    container.querySelectorAll('[data-ar-nearest]').forEach(el => {
      el.textContent = nearest.pin ? `${nearest.pin.place.name} · ${meters(nearest.d)} ม.` : '—';
    });
    container.querySelectorAll('[data-ar-near-count]').forEach(el => {
      el.textContent = String(state.pins.filter(pin => worldDistance(pin, state.player) < 520).length);
    });
  }

  function draw() {
    const { camera, vw, vh, t } = state;
    ctx.clearRect(0, 0, vw, vh);
    ctx.drawImage(worldCanvas, camera.x, camera.y, vw, vh, 0, 0, vw, vh);

    // animated shoreline shimmer
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 240, 255, .18)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 18]);
    ctx.lineDashOffset = -t * 26;
    ctx.beginPath();
    ctx.arc(camera.x + vw * 0.5, camera.y + vh * 0.5, Math.min(vw, vh) * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // clouds
    state.clouds.forEach(cl => {
      cl.x += cl.v * 0.016;
      if (cl.x > WORLD_W + 300) cl.x = -300;
      const x = cl.x - camera.x;
      const y = cl.y - camera.y;
      if (x < -350 || x > vw + 350 || y < -200 || y > vh + 200) return;
      ctx.save();
      ctx.globalAlpha = cl.a;
      ctx.fillStyle = '#dff9ff';
      ctx.beginPath();
      ctx.ellipse(x, y, 90 * cl.s, 28 * cl.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 54 * cl.s, y + 8, 62 * cl.s, 22 * cl.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 58 * cl.s, y + 10, 50 * cl.s, 18 * cl.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // fireflies
    ctx.save();
    state.fireflies.forEach(f => {
      const a = 0.25 + Math.sin(t * 2 + f.p) * 0.25;
      const x = f.x - camera.x + Math.sin(t + f.p) * 12;
      const y = f.y - camera.y + Math.cos(t * 0.7 + f.p) * 8;
      if (x < -20 || x > vw + 20 || y < -20 || y > vh + 20) return;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#baffa8';
      ctx.beginPath();
      ctx.arc(x, y, 2.2 * f.s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // walking dust
    state.dust.forEach(d => {
      ctx.globalAlpha = d.life * 0.35;
      ctx.fillStyle = '#e8dcb8';
      ctx.beginPath();
      ctx.arc(d.x - camera.x + (1 - d.life) * 6, d.y - camera.y, 6 * (1 - d.life) + 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // target marker
    if (state.target) {
      const x = state.target.x - camera.x;
      const y = state.target.y - camera.y;
      ctx.save();
      ctx.strokeStyle = 'rgba(98, 242, 176, .8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 7]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.arc(x, y, 28 + Math.sin(t * 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // landmark glow halos
    state.pins.forEach(pin => {
      const x = pin.x - camera.x;
      const y = pin.y - camera.y;
      if (x < -60 || x > vw + 60 || y < -60 || y > vh + 60) return;
      const near = worldDistance(pin, state.player) < 160;
      const color = categoryMeta(pin.place.category).color;
      ctx.save();
      ctx.globalAlpha = near ? 0.35 : 0.18;
      const g = ctx.createRadialGradient(x, y, 2, x, y, near ? 50 : 32);
      g.addColorStop(0, color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, near ? 50 : 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  let last = performance.now();
  function loop(now) {
    if (state.destroyed) return;
    const dt = Math.min(0.045, (now - last) / 1000);
    last = now;
    state.t += dt;
    update(dt);
    draw();
    state.raf = requestAnimationFrame(loop);
  }

  // Joystick
  if (joystick) {
    let active = false;
    let center = { x: 0, y: 0 };
    const radius = 34;
    const move = e => {
      if (!active) return;
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      const mag = Math.hypot(dx, dy);
      const clamp = Math.min(1, mag / radius);
      const ux = mag ? dx / mag : 0;
      const uy = mag ? dy / mag : 0;
      state.stick = { x: ux * clamp, y: uy * clamp, active: true };
      if (knob) knob.style.transform = `translate(${ux * clamp * radius}px, ${uy * clamp * radius}px)`;
    };
    const end = () => {
      active = false;
      state.stick = { x: 0, y: 0, active: false };
      if (knob) knob.style.transform = '';
    };
    joystick.addEventListener('pointerdown', e => {
      active = true;
      const r = joystick.getBoundingClientRect();
      center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      joystick.setPointerCapture(e.pointerId);
      move(e);
    });
    joystick.addEventListener('pointermove', move);
    joystick.addEventListener('pointerup', end);
    joystick.addEventListener('pointercancel', end);
  }

  sprintBtn?.addEventListener('click', () => {
    state.sprint = !state.sprint;
    sprintBtn.classList.toggle('is-on', state.sprint);
  });
  recenterBtn?.addEventListener('click', () => {
    setTarget(1390, 790);
  });

  // Tap the map to walk there
  let down = null;
  canvas.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 10) return;
    const r = canvas.getBoundingClientRect();
    const wx = state.camera.x + (e.clientX - r.left);
    const wy = state.camera.y + (e.clientY - r.top);
    setTarget(wx, wy);
  });

  document.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(e.key)) {
      if (e.target.matches('input, textarea, select')) return;
      state.keys.add(e.key);
      if (e.key.startsWith('Arrow')) e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => state.keys.delete(e.key));

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  state.raf = requestAnimationFrame(loop);

  return {
    destroy() {
      state.destroyed = true;
      cancelAnimationFrame(state.raf);
      ro.disconnect();
    },
    walkToPlace,
    setPlaces(next) {
      // recreate pins in-place
      const counts = {};
      state.pins = (next || []).map(place => {
        counts[place.province] = (counts[place.province] || 0) + 1;
        const pos = placeWorld(place, counts[place.province] - 1);
        return { place, x: pos.x, y: pos.y, el: null };
      });
      if (!showPins) return;
      pinsEl.innerHTML = state.pins.map(pin => {
        const meta = categoryMeta(pin.place.category);
        return `<button class="ar-pin" type="button" data-place-id="${pin.place.id}" style="--pin-color:${meta.color}" aria-label="${pin.place.name}">
          <span class="ar-pin__beacon"><span>${pin.place.fallbackEmoji || meta.emoji}</span></span>
          <span class="ar-pin__label">${pin.place.name}<small data-pin-dist>—</small></span>
        </button>`;
      }).join('');
      state.pins.forEach(pin => {
        pin.el = pinsEl.querySelector(`[data-place-id="${CSS.escape(pin.place.id)}"]`);
        pin.el?.addEventListener('click', e => {
          e.stopPropagation();
          setTarget(pin.x, pin.y, pin.place);
          onPlaceClick?.(pin.place, pin);
        });
      });
    },
    setOutfit(outfit) {
      applyOutfit(container, outfit);
    },
    getNameEl() { return container.querySelector('[data-ar-name]'); },
    getLevelEl() { return container.querySelector('[data-ar-lv]'); },
    getPlayer() { return { ...state.player }; },
    recenter() { recenterBtn?.click(); },
  };
}
