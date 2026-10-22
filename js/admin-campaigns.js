import { supabase } from './supabase.js';
import { $, esc, field, selectField, table, openEditor, confirmAction, toLocalInput, fromLocalInput } from './admin-ui.js';

let placesRef = [], questsRef = [];
const STATUSES = ['draft', 'published', 'paused', 'ended', 'archived'];

export async function renderCampaigns(panel) {
  const [p, q] = await Promise.all([
    supabase.from('places').select('id, name').neq('status', 'archived').order('name'),
    supabase.from('quests').select('id, title').neq('status', 'archived').order('title'),
  ]);
  if (p.error || q.error) throw (p.error || q.error);
  placesRef = p.data; questsRef = q.data;
  panel.innerHTML = '<div class="toolbar"><button class="btn" id="c-new">New campaign</button></div><div id="c-table"></div>';
  $('c-new').onclick = () => edit(null);
  await refresh();
}

async function refresh() {
  const [c, parts] = await Promise.all([
    supabase.from('campaigns').select('id, title, status, starts_at, ends_at, campaign_places(place_id), campaign_quests(quest_id)').order('created_at', { ascending: false }),
    supabase.from('campaign_participants').select('campaign_id'),
  ]);
  if (c.error) { $('c-table').innerHTML = '<p class="alert alert-error">Could not load campaigns.</p>'; return; }
  const counts = {};
  (parts.data ?? []).forEach(r => { counts[r.campaign_id] = (counts[r.campaign_id] ?? 0) + 1; });
  const fmt = t => (t ? new Date(t).toLocaleDateString() : '—');
  $('c-table').innerHTML = table(['Title', 'Status', 'Dates', 'Destinations', 'Quests', 'Participants', 'Actions'],
    c.data.map(x => [esc(x.title), x.status, `${fmt(x.starts_at)} → ${fmt(x.ends_at)}`, x.campaign_places.length, x.campaign_quests.length,
      counts[x.id] ?? 0,
      `<div class="row-actions"><button class="btn btn-small" data-act="edit" data-id="${x.id}">Edit</button>` +
      (x.status === 'published' ? `<button class="btn btn-small btn-ghost" data-act="paused" data-id="${x.id}">Pause</button>` : '') +
      (['published', 'paused'].includes(x.status) ? `<button class="btn btn-small btn-ghost" data-act="ended" data-id="${x.id}">End</button>` : '') +
      (x.status !== 'archived' ? `<button class="btn btn-small btn-ghost" data-act="archived" data-id="${x.id}">Archive</button>` : '') + '</div>']),
    'No campaigns yet.');
  $('c-table').onclick = async e => {
    const { act, id } = e.target.dataset; if (!act) return;
    if (act === 'edit') return edit(id);
    if (!confirmAction(`Set this campaign to "${act}"?`)) return;
    const { error } = await supabase.from('campaigns').update({ status: act }).eq('id', id);
    if (error) alert(error.message); else refresh();
  };
}

async function edit(id) {
  let c = { status: 'draft' }, pset = new Set(), qset = new Set();
  if (id) {
    const [a, b, d] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).single(),
      supabase.from('campaign_places').select('place_id').eq('campaign_id', id),
      supabase.from('campaign_quests').select('quest_id').eq('campaign_id', id),
    ]);
    if (a.error || b.error || d.error) { alert('Could not load campaign.'); return; }
    c = a.data; pset = new Set(b.data.map(r => r.place_id)); qset = new Set(d.data.map(r => r.quest_id));
  }
  const multi = (idv, label, rows, key, name, set) => `<div class="form-field"><label for="${idv}">${label}</label>
    <select id="${idv}" multiple size="5">${rows.map(r => `<option value="${r.id}" ${set.has(r.id) ? 'selected' : ''}>${esc(r[name])}</option>`).join('')}</select></div>`;
  openEditor(id ? 'Edit campaign' : 'New campaign', `
    ${field('m-title', 'Title', c.title, 'required maxlength="200"')}
    ${field('m-desc', 'Description', c.description, '', 'textarea')}
    ${field('m-img', 'Image URL', c.image_url, 'type="url"')}
    <div class="two-col">${field('m-start', 'Starts', toLocalInput(c.starts_at), 'type="datetime-local"')}
      ${field('m-end', 'Ends', toLocalInput(c.ends_at), 'type="datetime-local"')}</div>
    ${multi('m-places', 'Destinations (Ctrl/Cmd-click for several)', placesRef, 'id', 'name', pset)}
    ${multi('m-quests', 'Quests', questsRef, 'id', 'title', qset)}
    ${selectField('m-status', 'Status', STATUSES.map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join(''))}`,
  async () => {
    const starts = fromLocalInput($('m-start').value), ends = fromLocalInput($('m-end').value);
    if (starts && ends && new Date(ends) <= new Date(starts)) throw new Error('End date must be after the start date.');
    const status = $('m-status').value;
    if (status === 'published' && ends && new Date(ends) <= new Date()) throw new Error('Cannot publish a campaign that has already ended.');
    const row = { title: $('m-title').value.trim(), description: $('m-desc').value.trim() || null, image_url: $('m-img').value.trim() || null,
      starts_at: starts, ends_at: ends, status };
    const { data, error } = id ? await supabase.from('campaigns').update(row).eq('id', id).select('id').single()
                                : await supabase.from('campaigns').insert(row).select('id').single();
    if (error) throw error;
    const link = async (table, col, values) => {
      await supabase.from(table).delete().eq('campaign_id', data.id);
      if (values.length) { const { error: e } = await supabase.from(table).insert(values.map(v => ({ campaign_id: data.id, [col]: v }))); if (e) throw e; }
    };
    await link('campaign_places', 'place_id', [...$('m-places').selectedOptions].map(o => o.value));
    await link('campaign_quests', 'quest_id', [...$('m-quests').selectedOptions].map(o => o.value));
    await refresh();
  });
}
