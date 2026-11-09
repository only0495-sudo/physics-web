// Run: node verify-lenz.cjs. Checks the page's actual physics/render updates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(`${__dirname}/冷次定律(磁鐵動).html`, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
new vm.Script(script);
const position = () => ({ set(x, y, z) { Object.assign(this, { x, y, z }); } });
const state = {
  Math, COIL_RADIUS: 3, COIL_LENGTH: 6,
  magnet: { rotation: { y: 0 }, position: { x: 15 } },
  magnetState: { x: 15, lastX: 15, targetRotationY: 0 },
  simState: { fluxLast: 0, inducedCurrent: 0 },
  uiState: { showField: true, showCharges: false },
  chartState: { currentMax: 6, emfMax: 80 },
  chartData: { history: [], maxLen: 120 },
  inducedBArrow: { rotation: { y: 0 }, scale: { setScalar() {} }, children: [] },
  inducedPoles: {}, inducedNorthLabel: { position: position() },
  inducedCurrentArrows: { children: [1, -1].map(direction => ({ userData: { direction } })) },
  inducedSouthLabel: { position: position() },
  bulbFilamentMat: null, vArrowHelper: {}, vLabel: {}, charges: [],
};
vm.createContext(state);
vm.runInContext(script.slice(script.indexOf('function calculateFlux('), script.indexOf('function renderChart(')), state);
function step(x) {
  state.magnetState.x = x;
  state.updatePhysics();
  state.updateVisuals();
}
// For both sides and both magnet polarities: approaching repels, leaving attracts.
for (const side of [-1, 1]) for (const polarity of [-1, 1]) {
  state.magnet.rotation.y = polarity === 1 ? 0 : Math.PI;
  state.magnetState.targetRotationY = state.magnet.rotation.y;
  state.simState.fluxLast = state.calculateFlux(side * 12);
  for (let i = 0; i < 100; i++) {
    const approaching = i % 2 === 0;
    const nextX = side * (approaching ? 11 : 12);
    const target = Math.max(-15, Math.min(15, (state.calculateFlux(nextX) - state.simState.fluxLast) * 8));
    const expected = state.simState.inducedCurrent + (target - state.simState.inducedCurrent) * 0.2;
    step(nextX);
    assert.ok(Math.abs(state.simState.inducedCurrent - expected) < 1e-12);
    const direction = Math.sign(expected);
    assert.equal(Math.sign(state.simState.emf), -polarity * (approaching ? 1 : -1));
    assert.equal(state.inducedBArrow.rotation.y, direction > 0 ? 0 : Math.PI);
    assert.equal(state.inducedNorthLabel.position.x, direction * 3);
    assert.equal(state.inducedSouthLabel.position.x, -direction * 3);
    assert.equal(state.inducedBArrow.visible, true);
    assert.equal(state.inducedPoles.visible, true);
  }
  const beforeStop = state.simState.inducedCurrent;
  step(side * 12);
  assert.ok(Math.abs(state.simState.inducedCurrent - beforeStop * 0.8) < 1e-12);
  assert.equal(state.inducedBArrow.visible, true);
  assert.equal(state.inducedPoles.visible, true);
  for (let frame = 0; frame < 100; frame++) step(side * 12);
  assert.equal(state.simState.inducedCurrent, 0);
  assert.equal(state.inducedBArrow.visible, false);
  assert.equal(state.inducedPoles.visible, false);
}
for (const [field, charges, expected] of [[false, false, false], [true, false, true], [false, true, true]]) {
  Object.assign(state.uiState, { showField: field, showCharges: charges });
  state.simState.inducedCurrent = 1;
  state.updateVisuals();
  assert.equal(state.inducedBArrow.visible, expected);
  assert.equal(state.inducedPoles.visible, expected);
  assert.equal(state.inducedCurrentArrows.visible, charges);
}
for (const chargeType of ['positive', 'electron']) for (const current of [-15, -0.01, 0, 0.01, 15]) {
  Object.assign(state.uiState, { showCharges: true, chargeType });
  state.simState.inducedCurrent = current;
  state.updateVisuals();
  assert.equal(state.inducedCurrentArrows.visible, current !== 0);
  for (const arrow of state.inducedCurrentArrows.children) {
    assert.equal(arrow.visible, arrow.userData.direction === Math.sign(current));
  }
}
console.log('PASS: syntax, 400 smoothed-current steps with instant arrow orientation, both sides/polarities, gradual decay and visibility switches.');
