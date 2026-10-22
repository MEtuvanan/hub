import { supabase } from './supabase.js';

const status = document.getElementById('featured-status');
const box = document.getElementById('featured');
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

const { data, error } = await supabase
  .from('places').select('id, name, summary').eq('status', 'published').limit(3);

if (error) status.textContent = 'Could not load destinations right now.';
else if (!data.length) status.textContent = 'No destinations published yet.';
else {
  status.remove();
  box.innerHTML = data.map(p => `<article class="card"><h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p>
    <a href="/place?id=${encodeURIComponent(p.id)}">View details</a></article>`).join('');
}

// ---- Featured campaigns ----
import('./campaigns.js').then(async ({ listOpenCampaigns, myCampaignIds, joinCampaign }) => {
  const st = document.getElementById('campaigns-status');
  const el = document.getElementById('campaigns');
  try {
    const [list, joined] = await Promise.all([listOpenCampaigns(), myCampaignIds()]);
    if (!list.length) { st.textContent = 'No active campaigns right now.'; return; }
    st.remove();
    el.innerHTML = list.map(c => `<article class="card"><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p>
      ${c.ends_at ? `<p class="muted">Ends ${esc(new Date(c.ends_at).toLocaleDateString())}</p>` : ''}
      <button class="btn btn-small" data-join="${c.id}" ${joined.has(c.id) ? 'disabled' : ''}>${joined.has(c.id) ? 'Joined' : 'Join'}</button></article>`).join('');
    el.addEventListener('click', async e => {
      const id = e.target.dataset.join; if (!id) return;
      try { await joinCampaign(id); e.target.textContent = 'Joined'; e.target.disabled = true; }
      catch { location.href = '/login?next=/'; }
    });
  } catch (e) { console.error(e); st.textContent = 'Could not load campaigns right now.'; }
});
