import { listDiaries, signedUrls, saveDiary, deleteDiary, deletePhoto, validatePhoto } from './journal.js';
import { requireAuth } from './auth.js';
import { listPlaces, esc } from './places.js';

const $ = id => document.getElementById(id);
let session, places = [], diaries = [], editing = null, pending = [];

const msg = (t, ok) => { $('dlg-msg').className = t ? 'alert ' + (ok ? 'alert-ok' : 'alert-error') : ''; $('dlg-msg').textContent = t; };

async function load() {
  $('status').textContent = 'Loading…';
  try {
    diaries = await listDiaries({ from: $('f-from').value, to: $('f-to').value, placeId: $('f-place').value });
    const urls = await signedUrls(diaries.flatMap(d => d.diary_photos.map(p => p.storage_path)));
    $('status').textContent = diaries.length ? '' : 'No entries yet. Create your first one.';
    $('list').innerHTML = diaries.map(d => `
      <article class="card entry" data-id="${d.id}">
        <h2>${esc(d.title)}</h2>
        <p class="muted">${esc(d.travel_date)}${d.mood ? ' · ' + esc(d.mood) : ''}${d.diary_place_links.length ? ' · ' + d.diary_place_links.map(l => esc(l.places?.name)).join(', ') : ''}</p>
        <p>${esc(d.body)}</p>
        <div class="thumbs">${[...d.diary_photos].sort((a, b) => a.position - b.position).map(p => urls.get(p.storage_path)
          ? `<figure><img src="${esc(urls.get(p.storage_path))}" alt="${esc(p.caption || d.title)}" loading="lazy"><figcaption>${esc(p.caption)}</figcaption></figure>` : '').join('')}</div>
        <div class="entry-actions"><button class="btn btn-small" data-act="edit">Edit</button>
          <button class="btn btn-small btn-ghost" data-act="del">Delete</button></div>
      </article>`).join('');
  } catch (e) { console.error(e); $('status').textContent = 'Could not load entries. Please try again.'; }
}

function renderCaptions() {
  $('captions').innerHTML = pending.map((p, i) => `<div class="cap-row"><span>${esc(p.file.name)}</span>
    <input data-i="${i}" placeholder="Caption (optional)" maxlength="300" aria-label="Caption for ${esc(p.file.name)}"></div>`).join('');
}

async function openEditor(d) {
  editing = d; pending = []; msg('');
  $('entry-form').reset();
  $('captions').innerHTML = '';
  $('dlg-title').textContent = d ? 'Edit entry' : 'New entry';
  $('title').value = d?.title ?? '';
  $('date').value = d?.travel_date ?? new Date().toISOString().slice(0, 10);
  $('mood').value = d?.mood ?? '';
  $('body').value = d?.body ?? '';
  const linked = new Set(d?.diary_place_links.map(l => l.place_id));
  const urlPlaceId = new URLSearchParams(location.search).get('place_id');
  if (!d && urlPlaceId) linked.add(urlPlaceId);
  $('places').innerHTML = places.map(p => `<option value="${p.id}" ${linked.has(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  $('existing').innerHTML = (d?.diary_photos ?? []).map(p =>
    `<div class="cap-row"><span>${esc(p.caption || 'Photo')}</span><button type="button" class="btn btn-small btn-ghost" data-photo="${p.id}">Remove</button></div>`).join('');
  $('dlg').showModal();
}

$('files').addEventListener('change', () => {
  const errs = [];
  pending = [...$('files').files].filter(f => { const e = validatePhoto(f); if (e) errs.push(e); return !e; }).map(file => ({ file, caption: '' }));
  msg(errs.join(' '));
  renderCaptions();
});
$('captions').addEventListener('input', e => { if (e.target.dataset.i) pending[e.target.dataset.i].caption = e.target.value.trim(); });

$('existing').addEventListener('click', async e => {
  const id = e.target.dataset.photo; if (!id) return;
  const photo = editing.diary_photos.find(p => p.id === id);
  try { await deletePhoto(photo); editing.diary_photos = editing.diary_photos.filter(p => p.id !== id); e.target.parentElement.remove(); }
  catch (err) { console.error(err); msg('Could not remove photo.'); }
});

$('entry-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('save').disabled = true; msg('Saving…', true);
  try {
    const { failed } = await saveDiary({
      id: editing?.id, userId: session.user.id, title: $('title').value.trim(), body: $('body').value.trim(),
      travel_date: $('date').value, mood: $('mood').value.trim(),
      placeIds: [...$('places').selectedOptions].map(o => o.value), photos: pending,
    });
    if (failed.length) { msg(`Entry saved, but these photos failed to upload: ${failed.join(', ')}.`); }
    else $('dlg').close();
    load();
  } catch (err) { console.error(err); msg('Could not save the entry. Please try again.'); }
  $('save').disabled = false;
});

$('list').addEventListener('click', async e => {
  const act = e.target.dataset.act; if (!act) return;
  const d = diaries.find(x => x.id === e.target.closest('[data-id]').dataset.id);
  if (act === 'edit') return openEditor(d);
  if (confirm(`Delete "${d.title}" and its photos? This cannot be undone.`)) {
    try { await deleteDiary(d); load(); } catch (err) { console.error(err); alert('Could not delete the entry.'); }
  }
});

$('new').addEventListener('click', () => openEditor(null));
$('cancel').addEventListener('click', () => $('dlg').close());
$('filters').addEventListener('submit', e => e.preventDefault());
['f-from', 'f-to', 'f-place'].forEach(id => $(id).addEventListener('change', load));

session = await requireAuth();
if (session) {
  try {
    places = await listPlaces();
    $('f-place').innerHTML = '<option value="">All</option>' + places.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  } catch (e) { console.error(e); }
  await load();
  if (new URLSearchParams(location.search).get('place_id')) {
    openEditor(null);
  }
}
