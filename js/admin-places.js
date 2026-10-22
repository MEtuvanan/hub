import { supabase } from './supabase.js';
import { $, esc, field, selectField, options, table, openEditor, confirmAction } from './admin-ui.js';
import { validatePhoto } from './journal.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
let ref, panelEl;

async function loadRef() {
  const [p, d, c] = await Promise.all([
    supabase.from('provinces').select('id, name_en').order('name_en'),
    supabase.from('districts').select('id, province_id, name_en').order('name_en'),
    supabase.from('place_categories').select('id, name').order('name'),
  ]);
  if (p.error || d.error || c.error) throw (p.error || d.error || c.error);
  ref = { provinces: p.data, districts: d.data, categories: c.data };
}

export async function renderPlaces(panel) {
  panelEl = panel;
  await loadRef();
  panel.innerHTML = `<div class="toolbar">
    <div class="form-field"><label for="p-search">Search</label><input id="p-search" type="search"></div>
    <div class="form-field"><label for="p-status">Status</label><select id="p-status"><option value="">All</option>
      <option>draft</option><option>published</option><option>archived</option></select></div>
    <button class="btn" id="p-new">New destination</button></div><div id="p-table"></div>`;
  $('p-new').onclick = () => edit(null);
  $('p-search').oninput = refresh;
  $('p-status').onchange = refresh;
  await refresh();
}

async function refresh() {
  let q = supabase.from('places').select('id, name, status, verified, provinces(name_en), districts(name_en)').order('name');
  if ($('p-status').value) q = q.eq('status', $('p-status').value);
  const term = $('p-search').value.trim().replace(/[%,()]/g, ' ');
  if (term) q = q.ilike('name', `%${term}%`);
  const { data, error } = await q;
  if (error) { $('p-table').innerHTML = '<p class="alert alert-error">Could not load destinations.</p>'; return; }
  $('p-table').innerHTML = table(['Name', 'Province / District', 'Status', 'Verified', 'Actions'],
    data.map(p => [esc(p.name), esc([p.provinces?.name_en, p.districts?.name_en].filter(Boolean).join(' / ')), esc(p.status),
      p.verified ? 'Yes' : 'No',
      `<div class="row-actions"><button class="btn btn-small" data-edit="${p.id}">Edit</button>` +
      (p.status !== 'archived' ? `<button class="btn btn-small btn-ghost" data-archive="${p.id}">Archive</button>` : '') + '</div>']),
    'No destinations yet. Create the first one.');
  $('p-table').onclick = async e => {
    if (e.target.dataset.edit) edit(e.target.dataset.edit);
    if (e.target.dataset.archive && confirmAction('Archive this destination? It will disappear from the public site.')) {
      const { error: err } = await supabase.from('places').update({ status: 'archived' }).eq('id', e.target.dataset.archive);
      if (err) alert(err.message); else refresh();
    }
  };
}

async function edit(id) {
  let p = { status: 'draft', verified: false, province_id: ref.provinces[0]?.id }, images = [];
  if (id) {
    const [a, b] = await Promise.all([
      supabase.from('places').select('*').eq('id', id).single(),
      supabase.from('place_images').select('id, url, alt').eq('place_id', id).order('position'),
    ]);
    if (a.error) { alert('Could not load destination.'); return; }
    p = a.data; images = b.data ?? [];
  }
  const dOpts = pid => '<option value="">(none)</option>' + options(ref.districts.filter(d => d.province_id === Number(pid)), 'id', 'name_en', p.district_id);
  const html = `
    ${field('e-name', 'Name', p.name, 'required maxlength="200"')}
    ${field('e-summary', 'Summary (max 500)', p.summary, 'maxlength="500"')}
    ${field('e-desc', 'Description', p.description, '', 'textarea')}
    <div class="two-col">
      ${selectField('e-prov', 'Province', options(ref.provinces, 'id', 'name_en', p.province_id), 'required')}
      ${selectField('e-dist', 'District', dOpts(p.province_id))}
      ${field('e-newdist', 'Or add new district', '', 'maxlength="100"')}
      ${selectField('e-cat', 'Category', '<option value="">(none)</option>' + options(ref.categories, 'id', 'name', p.category_id))}
      ${field('e-lat', 'Latitude (5–21)', p.lat, 'type="number" step="any" min="5" max="21" required')}
      ${field('e-lng', 'Longitude (97–106)', p.lng, 'type="number" step="any" min="97" max="106" required')}
    </div>
    ${field('e-visitor', 'Verified visitor information (hours, tickets)', p.visitor_info, '', 'textarea')}
    <div class="two-col">
      ${selectField('e-status', 'Status', ['draft', 'published', 'archived'].map(s => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join(''))}
      <div class="form-field"><label><input type="checkbox" id="e-verified" ${p.verified ? 'checked' : ''}> Verified (required to publish)</label></div>
    </div>
    <div id="e-imgs">${images.map(i => `<div class="o-row"><img src="${esc(i.url)}" alt="" width="60" height="60"><span>${esc(i.alt || 'image')}</span>
      <button type="button" class="btn btn-small btn-ghost" data-rmimg="${i.id}">Remove</button></div>`).join('')}</div>
    <div class="form-field"><label for="e-files">Add images (JPG/PNG/WebP, max 5 MB)</label><input id="e-files" type="file" accept="image/jpeg,image/png,image/webp" multiple></div>`;

  openEditor(id ? 'Edit destination' : 'New destination', html, () => save(id));
  $('e-prov').onchange = () => { $('e-dist').innerHTML = dOpts($('e-prov').value); };
  $('e-imgs').onclick = async e => {
    const img = e.target.dataset.rmimg; if (!img) return;
    const { error } = await supabase.from('place_images').delete().eq('id', img);
    if (!error) e.target.parentElement.remove();
  };
}

async function save(id) {
  const lat = Number($('e-lat').value), lng = Number($('e-lng').value);
  if (!(lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106)) throw new Error('Coordinates must be within Thailand.');
  const files = [...$('e-files').files];
  for (const f of files) { const err = validatePhoto(f); if (err) throw new Error(err); }

  let districtId = Number($('e-dist').value) || null;
  const nd = $('e-newdist').value.trim();
  if (nd) {
    const { data, error } = await supabase.from('districts')
      .upsert({ province_id: Number($('e-prov').value), name_en: nd }, { onConflict: 'province_id,name_en' }).select('id').single();
    if (error) throw error;
    districtId = data.id;
  }
  const row = {
    name: $('e-name').value.trim(), summary: $('e-summary').value.trim() || null, description: $('e-desc').value.trim() || null,
    province_id: Number($('e-prov').value), district_id: districtId, category_id: Number($('e-cat').value) || null,
    lat, lng, visitor_info: $('e-visitor').value.trim() || null,
    status: $('e-status').value, verified: $('e-verified').checked,
  };
  if (row.status === 'published' && !row.verified) throw new Error('A destination must be marked verified before it can be published.');

  const q = id ? supabase.from('places').update(row).eq('id', id).select('id').single()
               : supabase.from('places').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) throw error;

  for (const f of files) {
    const path = `${data.id}/${crypto.randomUUID()}.${EXT[f.type]}`;
    const up = await supabase.storage.from('place-images').upload(path, f, { contentType: f.type });
    if (up.error) throw new Error(`Saved, but image upload failed: ${up.error.message}`);
    const url = supabase.storage.from('place-images').getPublicUrl(path).data.publicUrl;
    const { error: ie } = await supabase.from('place_images').insert({ place_id: data.id, url, alt: row.name });
    if (ie) throw ie;
  }
  await refresh();
}
