// login-mobile.js — mobile auth: sign in, sign up, reset, and Google OAuth.

import { esc, toast } from './ui.js';
import { icon } from './icons.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let mode = 'signin';
let next = '/index-mobile.html';

function showError(message) {
  const box = $('authError');
  if (!box) return;
  box.hidden = !message;
  box.textContent = message || '';
}

function thaiError(raw) {
  const msg = String(raw || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (msg.includes('email not confirmed')) return 'โปรดยืนยันอีเมลก่อนเข้าสู่ระบบ';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ';
  if (msg.includes('password should be')) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if (msg.includes('rate limit')) return 'พยายามบ่อยเกินไป กรุณารอสักครู่';
  if (msg.includes('network') || msg.includes('fetch')) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต';
  return raw || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

function setMode(nextMode) {
  mode = nextMode;
  const signup = mode === 'signup';
  const reset = mode === 'reset';
  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    const active = btn.dataset.authTab === (reset ? 'signin' : mode);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  if ($('nameField')) $('nameField').hidden = !signup;
  if ($('authPassword')) {
    $('authPassword').closest('.g-field').hidden = reset;
    $('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  }
  if ($('authForgot')) $('authForgot').hidden = reset;
  if ($('authSubmit')) $('authSubmit').textContent = reset ? 'ส่งลิงก์รีเซ็ต' : signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  if ($('authTitle')) $('authTitle').textContent = reset ? 'รีเซ็ตรหัสผ่าน' : signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  if ($('authSub')) $('authSub').textContent = reset
    ? 'กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่'
    : signup ? 'สร้างบัญชีเพื่อเก็บความคืบหน้าการเดินทาง' : 'ซิงก์โปรไฟล์ โทเคน และประวัติการเดินทางของคุณ';
  if ($('authHeroIco')) $('authHeroIco').innerHTML = icon(reset ? 'lock' : signup ? 'compass' : 'lock', 24);
  if ($('authHeroTitle')) $('authHeroTitle').textContent = reset ? 'ตั้งรหัสผ่านใหม่' : signup ? 'เริ่มการผจญภัย' : 'ยินดีต้อนรับกลับ นักสำรวจ';
  if ($('authHeroText')) $('authHeroText').textContent = reset
    ? 'เราจะส่งลิงก์ปลอดภัยไปยังอีเมลของคุณ'
    : signup ? 'สมัครฟรีและรับโทเคนเริ่มต้นสำหรับเควสท์แรก' : 'เข้าสู่ระบบเพื่อให้ความคืบหน้าติดไปกับทุกอุปกรณ์';
  showError('');
}

function setBusy(busy) {
  const btn = $('authSubmit');
  if (!btn) return;
  btn.disabled = busy;
  btn.textContent = busy ? 'กำลังดำเนินการ…' : mode === 'reset' ? 'ส่งลิงก์รีเซ็ต' : mode === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
}

async function handleSubmit(event) {
  event.preventDefault();
  showError('');
  const email = ($('authEmail')?.value || '').trim();
  const password = $('authPassword')?.value || '';
  const name = ($('authName')?.value || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('กรุณากรอกอีเมลให้ถูกต้อง');
    return;
  }
  if (mode !== 'reset' && password.length < 6) {
    showError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    return;
  }
  if (mode === 'signup' && !name) {
    showError('กรุณากรอกชื่อที่แสดง');
    return;
  }

  setBusy(true);
  try {
    const auth = await import('./auth.js');
    if (mode === 'reset') {
      const { error } = await auth.resetPassword(email);
      if (error) throw error;
      showError('');
      toast('ส่งลิงก์รีเซ็ตแล้ว ตรวจสอบอีเมลของคุณ');
      setMode('signin');
      return;
    }
    if (mode === 'signup') {
      const { data, error } = await auth.signUp(email, password, name);
      if (error) throw error;
      if (data?.session) {
        toast('สมัครสมาชิกสำเร็จ');
        location.replace(next);
      } else {
        toast('สมัครแล้ว — โปรดยืนยันอีเมลก่อนเข้าสู่ระบบ');
        setMode('signin');
      }
      return;
    }
    const { error } = await auth.signIn(email, password);
    if (error) throw error;
    toast('เข้าสู่ระบบสำเร็จ');
    location.replace(next);
  } catch (error) {
    showError(thaiError(error?.message || error));
  } finally {
    setBusy(false);
  }
}

async function google() {
  showError('');
  const btn = $('authGoogle');
  if (btn) btn.disabled = true;
  try {
    const auth = await import('./auth.js');
    const { error } = await auth.signInWithOAuth('google', '/login-mobile.html');
    if (error) throw error;
  } catch (error) {
    showError(thaiError(error?.message || error));
    if (btn) btn.disabled = false;
  }
}

function renderSignedIn(session, profile) {
  const area = $('authArea');
  if (!area) return;
  const name = profile?.display_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'นักสำรวจ';
  const email = session?.user?.email || session?.user?.user_metadata?.email || 'บัญชีนักสำรวจ';
  $('authTitle').textContent = 'บัญชีของฉัน';
  $('authSub').textContent = 'คุณเข้าสู่ระบบอยู่แล้ว';
  $('authHeroIco').innerHTML = icon('check-circle', 24);
  $('authHeroTitle').textContent = `สวัสดี ${name}`;
  $('authHeroText').textContent = 'ความคืบหน้าของคุณถูกซิงก์กับบัญชีนี้';
  area.innerHTML = `
    <div class="sup-user">
      <span class="app-profile-avatar">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : icon('user', 20)}</span>
      <div class="sup-user__body"><strong>${esc(name)}</strong><span>${esc(email)}</span></div>
      <span class="g-chip g-chip--mint">${icon('check', 11)} ออนไลน์</span>
    </div>
    <a class="g-btn g-btn--mint g-btn--block" href="${esc(next)}">ไปที่แอป</a>
    <a class="g-btn g-btn--ghost g-btn--block" href="/profile-mobile.html">แก้ไขโปรไฟล์</a>
    <button class="g-btn g-btn--ghost g-btn--block" type="button" id="authSignOut">ออกจากระบบ</button>
    <p class="sup-auth__foot">เข้าใช้งานในโหมดนักท่องเที่ยวได้ที่ <a href="/index-mobile.html">แผนที่หน้าหลัก</a></p>`;
  $('authSignOut')?.addEventListener('click', async () => {
    try {
      const auth = await import('./auth.js');
      await auth.signOut();
      toast('ออกจากระบบแล้ว');
      setTimeout(() => location.reload(), 300);
    } catch {
      toast('ออกจากระบบไม่สำเร็จ', 'error');
    }
  });
}

async function boot() {
  try {
    const auth = await import('./auth.js');
    next = auth.safeNext(params.get('next'), '/index-mobile.html');
    if (params.get('expired') === '1') showError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
    const session = await auth.getSession();
    if (session) {
      const profile = await auth.getProfile();
      renderSignedIn(session, profile);
      return;
    }
  } catch (error) {
    showError('ระบบเข้าสู่ระบบยังไม่พร้อมใช้งานในขณะนี้');
    console.warn('login-mobile auth unavailable', error);
  }

  setMode('signin');
  $('authForm')?.addEventListener('submit', handleSubmit);
  $('authGoogle')?.addEventListener('click', google);
  $('authForgot')?.addEventListener('click', () => setMode(mode === 'reset' ? 'signin' : 'reset'));
  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.authTab));
  });
}

document.addEventListener('DOMContentLoaded', boot);
