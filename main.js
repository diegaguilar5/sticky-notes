const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, dialog, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ---- Configuración ----
const SHORTCUT_TOGGLE = 'CommandOrControl+Shift+P';
const SHORTCUT_NEW = 'CommandOrControl+Shift+N';
const COLORS = ['yellow', 'pink', 'blue', 'green'];

// ---- Persistencia ----
const dataFile = path.join(app.getPath('userData'), 'notes.json');
let notes = []; // [{id, color, bounds, lines:[{t, c?}]}]
const windows = new Map(); // id -> BrowserWindow
let visible = true;
let tray = null;

function load() {
  try {
    notes = JSON.parse(fs.readFileSync(dataFile, 'utf8')).notes || [];
  } catch {
    notes = [];
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}
function saveNow() {
  try {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify({ notes }, null, 2));
  } catch (e) {
    console.error('No se pudo guardar:', e);
  }
}

// ---- Ventanas ----
function createNote(data) {
  const win = new BrowserWindow({
    x: data.bounds.x,
    y: data.bounds.y,
    width: data.bounds.width,
    height: data.bounds.height,
    minWidth: 180,
    minHeight: 120,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('note.html', { query: { id: data.id } });
  win.once('ready-to-show', () => {
    if (visible) win.show();
  });

  const saveBounds = () => {
    if (win.isDestroyed()) return;
    data.bounds = win.getBounds();
    save();
  };
  win.on('moved', saveBounds);
  win.on('resized', saveBounds);

  windows.set(data.id, win);
  return win;
}

function newNote() {
  const { workArea } = screen.getPrimaryDisplay();
  const offset = (notes.length % 8) * 28;
  const data = {
    id: crypto.randomUUID(),
    color: COLORS[notes.length % COLORS.length],
    bounds: {
      x: workArea.x + workArea.width - 300 - offset,
      y: workArea.y + 60 + offset,
      width: 260,
      height: 300,
    },
    lines: [{ t: '' }],
  };
  notes.push(data);
  save();
  if (!visible) showAll();
  const win = createNote(data);
  win.once('ready-to-show', () => win.focus());
}

function showAll() {
  visible = true;
  for (const w of windows.values()) w.show();
  // devuelve el foco a la última nota
  const last = [...windows.values()].pop();
  if (last) last.focus();
}

function hideAll() {
  visible = false;
  for (const w of windows.values()) w.hide();
  if (process.platform === 'darwin') app.hide();
}

function toggle() {
  const anyVisible = [...windows.values()].some((w) => w.isVisible());
  anyVisible ? hideAll() : showAll();
}

function deleteNote(id) {
  const win = windows.get(id);
  windows.delete(id);
  notes = notes.filter((n) => n.id !== id);
  saveNow();
  if (win && !win.isDestroyed()) win.destroy();
}

// ---- IPC ----
ipcMain.handle('note:get', (_e, id) => notes.find((n) => n.id === id) || null);

ipcMain.on('note:save', (_e, id, lines) => {
  const n = notes.find((x) => x.id === id);
  if (n) {
    n.lines = lines;
    save();
  }
});

ipcMain.on('note:color', (_e, id, color) => {
  const n = notes.find((x) => x.id === id);
  if (n && COLORS.includes(color)) {
    n.color = color;
    save();
  }
});

ipcMain.on('note:new', () => newNote());

ipcMain.on('note:delete', (e, id) => {
  const n = notes.find((x) => x.id === id);
  if (!n) return;
  const hasContent = n.lines.some((l) => l.t.trim() !== '');
  if (hasContent) {
    const win = BrowserWindow.fromWebContents(e.sender);
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Cancelar', 'Borrar'],
      defaultId: 0,
      cancelId: 0,
      message: '¿Borrar esta nota?',
      detail: 'No se puede deshacer.',
    });
    if (choice !== 1) return;
  }
  deleteNote(id);
});

// ---- Tray ----
function createTray() {
  // Ícono de 16x16 generado en código (un cuadradito), marcado como template para macOS
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inside = x >= 2 && x <= 13 && y >= 2 && y <= 13;
      const fold = x + y >= 24 && x >= 9 && y >= 9; // esquina doblada
      buf[i] = 0;
      buf[i + 1] = 0;
      buf[i + 2] = 0;
      buf[i + 3] = inside && !fold ? 255 : 0;
    }
  }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('Sticky Notes');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Nueva nota', accelerator: 'Cmd+Shift+N', click: newNote },
      { label: 'Mostrar / ocultar', accelerator: 'Cmd+Shift+P', click: toggle },
      { type: 'separator' },
      {
        label: 'Iniciar con el Mac',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() },
    ])
  );
}

// ---- Arranque ----
app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();
  load();
  createTray();

  if (notes.length === 0) newNote();
  else notes.forEach(createNote);

  if (!globalShortcut.register(SHORTCUT_TOGGLE, toggle)) console.error('No se pudo registrar', SHORTCUT_TOGGLE);
  if (!globalShortcut.register(SHORTCUT_NEW, newNote)) console.error('No se pudo registrar', SHORTCUT_NEW);
});

app.on('window-all-closed', (e) => e.preventDefault()); // sigue viva en la barra de menú
app.on('before-quit', saveNow);
app.on('will-quit', () => globalShortcut.unregisterAll());
