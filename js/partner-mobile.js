// partner-mobile.js — partner application form stored locally (demo).

import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import { fetchPlaces, readJSON, writeJSON } from './mobile-data.js';
import { confetti } from './mobile-app.js';

const $ = id => document.getElementById(id);
const APPS_KEY = 'tc_mobile_partner_apps';

const CATEGORY_LABEL = {
  food: 'ร้านอาหาร / คาเฟ่',
  stay: 'ที่พัก / โฮมสเตย์',
  activity: 'กิจกรรม / ทัวร์',
  shop: 'ร้านขายของที่ระลึก',
  other: 'อื่น ๆ',
};

async function fillProvinces() {
  const sel = $('ptProvince');
  if (!sel) return;
  try {
    const places = await fetchPlaces();
    const provinces = [...new Set(places.map(p => p.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
    sel.innerHTML = `<option value="">เลือกจังหวัด</option>` +
      provinces.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  } catch {
    sel.innerHTML = `<option value="">เลือกจังหวัด</option><option value="กรุงเทพมหานคร">กรุงเทพมหานคร</option>`;
  }
}

function showSuccess(business) {
  const form = $('partnerForm');
  const section = $('partnerFormSection');
  if (!form || !section) return;
  form.hidden = true;
  section.querySelector('#ptSuccess')?.remove();
  const card = document.createElement('div');
  card.id = 'ptSuccess';
  card.className = 'sup-success';
  card.innerHTML = `
    <div class="sup-success__badge">${icon('check', 20)}</div>
    <h2>ส่งใบสมัครแล้ว</h2>
    <p>ทีมงานจะตรวจสอบข้อมูลของ “${esc(business)}” และติดต่อกลับภายใน 3 วันทำการ</p>
    <div class="sup-actions" style="width:100%;max-width:300px">
      <button class="g-btn g-btn--ghost" type="button" id="ptAgain">ส่งอีกรายการ</button>
      <a class="g-btn g-btn--mint" href="/help-mobile.html">ดูคู่มือ</a>
    </div>`;
  form.insertAdjacentElement('beforebegin', card);
  card.querySelector('#ptAgain')?.addEventListener('click', () => {
    card.remove();
    form.hidden = false;
    form.reset();
    form.querySelector('input')?.focus();
  });
}

function submit(event) {
  event.preventDefault();
  const business = ($('ptBusiness')?.value || '').trim();
  const name = ($('ptName')?.value || '').trim();
  const phone = ($('ptPhone')?.value || '').trim();
  const email = ($('ptEmail')?.value || '').trim();
  const province = $('ptProvince')?.value || '';
  const category = $('ptCategory')?.value || '';
  const message = ($('ptMessage')?.value || '').trim();
  const err = $('ptError');

  const fail = text => {
    if (err) { err.hidden = false; err.textContent = text; }
    toast(text, 'error');
  };
  if (!err) return;
  err.hidden = true;

  if (!business) return fail('กรุณากรอกชื่อร้านหรือสถานที่');
  if (!name) return fail('กรุณากรอกชื่อผู้ติดต่อ');
  if (!/^[0-9+\-\s()]{8,20}$/.test(phone)) return fail('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('อีเมลไม่ถูกต้อง');
  if (!province) return fail('กรุณาเลือกจังหวัด');
  if (!category) return fail('กรุณาเลือกประเภทธุรกิจ');

  const apps = readJSON(APPS_KEY, []);
  apps.unshift({
    id: `pt-${Date.now()}`,
    at: Date.now(),
    business, name, phone, email, province, category, message,
    status: 'pending',
  });
  writeJSON(APPS_KEY, apps.slice(0, 20));
  confetti(24);
  toast('ส่งใบสมัครพาร์ทเนอร์แล้ว');
  renderApps();
  showSuccess(business);
}

function renderApps() {
  const box = $('partnerApps');
  if (!box) return;
  const apps = readJSON(APPS_KEY, []);
  if (!apps.length) {
    box.innerHTML = `<div class="sup-card" style="text-align:center"><p class="app-tiny" style="margin:0">ยังไม่มีใบสมัคร — กรอกแบบฟอร์มด้านบนเพื่อเริ่มต้น</p></div>`;
    return;
  }
  box.innerHTML = `<div class="sup-list">${apps.map(app => `
    <div class="sup-row" style="align-items:flex-start">
      <span class="sup-row__ico">${icon('store', 16)}</span>
      <span class="sup-row__body">
        <strong>${esc(app.business)}</strong>
        <span>${esc(CATEGORY_LABEL[app.category] || app.category)} · ${esc(app.province)}</span>
        <span>${new Date(app.at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} · ${icon('clock', 10)} รอตรวจสอบ</span>
      </span>
      <button class="sup-del" type="button" data-del="${esc(app.id)}" aria-label="ลบใบสมัคร">${icon('trash', 12)}</button>
    </div>`).join('')}</div>`;

  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      writeJSON(APPS_KEY, readJSON(APPS_KEY, []).filter(a => a.id !== btn.dataset.del));
      toast('ลบใบสมัครแล้ว');
      renderApps();
    });
  });
}

async function boot() {
  await fillProvinces();
  renderApps();
  $('partnerForm')?.addEventListener('submit', submit);
}

document.addEventListener('DOMContentLoaded', boot);
