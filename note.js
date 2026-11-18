const id = new URLSearchParams(location.search).get('id');
const list = document.getElementById('list');
const countEl = document.getElementById('count');
const clearBtn = document.getElementById('clear');
let lines = [{ t: '' }]; // [{t: string, c?: boolean}]  c definido => es checkbox

const hasCheck = (l) => typeof l.c === 'boolean';
const persist = () => window.api.saveLines(id, lines);

function render(focusIdx, caret = 0) {
  list.innerHTML = '';
  lines.forEach((l, i) => list.append(makeRow(l, i)));
  if (focusIdx != null) focusRow(focusIdx, caret);
  updateCount();
}

// Marcar => la tarea baja al final. Desmarcar => sube justo encima de las hechas.
function setChecked(l, value, caret) {
  const wasFocused = caret != null;
  lines.splice(lines.indexOf(l), 1);
  l.c = value;
  if (value) {
    lines.push(l);
  } else {
    const firstDone = lines.findIndex((x) => x.c === true);
    if (firstDone < 0) lines.push(l);
    else lines.splice(firstDone, 0, l);
  }
  render(wasFocused ? lines.indexOf(l) : null, caret);
  persist();
}

function updateCount() {
  const total = lines.filter(hasCheck).length;
  const done = lines.filter((l) => l.c === true).length;
  countEl.textContent = total ? `${done}/${total}` : '';
  clearBtn.hidden = done === 0;
}

function clearDone() {
  const done = lines.filter((l) => l.c === true).length;
  if (!done) return;
  lines = lines.filter((l) => l.c !== true);
  if (!lines.length) lines = [{ t: '' }];
  render();
  persist();
}

function focusRow(i, caret = 0) {
  const el = list.children[i]?.querySelector('.text');
  if (!el) return;
  el.focus();
  const range = document.createRange();
  const node = el.firstChild;
  if (node) range.setStart(node, Math.min(caret, node.length));
  else range.setStart(el, 0);
  range.collapse(true);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function makeRow(l, i) {
  const row = document.createElement('div');
  row.className = 'row' + (l.c ? ' done' : '');

  if (hasCheck(l)) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = l.c;
    cb.addEventListener('change', () => setChecked(l, cb.checked));
    row.append(cb);
  }

  const t = document.createElement('div');
  t.className = 'text';
  t.contentEditable = 'plaintext-only';
  t.spellcheck = false;
  t.textContent = l.t;

  t.addEventListener('input', () => {
    l.t = t.textContent;
    // "[] " o "[ ] " al inicio convierte la línea en checkbox
    const m = !hasCheck(l) && l.t.match(/^\[\s?\]\s/);
    if (m) {
      l.t = l.t.slice(m[0].length);
      l.c = false;
      render(i, 0);
    }
    persist();
  });

  t.addEventListener('keydown', (e) => onKey(e, i, t));
  row.append(t);
  return row;
}

function caretOffset() {
  const sel = getSelection();
  return sel.rangeCount ? sel.getRangeAt(0).startOffset : 0;
}

function onKey(e, i, el) {
  const l = lines[i];

  // Enter: nueva línea (hereda checkbox). En checkbox vacío, lo quita.
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (hasCheck(l) && l.t === '') {
      delete l.c;
      render(i, 0);
    } else {
      const at = caretOffset();
      const rest = l.t.slice(at);
      l.t = l.t.slice(0, at);
      const next = { t: rest };
      if (hasCheck(l)) next.c = false;
      lines.splice(i + 1, 0, next);
      render(i + 1, 0);
    }
    persist();
    return;
  }

  // Backspace al inicio: quita checkbox, o une con la línea anterior
  if (e.key === 'Backspace' && caretOffset() === 0 && getSelection().isCollapsed) {
    if (hasCheck(l)) {
      e.preventDefault();
      delete l.c;
      render(i, 0);
      persist();
    } else if (i > 0) {
      e.preventDefault();
      const prev = lines[i - 1];
      const joinAt = prev.t.length;
      prev.t += l.t;
      lines.splice(i, 1);
      render(i - 1, joinAt);
      persist();
    }
    return;
  }

  // ⌘L: alterna checkbox en la línea actual
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    const at = caretOffset();
    if (hasCheck(l)) delete l.c;
    else l.c = false;
    render(i, at);
    persist();
    return;
  }

  // ⌘Enter: marca/desmarca el checkbox
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && hasCheck(l)) {
    e.preventDefault();
    setChecked(l, !l.c, caretOffset());
    return;
  }

  // Flechas entre líneas
  if (e.key === 'ArrowUp' && i > 0 && isOnFirstVisualLine(el)) {
    e.preventDefault();
    focusRow(i - 1, Math.min(caretOffset(), lines[i - 1].t.length));
  }
  if (e.key === 'ArrowDown' && i < lines.length - 1 && isOnLastVisualLine(el)) {
    e.preventDefault();
    focusRow(i + 1, Math.min(caretOffset(), lines[i + 1].t.length));
  }
}

function caretRect() {
  const sel = getSelection();
  if (!sel.rangeCount) return null;
  const r = sel.getRangeAt(0).cloneRange();
  r.collapse(true);
  const rects = r.getClientRects();
  return rects.length ? rects[0] : null;
}
function isOnFirstVisualLine(el) {
  const c = caretRect();
  return !c || c.top - el.getBoundingClientRect().top < 18;
}
function isOnLastVisualLine(el) {
  const c = caretRect();
  return !c || el.getBoundingClientRect().bottom - c.bottom < 18;
}

// Click en el espacio vacío: foco en la última línea
list.addEventListener('mousedown', (e) => {
  if (e.target === list) {
    e.preventDefault();
    focusRow(lines.length - 1, lines[lines.length - 1].t.length);
  }
});

// Colores
function setColor(c) {
  document.body.className = c;
}
document.querySelectorAll('.dot').forEach((b) =>
  b.addEventListener('click', () => {
    setColor(b.dataset.color);
    window.api.setColor(id, b.dataset.color);
  })
);
clearBtn.addEventListener('click', clearDone);
document.getElementById('add').addEventListener('click', () => window.api.newNote());
document.getElementById('del').addEventListener('click', () => window.api.deleteNote(id));

// Carga inicial
window.api.getNote(id).then((n) => {
  if (!n) return;
  setColor(n.color);
  lines = n.lines && n.lines.length ? n.lines : [{ t: '' }];
  render(0, lines[0].t.length);
});
