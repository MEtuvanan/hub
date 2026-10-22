import { supabase } from './supabase.js';
import { requireAuth, signOut } from './auth.js';

const authStatus = document.getElementById('auth-status');
const content = document.getElementById('profile-content');
const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const statTokens = document.getElementById('stat-tokens');
const statQuests = document.getElementById('stat-quests');
const statChars = document.getElementById('stat-chars');
const statDiaries = document.getElementById('stat-diaries');
const statTrips = document.getElementById('stat-trips');
const tripsList = document.getElementById('trips-list');
const badgesList = document.getElementById('badges-list');
const completedQuestsList = document.getElementById('completed-quests');
const btnSignout = document.getElementById('btn-signout');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadProfile() {
  const session = await requireAuth();
  if (!session) return;

  const uid = session.user.id;

  try {
    // Parallel queries for user profile, tokens, quests, characters, diaries, trips, achievements
    const [
      profileRes,
      tokensRes,
      questsRes,
      charsRes,
      diariesRes,
      tripsRes,
      achievementsRes,
      userAchRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('token_transactions').select('amount').eq('user_id', uid),
      supabase.from('user_quests').select('quest_id, completed_at, quests(title, reward_tokens, type)').eq('user_id', uid).eq('status', 'completed'),
      supabase.from('user_characters').select('character_id, acquired_at, characters(name, rarity, image_url)').eq('user_id', uid),
      supabase.from('travel_diaries').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('trips').select('id, title, total_days, created_at, trip_stops(id, place_id, suggested_time, places(name))').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('achievements').select('*'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', uid),
    ]);

    const p = profileRes.data || {};
    userName.textContent = p.display_name || session.user.email?.split('@')[0] || 'Adventurer';
    userRole.textContent = p.role === 'admin' ? '🛡️ Explorer Administrator' : '🎒 Explorer Traveler';

    // 1. Tokens
    const totalTokens = (tokensRes.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    statTokens.textContent = totalTokens;

    // 2. Completed Quests
    const completedQuests = questsRes.data || [];
    statQuests.textContent = completedQuests.length;

    if (completedQuests.length === 0) {
      completedQuestsList.innerHTML = '<li class="muted">You have not completed any quests yet. <a href="/quests">Find a quest &rarr;</a></li>';
    } else {
      completedQuestsList.innerHTML = completedQuests.map(uq => `
        <li style="margin-bottom: 0.5rem;">
          <strong>${esc(uq.quests?.title || 'Quest')}</strong> 
          <span class="muted">— Completed on ${esc(new Date(uq.completed_at).toLocaleDateString())} (+${esc(uq.quests?.reward_tokens || 0)} tokens)</span>
        </li>
      `).join('');
    }

    // 3. Characters
    const chars = charsRes.data || [];
    statChars.textContent = chars.length;

    // 4. Diaries count
    statDiaries.textContent = diariesRes.count || 0;

    // 5. Trips
    const trips = tripsRes.data || [];
    statTrips.textContent = trips.length;

    if (trips.length === 0) {
      tripsList.innerHTML = '<p class="muted">No saved trips yet. <a href="/planner">Plan an adventure with AI &rarr;</a></p>';
    } else {
      tripsList.innerHTML = trips.map(t => {
        const stopsCount = t.trip_stops?.length || 0;
        const placeNames = (t.trip_stops || []).map(s => s.places?.name).filter(Boolean).slice(0, 3).join(', ');
        return `
          <article class="trip-card" data-trip-id="${esc(t.id)}">
            <div>
              <h3 style="margin: 0 0 0.25rem 0;">${esc(t.title)}</h3>
              <p class="muted" style="margin: 0; font-size: 0.9rem;">
                ${esc(t.total_days)} days • ${esc(stopsCount)} stops ${placeNames ? `(${esc(placeNames)}...)` : ''}
              </p>
              <small class="muted">Saved on ${esc(new Date(t.created_at).toLocaleDateString())}</small>
            </div>
            <div>
              <button class="btn btn-small btn-ghost" data-del-trip="${esc(t.id)}">Delete</button>
            </div>
          </article>
        `;
      }).join('');

      tripsList.querySelectorAll('[data-del-trip]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const tripId = e.target.dataset.delTrip;
          if (!confirm('Are you sure you want to delete this saved trip?')) return;
          const { error: delErr } = await supabase.from('trips').delete().eq('id', tripId);
          if (delErr) {
            alert('Failed to delete: ' + delErr.message);
          } else {
            e.target.closest('.trip-card')?.remove();
            statTrips.textContent = Math.max(0, parseInt(statTrips.textContent, 10) - 1);
          }
        });
      });
    }

    // 6. Achievements
    const myAchIds = new Set((userAchRes.data || []).map(a => a.achievement_id));
    const achievements = achievementsRes.data || [];

    if (achievements.length === 0) {
      badgesList.innerHTML = '<p class="muted">No badges configured.</p>';
    } else {
      badgesList.innerHTML = achievements.map(ach => {
        const unlocked = myAchIds.has(ach.id);
        return `
          <div class="badge-card ${unlocked ? 'unlocked' : ''}">
            <div class="badge-icon">${unlocked ? '🏅' : '🔒'}</div>
            <h4 style="margin: 0 0 0.25rem 0;">${esc(ach.title)}</h4>
            <p style="font-size: 0.85rem; margin: 0;" class="muted">${esc(ach.description)}</p>
            ${unlocked ? '<small style="color: var(--leaf-dark); font-weight: 700;">Unlocked</small>' : '<small class="muted">Locked</small>'}
          </div>
        `;
      }).join('');
    }

    authStatus.remove();
    content.hidden = false;
  } catch (err) {
    console.error('Profile Load Error:', err);
    authStatus.textContent = 'Could not load profile. Please refresh or try again.';
  }
}

btnSignout.addEventListener('click', async () => {
  await signOut();
  location.href = '/';
});

loadProfile();
