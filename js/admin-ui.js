import { esc } from './places.js';
export { esc };

export const $ = id => document.getElementById(id);
export const options = (rows, valueKey, labelKey, selected = null) =>
  rows.map(r => `<option value="${esc(r[valueKey])}" ${String(r[valueKey]) === String(selected) ? 'selected' : ''}>${esc(r[labelKey])}</option>`).join('');

export function field(id, label, value = '', attrs = '', tag = 'input') {
  const v = esc(value ?? '');
  return `<div class="form-field"><label for="${id}">${label}</label>` +
    (tag === 'textarea' ? `<textarea id="${id}" rows="4" ${attrs}>${v}</textarea>` : `<input id="${id}" value="${v}" ${attrs}>`) + '</div>';
}

export function selectField(id, label, optionsHtml, attrs = '') {
  return `<div class="form-field"><label for="${id}">${label}</label><select id="${id}" ${attrs}>${optionsHtml}</select></div>`;
}

// datetime-local <-> ISO helpers
export const toLocalInput = ts => ts ? new Date(new Date(ts) - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
export const fromLocalInput = v => v ? new Date(v).toISOString() : null;

export function table(headers, rows, empty = 'Nothing here yet.') {
  if (!rows.length) return `<p class="muted">${empty}</p>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function editorMsg(text, ok = false) {
  $('ed-msg').className = text ? 'alert ' + (ok ? 'alert-ok' : 'alert-error') : '';
  $('ed-msg').textContent = text;
}

export function openEditor(title, html, onSubmit) {
  $('ed-title').textContent = title;
  $('ed-body').innerHTML = html;
  editorMsg('');
  $('ed-form').onsubmit = async e => {
    e.preventDefault();
    $('ed-save').disabled = true;
    try { await onSubmit(); $('editor').close(); }
    catch (err) { console.error(err); editorMsg(err.message || 'Save failed.'); }
    $('ed-save').disabled = false;
  };
  $('editor').showModal();
}

$('ed-cancel').addEventListener('click', () => $('editor').close());

export const confirmAction = msg => window.confirm(msg);
