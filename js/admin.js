import { supabase } from './supabase.js';
import { getSession, getProfile } from './auth.js';
import { $, esc, table } from './admin-ui.js';
import { renderPlaces } from './admin-places.js';
import { renderQuests } from './admin-quests.js';
import { renderCampaigns } from './admin-campaigns.js';

const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

async function renderStats(panel) {
  panel.innerHTML = '<p class="muted">Loading…</p>';
  const { data: s, error } = await supabase.rpc('admin_stats');
  if (error) throw error;
  const tile = (label, v) => `<div class="card stat"><b>${v}</b>${label}</div>`;
  panel.innerHTML = `<div class="stat-grid">
    ${tile('Published destinations', s.published_places)}${tile('Published quests', s.published_quests)}
    ${tile('Active campaigns', s.active_campaigns)}${tile('Quest starts', s.quest_starts)}
    ${tile('Quest completions', s.quest_completions)}${tile('Completion rate', pct(s.quest_completions, s.quest_starts))}</div>
    <p class="muted">“—” means no data yet (nothing to divide by), not zero.</p>
    <h2>Quests</h2>${table(['Quest', 'Starts', 'Completions', 'Rate'],
      s.quests.map(q => [esc(q.title), q.starts, q.completions, pct(q.completions, q.starts)]), 'No quests yet.')}
    <h2>Campaign participation</h2>${table(['Campaign', 'Participants'],
      s.campaigns.map(c => [esc(c.title), c.participants]), 'No campaigns yet.')}
    <h2>Popular destinations (by completed quests)</h2>${table(['Destination', 'Completions'],
      s.places.map(p => [esc(p.name), p.completions]), 'No completed quests yet.')}`;
}

async function renderAudit(panel) {
  panel.innerHTML = '<p class="muted">Loading…</p>';
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  panel.innerHTML = '<h2>Recent admin actions</h2>' + table(['When', 'Action', 'Table', 'Item', 'Actor'],
    data.map(a => [new Date(a.created_at).toLocaleString(), esc(a.action), esc(a.table_name),
      esc(a.details?.title ?? a.row_id ?? ''), esc((a.actor_id ?? '').slice(0, 8))]), 'No actions recorded yet.');
}

const TABS = { stats: renderStats, places: renderPlaces, quests: renderQuests, campaigns: renderCampaigns, audit: renderAudit };

async function show(tab) {
  document.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  try { await TABS[tab]($('panel')); }
  catch (e) { console.error(e); $('panel').innerHTML = '<p class="alert alert-error">Something went wrong loading this section.</p>'; }
}

async function init() {
  const session = await getSession();
  if (!session) { location.href = '/login?next=/admin'; return; }
  const profile = await getProfile();
  // UI gate only; every query below is enforced by RLS / admin-only RPCs.
  if (profile?.role !== 'admin') { $('gate').textContent = 'You do not have access to this page.'; return; }
  $('gate').hidden = true;
  $('app').hidden = false;
  document.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  show('stats');
}
init();
