import { getProfile, signOut, getSession } from './auth.js';

const NAV = [
  ['/explore', 'Explore'], ['/quests', 'Quests'], ['/collection', 'Collection'],
  ['/journal', 'Journal'], ['/calendar', 'Calendar'], ['/planner', 'AI Planner'],
];

function renderNav() {
  const el = document.getElementById('site-nav');
  if (!el) return;
  const here = location.pathname.replace(/\.html$/, '');
  el.innerHTML = `
    <a class="brand" href="/">Travel <span>&amp;</span> Challenge</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Menu">☰</button>
    <ul id="nav-links" class="nav-links">
      ${NAV.map(([h, l]) => `<li><a href="${h}" ${here === h ? 'aria-current="page"' : ''}>${l}</a></li>`).join('')}
      <li id="nav-auth"></li>
    </ul>`;
  const btn = el.querySelector('.nav-toggle');
  btn.addEventListener('click', () => {
    const open = el.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

async function renderAuth() {
  const slot = document.getElementById('nav-auth');
  if (!slot) return;
  const session = await getSession();
  if (!session) { slot.innerHTML = '<a class="btn btn-small" href="/login">Sign in</a>'; return; }
  const p = await getProfile();
  slot.innerHTML = `${p?.role === 'admin' ? '<a href="/admin">Admin</a> ' : ''}
    <a href="/profile">${(p?.display_name || 'Profile').replace(/[<>&"]/g, '')}</a>
    <button class="btn btn-small btn-ghost" id="logout">Sign out</button>`;
  document.getElementById('logout').addEventListener('click', async () => {
    await signOut(); location.href = '/';
  });
}

renderNav();
renderAuth();
