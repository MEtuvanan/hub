import { getPlace, isUuid, esc } from './places.js';
import { createMap, setMarkers } from './maps.js';
import { listQuestsForPlace } from './quests.js';

const $ = id => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id');

async function init() {
  if (!isUuid(id)) { $('status').textContent = 'Invalid destination link.'; return; }
  let p;
  try { p = await getPlace(id); }
  catch (e) { console.error(e); $('status').textContent = 'Could not load this destination. Please try again.'; return; }
  if (!p) { $('status').textContent = 'Destination not found.'; return; }

  document.title = `${p.name} — Travel and Challenge`;
  $('status').hidden = true;
  $('place').hidden = false;
  $('name').textContent = p.name;
  $('meta').textContent = [p.place_categories?.name, p.districts?.name_en, p.provinces?.name_en].filter(Boolean).join(' · ');
  $('description').textContent = p.description || p.summary || 'No description yet.';
  $('visitor').textContent = p.visitor_info || 'Visitor information (hours, tickets) has not been verified yet.';
  $('coords').textContent = `Coordinates: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
  $('gallery').innerHTML = p.images.map(i => `<img src="${esc(i.url)}" alt="${esc(i.alt || p.name)}" loading="lazy">`).join('');
  if ($('btn-write-journal')) $('btn-write-journal').href = `/journal?place_id=${encodeURIComponent(p.id)}`;

  try {
    const qs = await listQuestsForPlace(p.id);
    $('quests').innerHTML = qs.length
      ? qs.map(q => `<li><a href="/quests">${esc(q.title)}</a> (${esc(q.difficulty)}, ${q.reward_tokens} tokens)</li>`).join('')
      : '<li class="muted">No quests here yet.</li>';
  } catch (e) { console.error(e); $('quests').innerHTML = '<li class="muted">Could not load quests.</li>'; }

  try {
    const map = await createMap($('map'));
    setMarkers(map, {}, [p], () => {});
  } catch (e) { $('map-error').hidden = false; $('map-error').textContent = e.message; }
}
init();
