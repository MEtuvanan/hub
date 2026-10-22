import { supabase } from './supabase.js';
import { requireAuth } from './auth.js';
import { signedUrls } from './journal.js';
import { esc } from './places.js';

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
// Local date key for a timestamptz, so late-night completions land on the user's own day.
const localKey = ts => { const d = new Date(ts); return ymd(d.getFullYear(), d.getMonth(), d.getDate()); };

let view = new Date(); view.setDate(1);
let diaries = [], completed = [], selected = null;

async function load() {
  const y = view.getFullYear(), m = view.getMonth();
  const start = ymd(y, m, 1), end = ymd(y, m, new Date(y, m + 1, 0).getDate());
  $('month').textContent = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  $('status').textContent = 'Loading…';
  try {
    const [d, q] = await Promise.all([
      supabase.from('travel_diaries')
        .select('id, title, travel_date, diary_photos(storage_path, caption)')
        .gte('travel_date', start).lte('travel_date', end),
      supabase.from('user_quests').select('completed_at, quests(title)').eq('status', 'completed')
        .gte('completed_at', new Date(y, m, 1).toISOString()).lt('completed_at', new Date(y, m + 1, 1).toISOString()),
    ]);
    if (d.error || q.error) throw d.error || q.error;
    diaries = d.data; completed = q.data;
    $('status').textContent = '';
    renderGrid();
    selected = null; $('day-title').textContent = 'Select a date'; $('day').innerHTML = '';
  } catch (e) { console.error(e); $('status').textContent = 'Could not load your calendar. Please try again.'; }
}

function renderGrid() {
  const y = view.getFullYear(), m = view.getMonth();
  const lead = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const diaryDays = new Set(diaries.map(d => d.travel_date));
  const questDays = new Set(completed.map(c => localKey(c.completed_at)));
  const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(l => `<div class="cal-dow" aria-hidden="true">${l}</div>`).join('');
  let cells = '<div class="cal-day empty"></div>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const k = ymd(y, m, d);
    cells += `<button class="cal-day" data-date="${k}" aria-pressed="${k === selected}"
      aria-label="${k}${diaryDays.has(k) ? ', has journal entry' : ''}${questDays.has(k) ? ', quest completed' : ''}">${d}
      <span class="dots">${diaryDays.has(k) ? '<span class="dot dot-diary"></span>' : ''}${questDays.has(k) ? '<span class="dot dot-quest"></span>' : ''}</span></button>`;
  }
  $('grid').innerHTML = dow + cells;
}

async function showDay(k) {
  selected = k; renderGrid();
  $('day-title').textContent = k;
  const ds = diaries.filter(d => d.travel_date === k);
  const qs = completed.filter(c => localKey(c.completed_at) === k);
  if (!ds.length && !qs.length) { $('day').innerHTML = '<p class="muted">Nothing recorded on this date.</p>'; return; }
  let urls = new Map();
  try { urls = await signedUrls(ds.flatMap(d => d.diary_photos.map(p => p.storage_path))); } catch (e) { console.error(e); }
  $('day').innerHTML =
    ds.map(d => `<article class="card"><h3>${esc(d.title)}</h3><div class="cal-thumbs">${d.diary_photos.map(p =>
      urls.get(p.storage_path) ? `<img src="${esc(urls.get(p.storage_path))}" alt="${esc(p.caption || d.title)}" loading="lazy">` : '').join('')}</div></article>`).join('') +
    qs.map(c => `<p>Completed quest: ${esc(c.quests?.title)}</p>`).join('') +
    '<p><a href="/journal">Open journal</a></p>';
}

$('grid').addEventListener('click', e => { const b = e.target.closest('[data-date]'); if (b) showDay(b.dataset.date); });
$('prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); load(); });
$('next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); load(); });

if (await requireAuth()) load();
