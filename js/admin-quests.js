import { supabase } from './supabase.js';
import { $, esc, field, selectField, options, table, openEditor, confirmAction, toLocalInput, fromLocalInput } from './admin-ui.js';

let chars = [], placesRef = [];

export async function renderQuests(panel) {
  const [c, p] = await Promise.all([
    supabase.from('characters').select('id, name').eq('status', 'active').order('name'),
    supabase.from('places').select('id, name').neq('status', 'archived').order('name'),
  ]);
  if (c.error || p.error) throw (c.error || p.error);
  chars = c.data; placesRef = p.data;
  panel.innerHTML = `<div class="toolbar">
    <div class="form-field"><label for="q-status">Status</label><select id="q-status"><option value="">All</option>
      <option>draft</option><option>published</option><option>archived</option></select></div>
    <button class="btn" id="q-new">New quest</button>
    <button class="btn btn-ghost" id="c-new">New character</button></div><div id="q-table"></div>`;
  $('q-new').onclick = () => edit(null);
  $('c-new').onclick = editCharacter;
  $('q-status').onchange = refresh;
  await refresh();
}

async function refresh() {
  let q = supabase.from('quests').select('id, title, type, difficulty, status, reward_tokens, quest_places(places(name))').order('created_at', { ascending: false });
  if ($('q-status').value) q = q.eq('status', $('q-status').value);
  const { data, error } = await q;
  if (error) { $('q-table').innerHTML = '<p class="alert alert-error">Could not load quests.</p>'; return; }
  $('q-table').innerHTML = table(['Title', 'Type', 'Difficulty', 'Destinations', 'Tokens', 'Status', 'Actions'],
    data.map(x => [esc(x.title), x.type, x.difficulty, esc(x.quest_places.map(p => p.places?.name).join(', ')), x.reward_tokens, x.status,
      `<div class="row-actions"><button class="btn btn-small" data-act="edit" data-id="${x.id}">Edit</button>
       <button class="btn btn-small btn-ghost" data-act="dup" data-id="${x.id}">Duplicate</button>
       <button class="btn btn-small btn-ghost" data-act="preview" data-id="${x.id}">Preview</button>` +
      (x.status !== 'archived' ? `<button class="btn btn-small btn-ghost" data-act="archive" data-id="${x.id}">Archive</button>` : '') + '</div>']),
    'No quests yet. Create a destination first, then a quest.');
  $('q-table').onclick = async e => {
    const { act, id } = e.target.dataset; if (!act) return;
    if (act === 'edit') edit(id);
    if (act === 'dup') edit(id, true);
    if (act === 'preview') preview(id);
    if (act === 'archive' && confirmAction('Archive this quest? Users will no longer see it.')) {
      const { error: err } = await supabase.from('quests').update({ status: 'archived' }).eq('id', id);
      if (err) alert(err.message); else refresh();
    }
  };
}

async function loadQuest(id) {
  const [q, qp, qq, keys, sec] = await Promise.all([
    supabase.from('quests').select('*').eq('id', id).single(),
    supabase.from('quest_places').select('place_id').eq('quest_id', id),
    supabase.from('quest_questions').select('id, prompt, position, quest_options(id, label, position)').eq('quest_id', id).order('position'),
    supabase.from('quest_answer_keys').select('option_id'),
    supabase.from('quest_secrets').select('checkin_code').eq('quest_id', id).maybeSingle(),
  ]);
  const err = q.error || qp.error || qq.error || keys.error || sec.error;
  if (err) throw err;
  const correct = new Set(keys.data.map(k => k.option_id));
  return {
    quest: q.data, placeIds: new Set(qp.data.map(r => r.place_id)), code: sec.data?.checkin_code ?? '',
    questions: qq.data.map(x => ({ prompt: x.prompt, options: [...x.quest_options].sort((a, b) => a.position - b.position)
      .map(o => ({ label: o.label, correct: correct.has(o.id) })) })),
  };
}

async function preview(id) {
  const d = await loadQuest(id);
  openEditor('Preview: ' + d.quest.title, `<p>${esc(d.quest.description)}</p><p>Reward: ${d.quest.reward_tokens} tokens</p>` +
    d.questions.map((q, i) => `<p><b>${i + 1}. ${esc(q.prompt)}</b></p><ul>${q.options.map(o => `<li>${esc(o.label)}${o.correct ? ' ✔' : ''}</li>`).join('')}</ul>`).join('') +
    (d.code ? `<p>Check-in code: <code>${esc(d.code)}</code></p>` : ''), async () => {});
}

const qBlock = (q = { prompt: '', options: [{ label: '', correct: true }, { label: '', correct: false }] }) => `
  <div class="q-block"><div class="form-field"><label>Question</label><input class="q-prompt" value="${esc(q.prompt)}" maxlength="300"></div>
  ${q.options.map((o, i) => `<div class="o-row"><input type="radio" class="o-correct" ${o.correct ? 'checked' : ''} aria-label="Correct answer">
    <input type="text" class="o-label" value="${esc(o.label)}" maxlength="200" aria-label="Option ${i + 1}"></div>`).join('')}
  <button type="button" class="btn btn-small btn-ghost" data-rmq>Remove question</button></div>`;

async function edit(id, duplicate = false) {
  const d = id ? await loadQuest(id) : { quest: { status: 'draft', type: 'quiz', difficulty: 'easy', reward_tokens: 0 }, placeIds: new Set(), questions: [], code: '' };
  const q = d.quest, saveId = duplicate ? null : id;
  const html = `
    ${field('q-title', 'Title', duplicate ? q.title + ' (copy)' : q.title, 'required maxlength="200"')}
    ${field('q-desc', 'Description', q.description, '', 'textarea')}
    <div class="two-col">
      ${selectField('q-type', 'Type', ['quiz', 'code'].map(t => `<option ${t === q.type ? 'selected' : ''}>${t}</option>`).join(''))}
      ${selectField('q-diff', 'Difficulty', ['easy', 'medium', 'hard'].map(t => `<option ${t === q.difficulty ? 'selected' : ''}>${t}</option>`).join(''))}
      ${field('q-tokens', 'Token reward (0–500)', q.reward_tokens, 'type="number" min="0" max="500" step="1"')}
      ${selectField('q-char', 'Character reward', '<option value="">(none)</option>' + options(chars, 'id', 'name', q.reward_character_id))}
      ${field('q-start', 'Available from', toLocalInput(q.starts_at), 'type="datetime-local"')}
      ${field('q-end', 'Available until', toLocalInput(q.ends_at), 'type="datetime-local"')}
    </div>
    <div class="form-field"><label for="q-places">Destinations (Ctrl/Cmd-click for several)</label>
      <select id="q-places" multiple size="5">${placesRef.map(p => `<option value="${p.id}" ${d.placeIds.has(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div id="q-quiz"><h3>Questions</h3><div id="q-list">${d.questions.map(qBlock).join('')}</div>
      <button type="button" class="btn btn-small btn-ghost" id="q-addq">Add question</button></div>
    <div id="q-codebox">${field('q-code', 'Check-in code (min 4 chars, e.g. printed on a sign / QR)', d.code, 'maxlength="64"')}</div>
    ${selectField('q-status', 'Status', ['draft', 'published', 'archived'].map(s => `<option ${s === (duplicate ? 'draft' : q.status) ? 'selected' : ''}>${s}</option>`).join(''))}`;

  openEditor(saveId ? 'Edit quest' : 'New quest', html, () => save(saveId));
  const toggle = () => { const quiz = $('q-type').value === 'quiz'; $('q-quiz').hidden = !quiz; $('q-codebox').hidden = quiz; };
  toggle();
  $('q-type').onchange = toggle;
  $('q-addq').onclick = () => $('q-list').insertAdjacentHTML('beforeend', qBlock());
  $('q-list').onclick = e => { if (e.target.dataset.rmq !== undefined) e.target.closest('.q-block').remove(); };
}

function collectQuestions() {
  return [...document.querySelectorAll('#q-list .q-block')].map(b => ({
    prompt: b.querySelector('.q-prompt').value.trim(),
    options: [...b.querySelectorAll('.o-row')].map(r => ({ label: r.querySelector('.o-label').value.trim(), correct: r.querySelector('.o-correct').checked })),
  }));
}

async function save(id) {
  const type = $('q-type').value, status = $('q-status').value;
  const starts = fromLocalInput($('q-start').value), ends = fromLocalInput($('q-end').value);
  if (starts && ends && new Date(ends) <= new Date(starts)) throw new Error('End date must be after the start date.');
  const questions = type === 'quiz' ? collectQuestions() : [];
  const code = type === 'code' ? $('q-code').value.trim() : '';
  if (type === 'quiz') for (const q of questions) {
    if (!q.prompt || q.options.length < 2 || q.options.some(o => !o.label)) throw new Error('Every question needs text and at least two filled-in options.');
  }
  if (status === 'published') {
    if (type === 'quiz' && !questions.length) throw new Error('A quiz needs at least one question before publishing.');
    if (type === 'code' && code.length < 4) throw new Error('Enter a check-in code (min 4 characters) before publishing.');
    if (!document.querySelector('#q-places').selectedOptions.length) throw new Error('Link at least one destination before publishing.');
  }
  const row = {
    title: $('q-title').value.trim(), description: $('q-desc').value.trim() || null, type, difficulty: $('q-diff').value,
    reward_tokens: Math.max(0, Math.min(500, Number($('q-tokens').value) || 0)), reward_character_id: $('q-char').value || null,
    starts_at: starts, ends_at: ends, status: id ? status : 'draft',
  };
  const { data, error } = id ? await supabase.from('quests').update(row).eq('id', id).select('id').single()
                              : await supabase.from('quests').insert(row).select('id').single();
  if (error) throw error;
  const qid = data.id;
  await supabase.from('quest_places').delete().eq('quest_id', qid);
  const pids = [...$('q-places').selectedOptions].map(o => o.value);
  if (pids.length) { const { error: e1 } = await supabase.from('quest_places').insert(pids.map(place_id => ({ quest_id: qid, place_id }))); if (e1) throw e1; }
  const { error: e2 } = await supabase.rpc('admin_save_quest_content', { p_quest_id: qid, p_questions: questions, p_checkin_code: code });
  if (e2) throw e2;
  if (!id && status !== 'draft') { const { error: e3 } = await supabase.from('quests').update({ status }).eq('id', qid); if (e3) throw e3; }
  await refresh();
}

function editCharacter() {
  openEditor('New character', `${field('c-name', 'Name', '', 'required maxlength="80"')}
    ${field('c-desc', 'Description', '', '', 'textarea')}${field('c-img', 'Image URL', '', 'type="url"')}
    ${field('c-hint', 'Unlock hint', '', 'maxlength="200"')}
    ${selectField('c-rarity', 'Rarity', ['common', 'rare', 'epic'].map(r => `<option>${r}</option>`).join(''))}`, async () => {
    const { error } = await supabase.from('characters').insert({ name: $('c-name').value.trim(), description: $('c-desc').value.trim() || null,
      image_url: $('c-img').value.trim() || null, unlock_hint: $('c-hint').value.trim() || null, rarity: $('c-rarity').value });
    if (error) throw error;
    await renderQuests($('panel'));
  });
}
