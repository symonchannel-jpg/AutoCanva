const $ = (id) => document.getElementById(id);

// --- DOM refs ---
const canvas = $('canvas');
const canvasWrap = $('canvasWrap');
const bgImg = $('bgImg');
const gridOverlay = canvas.querySelector('.grid-overlay');
const emptyHint = canvas.querySelector('.empty-hint');
const toastEl = $('toast');

// Toolbar inputs
const winW = $('winW');
const winH = $('winH');
const canW = $('canW');
const canH = $('canH');
const gridSize = $('gridSize');
const snap = $('snap');
const showGrid = $('showGrid');
const loadRef = $('loadRef');
const opacity = $('opacity');
const clearRef = $('clearRef');
const exportBtn = $('exportBtn');

// Toolbox
const addButtons = document.querySelectorAll('[data-add]');

// Panel
const panel = document.querySelector('.panel');

// --- Persistence timer ---
let persistTimer = null;

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => store.persist(), 400);
}

// --- Toast ---
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

let lastPanelSelectionId = null;

// --- Render ---
function renderApp() {
  const s = store.state;

  // Canvas size
  canvas.style.width = s.canvasWidth + 'px';
  canvas.style.height = s.canvasHeight + 'px';

  // Grid overlay
  canvas.classList.toggle('show-grid', s.showGrid);
  canvas.style.setProperty('--grid-size', s.gridSize + 'px');

  // Background image (in a dedicated <img> so opacity doesn't affect grid overlay)
  if (s.backgroundImageURL) {
    bgImg.src = s.backgroundImageURL;
    bgImg.style.display = '';
    bgImg.style.opacity = s.backgroundOpacity;
  } else {
    bgImg.src = '';
    bgImg.style.display = 'none';
  }

  // Toolbar values (avoid loops)
  if (document.activeElement !== winW) winW.value = s.windowWidth;
  if (document.activeElement !== winH) winH.value = s.windowHeight;
  if (document.activeElement !== canW) canW.value = s.canvasWidth;
  if (document.activeElement !== canH) canH.value = s.canvasHeight;
  if (document.activeElement !== gridSize) gridSize.value = s.gridSize;
  snap.checked = s.snapEnabled;
  showGrid.checked = s.showGrid;

  // Update empty hint
  emptyHint.style.display = s.elements.length === 0 ? '' : 'none';

  // Rebuild element DOM
  const existing = canvas.querySelectorAll('.el');
  const existingMap = new Map();
  existing.forEach(el => existingMap.set(el.dataset.id, el));

  s.elements.forEach(el => {
    let div = existingMap.get(el.id);
    if (!div) {
      div = document.createElement('div');
      div.className = 'el';
      div.dataset.id = el.id;
      div.addEventListener('mousedown', onElementMouseDown);
      div.addEventListener('dblclick', onElementDblClick);
      canvas.appendChild(div);
    } else {
      existingMap.delete(el.id);
    }
    div.className = 'el el--' + el.type + (s.selectedId === el.id ? ' el--selected' : '');
    div.style.left = el.x + 'px';
    div.style.top = el.y + 'px';
    div.style.width = el.width + 'px';
    div.style.height = el.height + 'px';
    if (el.type === 'icon' && el.label.length <= 2) {
      div.style.fontSize = Math.min(el.height, el.width) * 0.6 + 'px';
    } else {
      div.style.fontSize = '';
    }
    const displayLabel = el.label || (el.type === 'image' ? '*' : el.type === 'icon' ? '' : '');
    div.textContent = el.type === 'rect' ? '' : displayLabel;
  });

  // Remove stale elements
  existingMap.forEach(div => div.remove());

  // Rebuild panel only when selection changes (not on every field edit)
  if (s.selectedId !== lastPanelSelectionId) {
    lastPanelSelectionId = s.selectedId;
    renderPanel();
  }

  // Toolbar label for reference image
  if (s.backgroundImageName) {
    loadRef.textContent = s.backgroundImageName;
  } else {
    loadRef.textContent = 'Load reference…';
  }
}

// --- Panel ---
function renderPanel() {
  const s = store.state;
  const el = s.elements.find(e => e.id === s.selectedId);
  if (!el) {
    panel.innerHTML = '<p class="panel-empty">No element selected.</p>';
    return;
  }

  let html = '<div class="row"><label>Type <select id="pType">';
  ['button', 'text', 'image', 'rect', 'icon'].forEach(t => {
    html += `<option value="${t}"${t === el.type ? ' selected' : ''}>${t}</option>`;
  });
  html += '</select></label><label>ID <input id="pId" value="' + el.id + '" disabled /></label></div>';

  html += '<label>Label <input id="pLabel" value="' + escHtml(el.label) + '" /></label>';

  html += '<div class="row">';
  html += '<label>X <input id="pX" type="number" value="' + el.x + '" /></label>';
  html += '<label>Y <input id="pY" type="number" value="' + el.y + '" /></label>';
  html += '</div><div class="row">';
  html += '<label>W <input id="pW" type="number" value="' + el.width + '" min="8" /></label>';
  html += '<label>H <input id="pH" type="number" value="' + el.height + '" min="8" /></label>';
  html += '</div>';

  html += '<label>Comment <textarea id="pComment" rows="2">' + escHtml(el.comment || '') + '</textarea></label>';

  html += '<div class="row" style="margin-top:4px">';
  html += '<button id="pDup">Duplicate</button>';
  html += '<button id="pDel" class="danger">Delete</button>';
  html += '</div>';

  panel.innerHTML = html;

  panel.querySelector('#pType').addEventListener('change', (e) => {
    store.setElementField(el.id, 'type', e.target.value);
  });
  panel.querySelector('#pLabel').addEventListener('input', (e) => {
    store.setElementField(el.id, 'label', e.target.value);
    if (window.renderApp) window.renderApp();
  });
  panel.querySelector('#pX').addEventListener('input', (e) => {
    store.setElementField(el.id, 'x', parseInt(e.target.value, 10));
  });
  panel.querySelector('#pY').addEventListener('input', (e) => {
    store.setElementField(el.id, 'y', parseInt(e.target.value, 10));
  });
  panel.querySelector('#pW').addEventListener('input', (e) => {
    store.setElementField(el.id, 'width', parseInt(e.target.value, 10));
  });
  panel.querySelector('#pH').addEventListener('input', (e) => {
    store.setElementField(el.id, 'height', parseInt(e.target.value, 10));
  });
  panel.querySelector('#pComment').addEventListener('input', (e) => {
    store.setElementField(el.id, 'comment', e.target.value);
  });
  panel.querySelector('#pDup').addEventListener('click', () => {
    store.duplicateElement(el.id);
  });
  panel.querySelector('#pDel').addEventListener('click', () => {
    store.removeElement(el.id);
  });
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Element drag ---
let dragState = null;

function onElementMouseDown(e) {
  if (e.button !== 0) return;
  const id = e.currentTarget.dataset.id;
  const el = store.state.elements.find(ev => ev.id === id);
  if (!el) return;

  store.selectElement(id);

  const rect = canvas.getBoundingClientRect();
  dragState = {
    id,
    startX: el.x,
    startY: el.y,
    offsetX: e.clientX - rect.left - el.x,
    offsetY: e.clientY - rect.top - el.y,
  };
  e.preventDefault();
}

document.addEventListener('mousemove', (e) => {
  if (!dragState) return;
  const s = store.state;
  const rect = canvas.getBoundingClientRect();
  let nx = e.clientX - rect.left - dragState.offsetX;
  let ny = e.clientY - rect.top - dragState.offsetY;
  if (s.snapEnabled && s.gridSize > 0) {
    nx = Math.round(nx / s.gridSize) * s.gridSize;
    ny = Math.round(ny / s.gridSize) * s.gridSize;
  }
  const el = store.state.elements.find(ev => ev.id === dragState.id);
  if (!el) return;
  const cx = Math.max(0, Math.min(nx, s.canvasWidth - el.width));
  const cy = Math.max(0, Math.min(ny, s.canvasHeight - el.height));
  el.x = cx;
  el.y = cy;
  const div = canvas.querySelector(`[data-id="${dragState.id}"]`);
  if (div) {
    div.style.left = cx + 'px';
    div.style.top = cy + 'px';
  }
});

document.addEventListener('mouseup', () => {
  if (!dragState) return;
  const el = store.state.elements.find(ev => ev.id === dragState.id);
  if (el) {
    store.persist();
  }
  dragState = null;
});

// --- Double-click to edit label inline ---
function onElementDblClick(e) {
  const id = e.currentTarget.dataset.id;
  const el = store.state.elements.find(ev => ev.id === id);
  if (!el) return;
  if (el.type === 'image' || el.type === 'rect') return;
  const div = e.currentTarget;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = el.label;
  input.className = 'el-inline-edit';
  input.style.width = Math.max(40, el.width - 8) + 'px';
  input.style.height = (el.height - 8) + 'px';
  div.textContent = '';
  div.appendChild(input);
  input.focus();
  input.select();
  input.addEventListener('blur', finishInlineEdit);
  input.addEventListener('keydown', (ke) => {
    if (ke.key === 'Enter') { input.blur(); }
    if (ke.key === 'Escape') { input.value = el.label; input.blur(); }
  });
  function finishInlineEdit() {
    const val = input.value.trim();
    if (val !== '') store.setElementField(id, 'label', val);
    input.removeEventListener('blur', finishInlineEdit);
    store.emit();
  }
}

// --- Canvas click to deselect ---
canvas.addEventListener('mousedown', (e) => {
  if (e.target === canvas || e.target === gridOverlay || e.target === emptyHint) {
    store.deselect();
  }
});

// --- Keyboard ---
document.addEventListener('keydown', (e) => {
  const s = store.state;
  if (!s.selectedId) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const el = s.elements.find(ev => ev.id === s.selectedId);
  if (!el) return;

  if (e.key === 'Escape') {
    store.deselect();
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    store.removeElement(s.selectedId);
    return;
  }

  if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    store.duplicateElement(s.selectedId);
    return;
  }

  let dx = 0, dy = 0;
  if (e.key === 'ArrowUp') dy = -1;
  else if (e.key === 'ArrowDown') dy = 1;
  else if (e.key === 'ArrowLeft') dx = -1;
  else if (e.key === 'ArrowRight') dx = 1;
  else return;

  e.preventDefault();
  if (e.shiftKey) {
    dx *= s.gridSize;
    dy *= s.gridSize;
  }
  store.moveElement(s.selectedId, el.x + dx, el.y + dy);
});

// --- Toolbar events ---
function setupToolbar() {
  winW.addEventListener('change', () => store.setWindowWidth(parseInt(winW.value, 10)));
  winH.addEventListener('change', () => store.setWindowHeight(parseInt(winH.value, 10)));

  canW.addEventListener('change', () => store.setCanvasWidth(parseInt(canW.value, 10)));
  canH.addEventListener('change', () => store.setCanvasHeight(parseInt(canH.value, 10)));

  gridSize.addEventListener('change', () => store.setGridSize(parseInt(gridSize.value, 10)));

  snap.addEventListener('change', () => store.setSnapEnabled(snap.checked));
  showGrid.addEventListener('change', () => store.setShowGrid(showGrid.checked));

  loadRef.addEventListener('click', async () => {
    if (window.autocanva && window.autocanva.pickImage) {
      const result = await window.autocanva.pickImage();
      if (result && result.url) {
        const img = new Image();
        img.onload = () => {
          const w = Math.min(img.naturalWidth, 4000);
          const h = Math.min(img.naturalHeight, 4000);
          store.setCanvasWidth(w);
          store.setCanvasHeight(h);
          store.setBackgroundImage(result.url, result.name || '');
          toast('Canvas resized to ' + w + 'x' + h);
        };
        img.onerror = () => {
          store.setBackgroundImage(result.url, result.name || '');
          toast('Image loaded, could not read size');
        };
        img.src = result.url;
      }
    }
  });

  opacity.addEventListener('input', () => store.setBackgroundOpacity(parseInt(opacity.value, 10)));
  clearRef.addEventListener('click', () => {
    store.clearBackgroundImage();
    toast('Reference cleared');
  });

  exportBtn.addEventListener('click', () => {
    const prompt = store.exportPrompt();
    navigator.clipboard.writeText(prompt).then(() => {
      toast('Exported to clipboard');
    }).catch(() => {
      toast('Could not copy to clipboard');
    });
  });

  addButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add;
      store.addElement(type);
      toast('Added ' + type);
    });
  });
}

// --- Load initial state from last project ---
async function loadInitialState() {
  if (window.autocanva && window.autocanva.loadProject) {
    try {
      const data = await window.autocanva.loadProject();
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.state) {
          Object.assign(store.state, parsed.state);
        }
      }
    } catch (e) {
      console.log('No saved project, starting fresh');
    }
  }
}

// --- Menu events from main process ---
function setupMenuEvents() {
  if (!window.autocanva || !window.autocanva.onMenuEvent) return;
  window.autocanva.onMenuEvent(async (action) => {
    if (action === 'new') {
      await window.autocanva.newProject();
      store.state.elements = [];
      store.state.selectedId = null;
      store.state.backgroundImageURL = '';
      store.state.backgroundImageName = '';
      store.emit();
      toast('New project');
    } else if (action === 'open') {
      const data = await window.autocanva.openProject();
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.state) {
            Object.assign(store.state, parsed.state);
            store.emit();
            toast('Project opened');
          }
        } catch (_) { toast('Could not open project'); }
      }
    } else if (action === 'saveAs') {
      const exportData = {
        appVersion: '0.1.0',
        schemaVersion: 1,
        state: { ...store.state, backgroundImageURL: '', selectedId: null },
      };
      const name = await window.autocanva.saveProjectAs(JSON.stringify(exportData, null, 2));
      if (name) toast('Saved as ' + name);
    } else if (action === 'export') {
      exportBtn.click();
    }
  });
}

// --- Init ---
async function init() {
  window.renderApp = renderApp;
  setupToolbar();
  setupMenuEvents();
  await loadInitialState();
  renderApp();
  toast('AutoCanva ready');
}

init();
