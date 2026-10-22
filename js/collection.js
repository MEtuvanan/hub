import { supabase } from './supabase.js';
import { requireAuth } from './auth.js';
import { esc } from './places.js';

const $ = id => document.getElementById(id);

async function init() {
  if (!await requireAuth()) return;
  try {
    const [chars, owned, tx, bal] = await Promise.all([
      supabase.from('characters').select('id, name, description, image_url, rarity, unlock_hint').eq('status', 'active').order('name'),
      supabase.from('user_characters').select('character_id, acquired_at'),
      supabase.from('token_transactions').select('amount, source_type, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.rpc('my_token_balance'),
    ]);
    const err = chars.error || owned.error || tx.error || bal.error;
    if (err) throw err;

    const have = new Set(owned.data.map(o => o.character_id));
    $('balance').textContent = bal.data;
    $('chars').innerHTML = chars.data.length ? chars.data.map(c => {
      const mine = have.has(c.id);
      return `<article class="card quest-card">
        ${c.image_url && mine ? `<img src="${esc(c.image_url)}" alt="${esc(c.name)}" loading="lazy">` : ''}
        <h3>${mine ? esc(c.name) : 'Locked character'}</h3>
        <span class="tag ${mine ? 'tag-done' : ''}">${mine ? 'Collected' : 'Locked'}</span>
        <p>${mine ? esc(c.description) : esc(c.unlock_hint || 'Complete quests to unlock.')}</p></article>`;
    }).join('') : '<p class="muted">No characters have been added yet.</p>';
    $('history').innerHTML = tx.data.length
      ? tx.data.map(t => `<li>${new Date(t.created_at).toLocaleDateString()}: ${t.amount > 0 ? '+' : ''}${t.amount} tokens (${esc(t.source_type)})</li>`).join('')
      : '<li class="muted">No rewards yet.</li>';
    $('status').hidden = true;
    $('content').hidden = false;
  } catch (e) { console.error(e); $('status').textContent = 'Could not load your collection. Please try again.'; }
}
init();
