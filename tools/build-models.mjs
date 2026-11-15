#!/usr/bin/env node
// tools/build-models.mjs — generates the low-poly GLB models used by the arena.
// Run: node tools/build-models.mjs
// Output: assets/models/boss-wat-arun.glb, assets/models/hero-ray.glb
//
// Everything is built from tapered boxes, so the files are tiny, deterministic
// and need no external 3D service. Colours follow assets/img/ray.png (the
// explorer in blue/white with goggles and a brown backpack).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'assets/models');
const DEG = Math.PI / 180;

/* ------------------------------- geometry -------------------------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function rotate([x, y, z], [rx, ry, rz]) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const x1 = x * cy + z1 * sy;
  const z2 = -x * sy + z1 * cy;
  const cz = Math.cos(rz), sz = Math.sin(rz);
  return [x1 * cz - y1 * sz, x1 * sz + y1 * cz, z2];
}

// Unit cube (-1..1) as six quads. `tx`/`tz` taper the top face.
function unitBoxQuads(tx = 1, tz = 1) {
  const b = [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]];
  const t = [[-tx, 1, -tz], [tx, 1, -tz], [tx, 1, tz], [-tx, 1, tz]];
  return [
    [b[0], b[1], b[2], b[3]],
    [t[0], t[1], t[2], t[3]],
    [b[0], t[0], t[1], b[1]],
    [b[1], t[1], t[2], b[2]],
    [b[2], t[2], t[3], b[3]],
    [b[3], t[3], t[0], b[0]],
  ];
}

function pushTriangle(out, a, b, c, center) {
  let n = cross(sub(b, a), sub(c, a));
  const len = Math.hypot(n[0], n[1], n[2]) || 1;
  n = [n[0] / len, n[1] / len, n[2] / len];
  const centroid = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
  // Keep the winding outward-facing for the (convex) primitive.
  if (dot(n, sub(centroid, center)) < 0) {
    [b, c] = [c, b];
    n = [-n[0], -n[1], -n[2]];
  }
  for (const p of [a, b, c]) {
    out.pos.push(p[0], p[1], p[2]);
    out.norm.push(n[0], n[1], n[2]);
  }
}

function addBox(groups, mat, { pos, size, rot = [0, 0, 0], taper = [1, 1] }) {
  const [w, h, d] = size;
  const scale = [w / 2, h / 2, d / 2];
  const out = (groups[mat] ||= { pos: [], norm: [] });
  for (const quad of unitBoxQuads(taper[0], taper[1])) {
    const p = quad.map(([x, y, z]) => {
      const s = rotate([x * scale[0], y * scale[1], z * scale[2]], rot);
      return [s[0] + pos[0], s[1] + pos[1], s[2] + pos[2]];
    });
    pushTriangle(out, p[0], p[1], p[2], pos);
    pushTriangle(out, p[0], p[2], p[3], pos);
  }
}

/* ------------------------------- glTF/GLB -------------------------------- */
function padded(buffer, byte, multiple = 4) {
  const rest = buffer.length % multiple;
  return rest === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(multiple - rest, byte)]);
}

function buildGlb(fileName, groups, palette) {
  const bufferViews = [];
  const accessors = [];
  const primitives = [];
  const chunks = [];
  let offset = 0;

  const pushView = (typed, target) => {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    if (offset % 4) {
      const pad = Buffer.alloc(4 - (offset % 4));
      chunks.push(pad);
      offset += pad.length;
    }
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    chunks.push(bytes);
    offset += bytes.length;
    return bufferViews.length - 1;
  };

  const materials = Object.entries(palette).map(([name, m]) => ({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: [...m.color, 1],
      metallicFactor: m.metallic ?? 0.05,
      roughnessFactor: m.roughness ?? 0.85,
    },
    ...(m.emissive ? { emissiveFactor: m.emissive } : {}),
  }));
  const materialIndex = Object.keys(palette).reduce((acc, key, i) => ((acc[key] = i), acc), {});

  Object.entries(groups).forEach(([mat, geo]) => {
    if (!geo.pos.length) return;
    const positions = new Float32Array(geo.pos);
    const normals = new Float32Array(geo.norm);
    const indices = new Uint16Array(positions.length / 3);
    for (let i = 0; i < indices.length; i += 1) indices[i] = i;

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let a = 0; a < 3; a += 1) {
        min[a] = Math.min(min[a], positions[i + a]);
        max[a] = Math.max(max[a], positions[i + a]);
      }
    }

    const posView = pushView(positions, 34962);
    const normView = pushView(normals, 34962);
    const idxView = pushView(indices, 34963);

    accessors.push(
      { bufferView: posView, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: normView, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: idxView, componentType: 5123, count: indices.length, type: 'SCALAR' },
    );
    primitives.push({
      attributes: { POSITION: accessors.length - 3, NORMAL: accessors.length - 2 },
      indices: accessors.length - 1,
      material: materialIndex[mat],
    });
  });

  const bin = Buffer.concat(chunks);
  const gltf = {
    asset: { version: '2.0', generator: 'hub-build-models' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: fileName.replace('.glb', '') }],
    meshes: [{ primitives }],
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };

  const json = padded(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const binary = padded(bin, 0x00);
  const total = 12 + 8 + json.length + 8 + binary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonHeader, json, binHeader, binary, Buffer.alloc(0)]).subarray(0, total);
}

/* --------------------------------- hero ---------------------------------- */
// Ray: blue/white explorer with goggles, dark hair, brown pack, chunky boots.
const HERO_PALETTE = {
  skin: { color: [0.94, 0.76, 0.61] },
  hair: { color: [0.16, 0.12, 0.10] },
  blue: { color: [0.18, 0.43, 0.93] },
  navy: { color: [0.12, 0.22, 0.42] },
  white: { color: [0.95, 0.97, 1.0] },
  brown: { color: [0.35, 0.20, 0.10] },
  dark: { color: [0.10, 0.08, 0.07] },
  gold: { color: [0.85, 0.63, 0.11], metallic: 0.6, roughness: 0.35 },
  sole: { color: [0.90, 0.93, 0.97] },
};

function buildHero() {
  const g = {};
  const add = (mat, pos, size, extra = {}) => addBox(g, mat, { pos, size, ...extra });

  // Boots + legs
  for (const side of [-1, 1]) {
    add('sole', [side * 0.20, 0.05, 0.05], [0.31, 0.10, 0.50]);
    add('navy', [side * 0.20, 0.18, 0.02], [0.29, 0.22, 0.44], { taper: [0.9, 0.85] });
    add('white', [side * 0.20, 0.25, 0.20], [0.24, 0.06, 0.12]);
    add('white', [side * 0.18, 0.31, 0], [0.20, 0.09, 0.22]);
    add('skin', [side * 0.18, 0.43, 0], [0.16, 0.26, 0.18]);
  }

  // Shorts, belt
  add('navy', [0, 0.78, 0], [0.52, 0.28, 0.34]);
  for (const side of [-1, 1]) add('navy', [side * 0.14, 0.66, 0], [0.23, 0.22, 0.31]);
  add('dark', [0, 0.90, 0], [0.55, 0.08, 0.37]);
  add('gold', [0, 0.90, 0.19], [0.11, 0.10, 0.05]);

  // Torso: blue jacket with white shirt panel and collar
  add('blue', [0, 1.14, 0], [0.53, 0.44, 0.33]);
  add('white', [0, 1.13, 0.17], [0.28, 0.42, 0.05]);
  add('white', [0, 1.36, 0.10], [0.31, 0.08, 0.19]);
  add('gold', [0, 1.19, 0.20], [0.06, 0.06, 0.04]);

  // Backpack and straps
  add('brown', [0, 1.10, -0.28], [0.43, 0.47, 0.21], { taper: [0.9, 0.9] });
  add('dark', [0, 0.97, -0.39], [0.25, 0.19, 0.06]);
  for (const side of [-1, 1]) add('dark', [side * 0.16, 1.16, 0.17], [0.06, 0.40, 0.04]);

  // Arms (slightly splayed) and hands
  for (const side of [-1, 1]) {
    add('blue', [side * 0.34, 1.20, 0], [0.16, 0.29, 0.19], { rot: [0, 0, side * 7 * DEG] });
    add('white', [side * 0.375, 1.05, 0.01], [0.15, 0.07, 0.17]);
    add('skin', [side * 0.38, 0.94, 0.02], [0.13, 0.19, 0.15], { rot: [0, 0, side * 9 * DEG] });
    add('skin', [side * 0.41, 0.85, 0.03], [0.13, 0.12, 0.14]);
  }

  // Telescope in the right hand
  add('gold', [0.42, 0.80, 0.22], [0.12, 0.12, 0.34], { rot: [55 * DEG, 0, 0] });
  add('dark', [0.42, 0.70, 0.37], [0.13, 0.13, 0.05], { rot: [55 * DEG, 0, 0] });

  // Head, hair, goggles, cap
  add('skin', [0, 1.41, 0], [0.16, 0.10, 0.16]);
  add('skin', [0, 1.56, 0], [0.38, 0.32, 0.35]);
  add('hair', [0, 1.71, -0.02], [0.42, 0.14, 0.39], { taper: [0.9, 0.9] });
  add('hair', [0, 1.64, 0.18], [0.35, 0.13, 0.06]);
  for (const side of [-1, 1]) add('hair', [side * 0.20, 1.57, 0.02], [0.06, 0.20, 0.31]);
  add('blue', [0, 1.73, 0], [0.45, 0.08, 0.41]);
  for (const side of [-1, 1]) {
    add('gold', [side * 0.11, 1.71, 0.20], [0.12, 0.11, 0.05]);
    add('dark', [side * 0.11, 1.71, 0.23], [0.09, 0.08, 0.02]);
  }
  add('white', [0, 1.79, -0.02], [0.41, 0.11, 0.37], { taper: [0.85, 0.85] });
  add('blue', [0, 1.80, 0.18], [0.11, 0.06, 0.05]);

  return buildGlb('hero-ray.glb', g, HERO_PALETTE);
}

/* --------------------------------- boss ---------------------------------- */
// Wat Arun guardian: hulking stone yak in gold armour with a glowing core.
const BOSS_PALETTE = {
  stone: { color: [0.37, 0.42, 0.35], roughness: 0.95 },
  stoneDark: { color: [0.24, 0.28, 0.24], roughness: 0.95 },
  gold: { color: [0.79, 0.57, 0.16], metallic: 0.55, roughness: 0.42 },
  red: { color: [0.56, 0.16, 0.16], roughness: 0.75 },
  bone: { color: [0.91, 0.88, 0.78] },
  glow: { color: [0.35, 0.12, 0.03], emissive: [1.0, 0.45, 0.10] },
};

function buildBoss() {
  const g = {};
  const add = (mat, pos, size, extra = {}) => addBox(g, mat, { pos, size, ...extra });

  // Feet and legs
  for (const side of [-1, 1]) {
    add('stoneDark', [side * 0.42, 0.12, 0.06], [0.56, 0.24, 0.70]);
    add('stone', [side * 0.40, 0.56, 0], [0.41, 0.66, 0.47], { taper: [1.15, 1.1] });
    add('gold', [side * 0.40, 0.93, 0.23], [0.31, 0.15, 0.08]);
  }

  // Loincloth and belt
  add('red', [0, 1.06, 0], [0.80, 0.46, 0.56], { taper: [0.85, 0.85] });
  add('gold', [0, 1.29, 0], [0.96, 0.19, 0.63]);

  // Torso armour, chest plate, glowing core
  add('gold', [0, 1.66, 0], [1.06, 0.72, 0.65], { taper: [0.92, 0.92] });
  add('red', [0, 1.69, 0.31], [0.67, 0.45, 0.10]);
  add('glow', [0, 1.73, 0.38], [0.21, 0.21, 0.07]);
  add('gold', [0, 1.39, 0.30], [0.74, 0.12, 0.14]);

  // Shoulders, arms, bracers, fists
  for (const side of [-1, 1]) {
    add('gold', [side * 0.69, 1.99, 0], [0.43, 0.31, 0.53], { rot: [0, 0, side * -8 * DEG] });
    add('stone', [side * 0.67, 1.63, 0], [0.31, 0.47, 0.35]);
    add('gold', [side * 0.70, 1.35, 0.02], [0.35, 0.23, 0.39]);
    add('stoneDark', [side * 0.72, 1.14, 0.04], [0.29, 0.23, 0.31]);
  }

  // Neck, head, brow, eyes, tusks
  add('stone', [0, 2.09, 0], [0.35, 0.17, 0.35]);
  add('stone', [0, 2.31, 0], [0.53, 0.45, 0.49], { taper: [0.92, 0.92] });
  add('stoneDark', [0, 2.37, 0.23], [0.47, 0.10, 0.10]);
  for (const side of [-1, 1]) {
    add('glow', [side * 0.12, 2.33, 0.26], [0.09, 0.07, 0.04]);
    add('bone', [side * 0.16, 2.13, 0.25], [0.07, 0.17, 0.07], { rot: [0, 0, side * 10 * DEG] });
  }

  // Horns and crown spire
  for (const side of [-1, 1]) {
    add('bone', [side * 0.27, 2.59, 0], [0.15, 0.48, 0.15], { rot: [0, 0, side * 26 * DEG], taper: [0.3, 0.3] });
  }
  add('gold', [0, 2.68, 0], [0.31, 0.24, 0.31], { taper: [0.45, 0.45] });
  add('glow', [0, 2.82, 0], [0.10, 0.08, 0.10]);

  return buildGlb('boss-wat-arun.glb', g, BOSS_PALETTE);
}

mkdirSync(outDir, { recursive: true });
const models = [
  ['boss-wat-arun.glb', buildBoss()],
  ['hero-ray.glb', buildHero()],
];
for (const [name, glb] of models) {
  writeFileSync(resolve(outDir, name), glb);
  console.log(`${name}: ${(glb.length / 1024).toFixed(1)} KB`);
}
