// AutoCanva single source of state. See docs/ARCHITECTURE.md.
// Stub scaffold — implementation grows per PLAN.md.

const state = {
  windowWidth: 1280,
  windowHeight: 720,
  canvasWidth: 800,
  canvasHeight: 600,
  gridSize: 20,
  snapEnabled: true,
  showGrid: true,
  backgroundOpacity: 0.7,
  backgroundImagePath: '',
  elements: [],
};

module.exports = { state };