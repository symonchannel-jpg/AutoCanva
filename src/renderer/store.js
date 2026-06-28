const store = {
  state: {
    windowWidth: 1280,
    windowHeight: 720,
    canvasWidth: 800,
    canvasHeight: 600,
    gridSize: 20,
    snapEnabled: true,
    showGrid: true,
    backgroundOpacity: 0.7,
    backgroundImageURL: '',
    backgroundImageName: '',
    elements: [],
    selectedId: null,
    zoom: 1,
  },

  _idCounter: 0,

  onChange: null,

  emit() {
    if (this.onChange) this.onChange();
  },

  clampedSize(value, min, max) {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < min) return min;
    if (n > max) return max;
    return n;
  },

  setCanvasWidth(v) {
    this.state.canvasWidth = this.clampedSize(v, 50, 4000);
    this.state.elements.forEach(el => { el.x = Math.min(el.x, this.state.canvasWidth - el.width); });
    this.emit();
  },
  setCanvasHeight(v) {
    this.state.canvasHeight = this.clampedSize(v, 50, 4000);
    this.state.elements.forEach(el => { el.y = Math.min(el.y, this.state.canvasHeight - el.height); });
    this.emit();
  },
  setWindowWidth(v) { this.state.windowWidth = this.clampedSize(v, 320, 8000); this.emit(); },
  setWindowHeight(v) { this.state.windowHeight = this.clampedSize(v, 240, 8000); this.emit(); },
  setGridSize(v) { this.state.gridSize = this.clampedSize(v, 4, 200); this.emit(); },
  setSnapEnabled(v) { this.state.snapEnabled = !!v; this.emit(); },
  setShowGrid(v) { this.state.showGrid = !!v; this.emit(); },
  setZoom(v) { this.state.zoom = Math.max(0.1, Math.min(5, Math.round(v * 10) / 10)); this.emit(); },
  setBackgroundOpacity(v) { this.state.backgroundOpacity = this.clampedSize(v, 0, 100) / 100; this.emit(); },
  setBackgroundImage(url, name) { this.state.backgroundImageURL = url; this.state.backgroundImageName = name || ''; this.emit(); },
  clearBackgroundImage() { this.state.backgroundImageURL = ''; this.state.backgroundImageName = ''; this.emit(); },

  _nextId(type) {
    this._idCounter += 1;
    return `${type}_${String(this._idCounter).padStart(2, '0')}`;
  },

  addElement(type) {
    const defaults = { button: [96, 32], text: [120, 28], image: [128, 128], rect: [160, 80], icon: [48, 48] };
    const [dw, dh] = defaults[type] || [80, 24];
    const el = {
      id: this._nextId(type),
      type,
      label: type === 'icon' ? '*' : type.charAt(0).toUpperCase() + type.slice(1),
      x: Math.round((this.state.canvasWidth - dw) / 2),
      y: Math.round((this.state.canvasHeight - dh) / 2),
      width: dw,
      height: dh,
      comment: '',
    };
    const overlap = this.state.elements.filter(e => Math.abs(e.x - el.x) < 16 && Math.abs(e.y - el.y) < 16).length;
    el.x += overlap * 16;
    el.y += overlap * 12;
    el.x = Math.max(0, Math.min(el.x, this.state.canvasWidth - el.width));
    el.y = Math.max(0, Math.min(el.y, this.state.canvasHeight - el.height));
    this.state.elements.push(el);
    this.state.selectedId = el.id;
    this.emit();
    return el.id;
  },

  removeElement(id) {
    this.state.elements = this.state.elements.filter(e => e.id !== id);
    if (this.state.selectedId === id) this.state.selectedId = null;
    this.emit();
  },

  selectElement(id) {
    this.state.selectedId = id;
    this.emit();
  },

  deselect() {
    this.state.selectedId = null;
    this.emit();
  },

  moveElement(id, x, y) {
    const el = this.state.elements.find(e => e.id === id);
    if (!el) return;
    el.x = Math.max(0, Math.min(x, this.state.canvasWidth - el.width));
    el.y = Math.max(0, Math.min(y, this.state.canvasHeight - el.height));
    this.emit();
  },

  resizeElement(id, w, h) {
    const el = this.state.elements.find(e => e.id === id);
    if (!el) return;
    el.width = Math.max(8, Math.min(w, this.state.canvasWidth));
    el.height = Math.max(8, Math.min(h, this.state.canvasHeight));
    el.x = Math.min(el.x, this.state.canvasWidth - el.width);
    el.y = Math.min(el.y, this.state.canvasHeight - el.height);
    this.emit();
  },

  setElementField(id, field, value) {
    const el = this.state.elements.find(e => e.id === id);
    if (!el) return;
    if (field === 'x' || field === 'y') {
      const clamped = this.clampedSize(value, 0, this.state.canvasWidth);
      if (field === 'x') el.x = Math.min(clamped, this.state.canvasWidth - el.width);
      else el.y = Math.min(clamped, this.state.canvasHeight - el.height);
    } else if (field === 'width' || field === 'height') {
      const max = field === 'width' ? this.state.canvasWidth : this.state.canvasHeight;
      const clamped = this.clampedSize(value, 8, max);
      el[field] = clamped;
      el.x = Math.min(el.x, this.state.canvasWidth - el.width);
      el.y = Math.min(el.y, this.state.canvasHeight - el.height);
    } else if (field === 'type') {
      if (['button', 'text', 'image', 'rect', 'icon'].includes(value)) el.type = value;
    } else {
      el[field] = value;
    }
    this.emit();
  },

  duplicateElement(id) {
    const el = this.state.elements.find(e => e.id === id);
    if (!el) return;
    const dup = { ...el, id: this._nextId(el.type), x: el.x + 16, y: el.y + 12 };
    dup.x = Math.min(dup.x, this.state.canvasWidth - dup.width);
    dup.y = Math.min(dup.y, this.state.canvasHeight - dup.height);
    this.state.elements.push(dup);
    this.state.selectedId = dup.id;
    this.emit();
    return dup.id;
  },

  exportData() {
    const cw = this.state.canvasWidth;
    const ch = this.state.canvasHeight;
    const elements = this.state.elements.map(el => {
      const relX = cw > 0 ? (el.x / cw * 100) : 0;
      const relY = ch > 0 ? (el.y / ch * 100) : 0;
      const relW = cw > 0 ? (el.width / cw * 100) : 0;
      const relH = ch > 0 ? (el.height / ch * 100) : 0;
      return {
        type: el.type,
        id: el.id,
        label: el.label,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        relX: relX.toFixed(2),
        relY: relY.toFixed(2),
        relWidth: relW.toFixed(2),
        relHeight: relH.toFixed(2),
        comment: el.comment || '',
      };
    });
    const obj = {
      app: 'autocanva',
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      canvas: {
        windowWidth: this.state.windowWidth,
        windowHeight: this.state.windowHeight,
        canvasWidth: cw,
        canvasHeight: ch,
        gridSize: this.state.gridSize,
        snapEnabled: this.state.snapEnabled,
      },
      elements,
    };
    return JSON.stringify(obj, null, 2);
  },

  exportPrompt() {
    const json = this.exportData();
    return [
      'Here is a UI layout designed visually on AutoCanva. Each element has exact coordinates in pixels and percentages. Use the rel* fields (percentages of the target window) to place elements in the target UI.',
      '',
      json,
      '',
      'The reference background image is not included — it was a visual guide only. Place elements by coordinates alone.',
    ].join('\n');
  },

  persistDebounce: null,

  persist() {
    if (this.persistDebounce) clearTimeout(this.persistDebounce);
    this.persistDebounce = setTimeout(() => {
      if (typeof window !== 'undefined' && window.autocanva && window.autocanva.saveProject) {
        const data = {
          appVersion: '0.1.0',
          schemaVersion: 1,
          state: { ...this.state, backgroundImageURL: '', selectedId: null },
        };
        window.autocanva.saveProject(JSON.stringify(data));
      }
    }, 400);
  },
};

store.onChange = () => {
  store.persist();
  if (typeof window !== 'undefined' && window.renderApp) window.renderApp();
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { store };
}
