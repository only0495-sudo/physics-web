(function (root) {
  'use strict';
  const g = 9.8;
  const defaults = { height: 60, launch: 20, bv: 0, liftA: 2, liftV: 4, cabin: 4 };
  const ballPresets = [
    { id: 'descending', label: '下落途中被追上', height: 60, launch: 20 },
    { id: 'late', label: '接近地面才被追上', height: 75, launch: 20 },
    { id: 'high', label: '較高處下落時被追上', height: 100, launch: 25 },
    { id: 'apex', label: '恰在最高點相遇', height: 39.2, launch: 19.6 },
    { id: 'ascending', label: '上升途中迎面相遇', height: 50, launch: 24 }
  ];
  const flight = (y, v, t) => ({ y: y + v * t - g * t * t / 2, v: v - g * t, a: -g });
  const hit = (y, v) => (v + Math.sqrt(v * v + 2 * g * y)) / g;
  function ballEvent(p) {
    const meet = p.height / p.launch, apex = p.launch / g;
    const ground = Math.min(hit(p.height, 0), hit(0, p.launch));
    const kind = meet <= ground + 1e-9 ? 'meet' : 'ground';
    const time = Math.min(meet, ground);
    const phase = kind === 'ground' ? 'ground' : Math.abs(meet - apex) < 1e-8 ? 'apex' : meet < apex ? 'ascending' : 'descending';
    return { time, apex, meet, kind, phase };
  }
  function duration(scene, p) {
    if (scene === 1) return Math.min(hit(60, 0), hit(45, p.bv));
    if (scene === 2) return ballEvent(p).time;
    return 1 + Math.sqrt(2 * p.cabin / (g + p.liftA));
  }
  function state(scene, p, t) {
    const ground = { y: 0, v: 0, a: 0, name: '地面／樹', color: '#497158' };
    if (scene === 1) return { ground, A: { ...flight(60, 0, t), name: 'A 同學', color: '#126c9a' }, B: { ...flight(45, p.bv, t), name: 'B 同學', color: '#bd6030' } };
    if (scene === 2) return { ground, A: { ...flight(p.height, 0, t), name: '上方球 A', color: '#126c9a' }, B: { ...flight(0, p.launch, t), name: '上拋球 B', color: '#bd6030' } };
    const floorStart=p.liftA<0?20:4;
    const lift = { y: floorStart + p.liftV * t + p.liftA * t * t / 2, v: p.liftV + p.liftA * t, a: p.liftA, name: '電梯地板', color: '#126c9a' };
    const releaseY = floorStart + p.liftV + p.liftA / 2 + p.cabin;
    const screw = t < 1 ? { y: lift.y + p.cabin, v: lift.v, a: lift.a } : flight(releaseY, p.liftV + p.liftA, t - 1);
    return { ground, lift, screw: { ...screw, name: '螺絲', color: '#bd6030' } };
  }
  function relative(body, observer) { return { y: body.y - observer.y, v: body.v - observer.v, a: body.a - observer.a }; }
  const api = { g, defaults, ballPresets, ballEvent, duration, state, relative };
  root.RelativeAcceleration = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
