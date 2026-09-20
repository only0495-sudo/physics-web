(function (root) {
  'use strict';
  const c = 343, rho = 1.2, magnification = 400;
  const defaults = { amplitude: 0.15, period: 4, probe: 0.8 };
  function sample(x, t, p) {
    const A = p.amplitude / 1000, T = p.period / 1000;
    const omega = 2 * Math.PI / T, k = omega / c, phase = k * x - omega * t;
    return { displacement: A * Math.sin(phase), pressure: -rho * c * omega * A * Math.cos(phase), velocity: -omega * A * Math.cos(phase) };
  }
  function derived(p) {
    const T = p.period / 1000, A = p.amplitude / 1000;
    return { frequency: 1 / T, wavelength: c * T, pressureAmplitude: rho * c * 2 * Math.PI / T * A };
  }
  const api = { c, rho, magnification, defaults, sample, derived };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AirWave = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
