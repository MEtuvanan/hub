// help-mobile.js — searchable FAQ for the mobile app.

import { esc } from './ui.js';
import { icon, iconFor } from './icons.js';

const $ = id => document.getElementById(id);

const FAQ = [
  { cat: 'start', icon: 'navigate', q: 'เริ่มใช้งานแอปอย่างไร', a: 'เปิดหน้าแผนที่หน้าหลักเพื่อดูตัวละครและสถานที่ใกล้เคียง ใช้แถบเมนูล่าง 5 ปุ่มเพื่อสลับไปหน้าเควสท์ ค้นหา ร้านค้า และเมนูอื่น ๆ ระบบใช้งานได้ทันทีในโหมดนักท่องเที่ยวโดยไม่ต้องสมัคร' },
  { cat: 'start', icon: 'compass', q: 'แอปนี้ต่างจากเวอร์ชันคอมพิวเตอร์อย่างไร', a: 'เวอร์ชันมือถือถูกออกแบบมาให้ใช้มือเดียว มีเมนูด้านล่าง การ์ดปัดซ้ายขวา และแผนที่ AR แบบเต็มจอ ทุกหน้าของเว็บมีไฟล์ -mobile.html แยกสำหรับมือถือ' },
  { cat: 'quest', icon: 'quest', q: 'เควสท์คืออะไรและทำอย่างไร', a: 'เควสท์คือภารกิจสั้น ๆ ณ สถานที่ท่องเที่ยว เช่น ถ่ายรูป ตอบคำถาม หรือเดินสำรวจ เปิดหน้ารายละเอียดสถานที่ เลื่อนลงมาเลือกเควสท์ แล้วกรอกรหัสเช็คอินจากป้ายกิจกรรมเพื่อรับโทเคน' },
  { cat: 'quest', icon: 'heart', q: 'ปัดการ์ดซ้ายหรือขวาคืออะไร', a: 'ในหน้าเควสท์และหน้าค้นหา โหมดการ์ดจะให้คุณปัดขวาเพื่อบันทึกสิ่งที่ชอบ และปัดซ้ายเพื่อข้าม คุณสามารถกดปุ่มย้อนกลับเพื่อดูการ์ดก่อนหน้าได้' },
  { cat: 'quest', icon: 'trophy', q: 'ทำเควสท์ซ้ำได้ไหม', a: 'เควสท์แต่ละรายการให้รางวัลได้ครั้งเดียว แต่คุณยังกลับไปเที่ยวสถานที่เดิมได้ และสามารถเก็บตราประทับจังหวัดกับเหรียญตราอื่น ๆ ได้อีก' },
  { cat: 'ar', icon: 'map', q: 'ตัวละครบนแผนที่เดินอย่างไร', a: 'แตะหมุดสถานที่แล้วเลือก “เดินไป” ตัวละครจะเดินไปตามเส้นทางอัตโนมัติ คุณสามารถกดปุ่มกลับจุดเริ่มต้น (Recenter) เพื่อให้ตัวละครกลับมาที่จุดเดิม' },
  { cat: 'ar', icon: 'user', q: 'เปลี่ยนตัวละครหรือชุดได้ที่ไหน', a: 'เปิดหน้าโปรไฟล์เพื่อแต่งชุด เสื้อ กางเกง รองเท้า หมวก และสีต่าง ๆ หรือซื้อตัวละครใหม่ได้ที่ร้านค้า ตัวละครที่สวมอยู่จะแสดงบนแผนที่ทันที' },
  { cat: 'ar', icon: 'pin', q: 'ทำไมตำแหน่งของฉันไม่ขึ้น', a: 'แอปต้องได้รับอนุญาตเข้าถึงตำแหน่งจากเบราว์เซอร์ หากไม่อนุญาต ระบบจะใช้ตำแหน่งกึ่งกลางของจังหวัดที่เลือกแทน และยังค้นหาและวางแผนทริปได้ตามปกติ' },
  { cat: 'token', icon: 'coin', q: 'ได้โทเคนจากไหนบ้าง', a: 'รับจากดาวนำทางประจำวัน (+25) การทำเควสท์ (60–160) และกิจกรรมในแอป โทเคนใช้ปลดล็อกตัวละคร สิทธิพิเศษ และของสะสม' },
  { cat: 'token', icon: 'coin', q: 'เติมโทเคนจริงหรือไม่', a: 'หน้านี้เป็นโหมดตัวอย่าง การเติมโทเคนจะเพิ่มยอดทันทีโดยไม่มีการตัดเงินจริง เหมาะสำหรับทดลองระบบก่อนเชื่อมต่อผู้ให้บริการชำระเงิน' },
  { cat: 'token', icon: 'backpack', q: 'ซื้อตัวละครแล้วแต่ยังไม่เห็นบนแผนที่', a: 'หลังซื้อ ให้กด “สวมชุดนี้” ในร้านค้า หรือกลับไปที่โปรไฟล์แล้วเลือกตัวละครนั้น ตัวละครบนแผนที่จะเปลี่ยนตามชุดที่บันทึกไว้' },
  { cat: 'account', icon: 'lock', q: 'ต้องเข้าสู่ระบบไหม', a: 'ไม่บังคับ คุณใช้งานแผนที่ เควสท์ และร้านค้าในโหมดนักท่องเที่ยวได้ แต่การซิงก์โปรไฟล์กับอุปกรณ์อื่นต้องเข้าสู่ระบบด้วยอีเมลหรือ Google' },
  { cat: 'account', icon: 'user', q: 'แก้ชื่อที่แสดงอย่างไร', a: 'เข้าโปรไฟล์แล้วกดแก้ไขชื่อ หรือเข้าสู่ระบบเพื่อใช้ชื่อจากบัญชีของคุณ ชื่อจะแสดงบนแถบโปรไฟล์ด้านบนและในเมนูอื่น ๆ' },
  { cat: 'account', icon: 'trash', q: 'ล้างข้อมูลเดโมได้อย่างไร', a: 'ข้อมูลเดโม เช่น โทเคน ไดอารี่ และประวัติการเติม ถูกเก็บใน localStorage ของเบราว์เซอร์ คุณสามารถล้างได้จากหน้าผู้ดูแลระบบ (สำหรับผู้ดูแล) หรือตั้งค่าเว็บไซต์ของเบราว์เซอร์' },
];

const CATS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'start', label: 'เริ่มต้น' },
  { id: 'quest', label: 'เควสท์' },
  { id: 'ar', label: 'แผนที่ AR' },
  { id: 'token', label: 'โทเคน' },
  { id: 'account', label: 'บัญชี' },
];

let cat = 'all';
let term = '';

function matches(item) {
  if (cat !== 'all' && item.cat !== cat) return false;
  if (!term) return true;
  return `${item.q} ${item.a} ${item.emoji}`.toLowerCase().includes(term.toLowerCase());
}

function renderCats() {
  const box = $('helpCats');
  if (!box) return;
  box.innerHTML = CATS.map(c => `
    <button class="g-chip ${c.id === cat ? 'g-chip--mint' : ''}" type="button" data-cat="${c.id}" aria-pressed="${c.id === cat}">
      ${esc(c.label)}
    </button>`).join('');
  box.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      cat = btn.dataset.cat;
      renderCats();
      renderFaq();
    });
  });
}

function renderFaq() {
  const box = $('helpFaq');
  if (!box) return;
  const rows = FAQ.filter(matches);
  $('helpCount').textContent = rows.length ? `คำถามที่พบบ่อย (${rows.length})` : 'ไม่พบคำถาม';
  if (!rows.length) {
    box.innerHTML = `
      <div class="sup-card" style="text-align:center;padding:24px 14px">
        <div style="font-size:34px">${icon('search', 30)}</div>
        <p class="app-sub" style="margin-top:6px">ลองใช้คำอื่น หรือเลือกหมวด “ทั้งหมด”</p>
        <button class="g-btn g-btn--sm g-btn--ghost" type="button" id="helpReset" style="margin-top:10px">ล้างตัวกรอง</button>
      </div>`;
    box.querySelector('#helpReset')?.addEventListener('click', () => {
      cat = 'all';
      term = '';
      if ($('helpSearch')) $('helpSearch').value = '';
      renderCats();
      renderFaq();
    });
    return;
  }
  box.innerHTML = rows.map(item => `
    <details>
      <summary><span>${icon(item.icon || 'info', 15)} ${esc(item.q)}</span></summary>
      <p>${esc(item.a)}</p>
    </details>`).join('');
}

function boot() {
  renderCats();
  renderFaq();
  const input = $('helpSearch');
  const clear = $('helpClear');
  input?.addEventListener('input', () => {
    term = input.value.trim();
    if (clear) clear.hidden = !term;
    renderFaq();
  });
  clear?.addEventListener('click', () => {
    term = '';
    input.value = '';
    clear.hidden = true;
    renderFaq();
    input.focus();
  });
}

document.addEventListener('DOMContentLoaded', boot);
