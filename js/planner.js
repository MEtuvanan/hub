import { supabase } from './supabase.js';
import { getSession } from './auth.js';
import { createMap, setMarkers } from './maps.js';

const form = document.getElementById('planner-form');
const btnGenerate = document.getElementById('btn-generate');
const statusBox = document.getElementById('planner-status');
const outputSection = document.getElementById('plan-output');
const planTitle = document.getElementById('plan-title');
const planSummary = document.getElementById('plan-summary');
const planMeta = document.getElementById('plan-meta');
const daysContainer = document.getElementById('days-container');
const btnSaveTrip = document.getElementById('btn-save-trip');
const mapEl = document.getElementById('planner-map');
const mapErr = document.getElementById('map-error');

let mapInstance = null;
let mapState = { markers: [] };
let currentPlan = null;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedInterests = Array.from(
    form.querySelectorAll('input[name="interest"]:checked')
  ).map(cb => cb.value);

  const preferences = {
    startingArea: document.getElementById('starting-area').value.trim(),
    days: parseInt(document.getElementById('trip-days').value, 10),
    travelStyle: document.getElementById('travel-style').value,
    pace: document.getElementById('pace').value,
    interests: selectedInterests,
    includeQuests: document.getElementById('include-quests').checked,
  };

  btnGenerate.disabled = true;
  statusBox.innerHTML = `
    <div class="card" style="text-align: center; padding: 2rem;">
      <div class="float" style="font-size: 2.5rem; margin-bottom: 0.5rem;">🧭</div>
      <h3>Consulting Bangkok Explorer AI...</h3>
      <p class="muted">Matching verified destinations, opening hours, and active quests...</p>
    </div>
  `;
  outputSection.hidden = true;

  try {
    // Call Supabase Edge Function: ai-trip-planner
    const { data, error } = await supabase.functions.invoke('ai-trip-planner', {
      body: preferences,
    });

    if (error) {
      throw error;
    }

    if (!data || !data.daily_plan || data.daily_plan.length === 0) {
      throw new Error('AI Planner returned an empty or unverified itinerary. Please try adjusting your preferences.');
    }

    currentPlan = data;
    renderPlan(data);
    statusBox.innerHTML = '';
  } catch (err) {
    console.error('Planner Error:', err);
    statusBox.innerHTML = `
      <div class="alert alert-error">
        <strong>Trip Planning Error:</strong> ${esc(err.message || 'Could not connect to AI service. Please ensure the Supabase Edge Function is deployed and try again.')}
        <br><small class="muted">Your entered preferences have been preserved. You can adjust and retry.</small>
      </div>
    `;
  } finally {
    btnGenerate.disabled = false;
  }
});

function renderPlan(plan) {
  planTitle.textContent = plan.trip_title || 'Your Bangkok Quest Itinerary';
  planSummary.textContent = plan.summary || '';
  planMeta.innerHTML = `<strong>Base:</strong> ${esc(plan.preferences?.startingArea || 'Bangkok')} | <strong>Pace:</strong> ${esc(plan.preferences?.pace || 'Moderate')}`;

  daysContainer.innerHTML = '';
  const allStops = [];

  plan.daily_plan.forEach((dayObj) => {
    const dayEl = document.createElement('article');
    dayEl.className = 'day-card';

    const stopsHtml = (dayObj.stops || []).map((stop) => {
      allStops.push(stop);
      const questBadge = stop.quests && stop.quests.length > 0
        ? `<div class="quest-pill">⚔️ ${esc(stop.quests[0].title)} (+${esc(stop.quests[0].reward_tokens)} tokens)</div>`
        : '';

      return `
        <div class="timeline-stop">
          <div class="stop-time">⏰ ${esc(stop.suggested_time)} (~${esc(stop.duration_minutes)} mins)</div>
          <h4 class="stop-title">
            <a href="/place?id=${encodeURIComponent(stop.place_id)}">${esc(stop.name)}</a>
            <span class="stop-badge">${esc(stop.district || 'Bangkok')}</span>
          </h4>
          <p>${esc(stop.why_recommended || stop.summary || '')}</p>
          ${stop.exploration_tips ? `<p class="muted">💡 <em>Tip: ${esc(stop.exploration_tips)}</em></p>` : ''}
          ${questBadge}
        </div>
      `;
    }).join('');

    dayEl.innerHTML = `
      <h3>Day ${esc(dayObj.day)}: ${esc(dayObj.theme)}</h3>
      <div style="margin-top: 1rem;">
        ${stopsHtml || '<p class="muted">No stops scheduled for this day.</p>'}
      </div>
    `;
    daysContainer.appendChild(dayEl);
  });

  outputSection.hidden = false;
  outputSection.scrollIntoView({ behavior: 'smooth' });

  // Render Map
  renderMap(allStops);
}

async function renderMap(stops) {
  if (!mapEl) return;
  mapErr.hidden = true;
  try {
    mapInstance ??= await createMap(mapEl);
    setMarkers(mapInstance, mapState, stops, (selected) => {
      location.href = `/place?id=${encodeURIComponent(selected.place_id || selected.id)}`;
    });
  } catch (err) {
    console.warn('Map initialization:', err);
    mapErr.textContent = 'Google Maps is currently unavailable. You can still click on destination names in the timeline to view details.';
    mapErr.hidden = false;
  }
}

// Save Trip to Supabase
btnSaveTrip.addEventListener('click', async () => {
  if (!currentPlan) return;
  const session = await getSession();
  if (!session) {
    location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
    return;
  }

  btnSaveTrip.disabled = true;
  btnSaveTrip.textContent = 'Saving...';

  try {
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .insert({
        user_id: session.user.id,
        title: currentPlan.trip_title,
        total_days: currentPlan.daily_plan.length,
        preferences: currentPlan.preferences,
      })
      .select('id')
      .single();

    if (tripErr) throw tripErr;

    const stopInserts = [];
    currentPlan.daily_plan.forEach((d) => {
      (d.stops || []).forEach((st, idx) => {
        stopInserts.push({
          trip_id: trip.id,
          place_id: st.place_id,
          day_number: d.day,
          stop_order: idx + 1,
          suggested_time: st.suggested_time,
          duration_minutes: st.duration_minutes,
          notes: st.exploration_tips || st.why_recommended,
        });
      });
    });

    if (stopInserts.length > 0) {
      const { error: stopsErr } = await supabase.from('trip_stops').insert(stopInserts);
      if (stopsErr) throw stopsErr;
    }

    btnSaveTrip.textContent = '✅ Saved to Profile!';
    setTimeout(() => {
      location.href = '/profile';
    }, 1200);
  } catch (err) {
    console.error('Save Trip Error:', err);
    alert('Failed to save trip: ' + (err.message || 'Please try again.'));
    btnSaveTrip.disabled = false;
    btnSaveTrip.textContent = '💾 Save to My Trips';
  }
});
