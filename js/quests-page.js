import { listQuests, getMyProgress, getQuestQuestions, startQuest, completeQuest } from './quests.js';
import { getSession } from './auth.js';
import { esc } from './places.js';

const $ = id => document.getElementById(id);
let quests = [], progress = new Map(), session = null;

const stateOf = q => progress.get(q.id) ?? 'new';

function render() {
  const want = $('state').value;
  const rows = quests.filter(q => !want || stateOf(q) === want);
  $('status').textContent = rows.length ? `${rows.length} quest(s)` : 'No quests match your filters.';
  $('list').innerHTML = rows.map(q => {
    const st = stateOf(q);
    const places = q.quest_places.map(p => p.places?.name).filter(Boolean).map(esc).join(', ');
    const label = st === 'completed' ? 'View' : st === 'in_progress' ? 'Continue' : 'Start';
    return `<article class="card quest-card">
      <h2>${esc(q.title)}</h2>
      <div><span class="tag">${esc(q.difficulty)}</span><span class="tag">${esc(q.type)}</span>
        ${st === 'completed' ? '<span class="tag tag-done">Completed</span>' : ''}</div>
      <p>${esc(q.description)}</p>
      ${places ? `<p class="muted">Where: ${places}</p>` : ''}
      <p>Reward: ${q.reward_tokens} tokens${q.characters ? ` + character “${esc(q.characters.name)}”` : ''}</p>
      <button class="btn" data-id="${q.id}">${label}</button></article>`;
  }).join('');
}

async function load() {
  $('status').textContent = 'Loading…';
  try {
    [quests, progress] = await Promise.all([
      listQuests({ difficulty: $('difficulty').value, type: $('type').value }),
      getMyProgress(),
    ]);
    render();
  } catch (e) { console.error(e); $('status').textContent = 'Could not load quests. Please try again.'; }
}

const msg = (t, ok) => { $('dlg-msg').className = 'alert ' + (ok ? 'alert-ok' : 'alert-error'); $('dlg-msg').textContent = t; };

async function openQuest(id) {
  const q = quests.find(x => x.id === id);
  $('dlg-title').textContent = q.title;
  $('dlg-desc').textContent = q.description ?? '';
  $('dlg-msg').className = ''; $('dlg-msg').textContent = '';
  const form = $('quest-form');
  form.innerHTML = '';
  $('dlg').showModal();

  if (progress.get(id) === 'completed') { msg('You have already completed this quest.', true); return; }
  if (!session) { form.innerHTML = '<a class="btn" href="/login?next=/quests">Sign in to play</a>'; return; }

  try {
    await startQuest(id);
    progress.set(id, 'in_progress');
    if (q.type === 'quiz') {
      const qs = await getQuestQuestions(id);
      if (!qs.length) { msg('This quest has no questions yet.'); return; }
      form.innerHTML = qs.map(qq => `<fieldset><legend>${esc(qq.prompt)}</legend>
        ${qq.quest_options.map(o => `<label class="opt"><input type="radio" name="${qq.id}" value="${o.id}" required> ${esc(o.label)}</label>`).join('')}
        </fieldset>`).join('') + '<button class="btn" type="submit">Submit answers</button>';
    } else {
      form.innerHTML = `<div class="form-field"><label for="code">Check-in code (found on site)</label>
        <input id="code" autocomplete="off" required></div><button class="btn" type="submit">Check in</button>`;
    }
    form.onsubmit = async e => {
      e.preventDefault();
      const btn = form.querySelector('button'); btn.disabled = true;
      try {
        const body = q.type === 'quiz'
          ? { answers: Object.fromEntries(new FormData(form)) }
          : { code: $('code').value };
        const r = await completeQuest(id, body);
        if (r.ok) {
          progress.set(id, 'completed');
          msg(r.already_completed ? 'Already completed.' : `Quest complete! +${r.tokens} tokens.`, true);
          form.innerHTML = ''; render();
        } else {
          msg(q.type === 'quiz' ? `${r.correct} of ${r.total} correct. Try again.` : 'That code is not correct.');
          btn.disabled = false;
        }
      } catch (err) { console.error(err); msg('Something went wrong. Please try again.'); btn.disabled = false; }
    };
  } catch (e) { console.error(e); msg('This quest is not available right now.'); }
}

$('list').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) openQuest(b.dataset.id); });
$('filters').addEventListener('submit', e => e.preventDefault());
$('difficulty').addEventListener('change', load);
$('type').addEventListener('change', load);
$('state').addEventListener('change', render);

session = await getSession();
load();
