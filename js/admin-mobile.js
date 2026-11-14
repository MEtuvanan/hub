// admin-mobile.js — read-only admin dashboard for local demo data.

import { esc, toast, confirmDialog } from './ui.js';
import {
  fetchPlaces, fetchQuests, readJSON, DEMO_QUESTS,
} from './mobile-data.js';
import { getTokens, formatNum } from './mobile-app.js';

const $ = id => document.getElementById(id);
const PREFIX = 'tc_mobile_';
const ACTIVITY_KEYS = ['tc_mobile_journal', 'tc_mobile_quest_log', 'tc_mobile_topups', 'tc_mobile_partner_apps'];

function collectData() {
  const out = {};
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .sort()
    .forEach(k => {
      try { out[k] = JSON.parse(localStorage.getItem(k)); }
      catch { out[k] = localStorage.getItem(k); }
    });
  return out;
}

async function renderKpis() {
  const box = $('adminKpis');
  if (!box) return;
  const [places, quests] = await Promise.all([fetchPlaces(), fetchQuests()]);
  const journals = readJSON('tc_mobile_journal', []);
  const topups = readJSON('tc_mobile_topups', []);
  const log = readJSON('tc_mobile_quest_log', []);
  const apps = readJSON('tc_mobile_partner_apps', []);
  const topupTokens = topups.reduce((sum, t) => sum + Number(t.tokens || 0), 0);

  box.innerHTML = `
    <div class="sup-kpi"><b>${formatNum(places.length)}</b><span>สถานที่ในระบบ</span><small>เดโม + ฐานข้อมูล</small></div>
    <div class="sup-kpi"><b>${formatNum(quests.length)}</b><span>เควสท์ทั้งหมด</span><small>เดโม + ฐานข้อมูล</small></div>
    <div class="sup-kpi"><b>${formatNum(getTokens())}</b><span>โทเคนในเครื่องนี้</span><small>กระเป๋าปัจจุบัน</small></div>
    <div class="sup-kpi"><b>${formatNum(journals.length)}</b><span>บันทึกไดอารี่</span><small>${log.length} เควสท์ใน log</small></div>
    <div class="sup-kpi"><b>${formatNum(topups.length)}</b><span>รายการเติมโทเคน</span><small>รวม ${formatNum(topupTokens)} โทเคน</small></div>
    <div class="sup-kpi"><b>${formatNum(apps.length)}</b><span>ใบสมัครพาร์ทเนอร์</span><small>จากอุปกรณ์นี้</small></div>`;
}

function activityRows() {
  const rows = [];
  readJSON('tc_mobile_journal', []).forEach(e => rows.push({
    at: Number(e.at) || 0,
    icon: 'book',
    label: `ไดอารี่: ${e.title || 'บันทึก'}`,
    value: e.province || 'ไม่ระบุจังหวัด',
  }));
  readJSON('tc_mobile_quest_log', []).forEach(l => {
    const quest = DEMO_QUESTS.find(q => q.id === l.questId);
    rows.push({
      at: Number(l.at) || 0,
      icon: 'quest',
      label: `เควสท์: ${quest?.title || l.questId}`,
      value: `+${Number(quest?.reward || 0)} โทเคน`,
    });
  });
  readJSON('tc_mobile_topups', []).forEach(t => rows.push({
    at: Number(t.at) || 0,
    icon: 'coin',
    label: `เติมโทเคน: ${t.label || 'แพ็กโทเคน'}`,
    value: `+${formatNum(t.tokens)}`,
  }));
  readJSON('tc_mobile_partner_apps', []).forEach(a => rows.push({
    at: Number(a.at) || 0,
    icon: 'store',
    label: `พาร์ทเนอร์: ${a.business}`,
    value: a.province || 'รอตรวจสอบ',
  }));
  return rows.sort((a, b) => b.at - a.at).slice(0, 8);
}

function renderActivity() {
  const box = $('adminActivity');
  if (!box) return;
  const rows = activityRows();
  if (!rows.length) {
    box.innerHTML = `<p class="app-tiny" style="margin:0;text-align:center">ยังไม่มีกิจกรรมในอุปกรณ์นี้</p>`;
    return;
  }
  box.innerHTML = `<div class="sup-table">${rows.map(row => {
    const when = row.at ? new Date(row.at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '—';
    return `<div class="sup-table__row">
      <span>${icon(row.icon, 14)} ${esc(row.label)}<br><small>${esc(when)}</small></span>
      <b>${esc(row.value)}</b>
    </div>`;
  }).join('')}</div>`;
}

function renderAdminState(session, profile) {
  const isAdmin = profile?.role === 'admin' || session?.isAdmin || session?.user?.email?.toLowerCase() === 'ttt@gmail.com';
  if (!isAdmin) {
    $('adminBadge').textContent = 'DEMO';
    return false;
  }
  $('adminBadge').textContent = 'ADMIN';
  $('adminHeroTitle').textContent = `สวัสดี ${profile?.display_name || 'ผู้ดูแล'}`;
  $('adminHeroText').textContent = 'คุณเข้าสู่ระบบในฐานะผู้ดูแล — ตรวจสอบข้อมูลและกิจกรรมได้ด้านล่าง';
  const login = $('adminLogin');
  if (login) login.hidden = true;
  return true;
}

async function adminLogin(event) {
  event.preventDefault();
  const email = ($('adminEmail')?.value || '').trim();
  const password = $('adminPassword')?.value || '';
  const err = $('adminError');
  const fail = text => {
    if (err) { err.hidden = false; err.textContent = text; }
  };
  if (err) err.hidden = true;
  if (!email || !password) return fail('กรุณากรอกอีเมลและรหัสผ่าน');

  const btn = $('adminSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ…'; }
  try {
    const auth = await import('./auth.js');
    const { error } = await auth.signIn(email, password);
    if (error) throw error;
    const session = await auth.getSession();
    const profile = await auth.getProfile();
    const isAdmin = profile?.role === 'admin' || session?.isAdmin || session?.user?.email?.toLowerCase() === 'ttt@gmail.com';
    if (!isAdmin) {
      await auth.signOut();
      fail('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ');
      return;
    }
    toast('เข้าสู่ระบบผู้ดูแลแล้ว');
    renderAdminState(session, profile);
    renderKpis();
  } catch (error) {
    fail(error?.message || 'เข้าสู่ระบบไม่สำเร็จ');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
  }
}

function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    tokens: getTokens(),
    storage: collectData(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travel-challenge-demo-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('ส่งออกข้อมูลแล้ว');
}

async function resetData() {
  const ok = await confirmDialog({
    title: 'รีเซ็ตข้อมูลเดโม?',
    message: 'โทเคน ไดอารี่ ประวัติการเติม และคอลเลกชันในเครื่องนี้จะถูกล้าง ไม่สามารถย้อนกลับได้',
    confirmLabel: 'รีเซ็ตข้อมูล',
    danger: true,
  });
  if (!ok) return;
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k));
  toast('รีเซ็ตข้อมูลเดโมแล้ว');
  setTimeout(() => location.reload(), 400);
}

async function boot() {
  renderActivity();
  await renderKpis();

  try {
    const auth = await import('./auth.js');
    const session = await auth.getSession();
    if (session) {
      const profile = await auth.getProfile();
      renderAdminState(session, profile);
    }
  } catch (error) {
    console.warn('admin-mobile auth unavailable', error);
  }

  $('adminLoginForm')?.addEventListener('submit', adminLogin);
  $('adminExport')?.addEventListener('click', exportData);
  $('adminReset')?.addEventListener('click', resetData);
  window.addEventListener('tc-tokens', renderKpis);
}

document.addEventListener('DOMContentLoaded', boot);
