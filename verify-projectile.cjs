// Browser regression checks. Run with Playwright on NODE_PATH and Microsoft Edge installed.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      const proto = CanvasRenderingContext2D.prototype;
      const originals = Object.fromEntries(['clearRect','beginPath','moveTo','lineTo','stroke'].map(k => [k, proto[k]]));
      proto.clearRect = function(...a) { window.drawnLines = []; return originals.clearRect.apply(this,a); };
      proto.beginPath = function(...a) { this.testPath = []; return originals.beginPath.apply(this,a); };
      for (const name of ['moveTo','lineTo']) proto[name] = function(x,y,...a) { this.testPath?.push([x,y]); return originals[name].call(this,x,y,...a); };
      proto.stroke = function(...a) { if(this.testPath?.length===2) (window.drawnLines ||= []).push({ points:this.testPath.slice(), color:this.strokeStyle, width:this.lineWidth }); return originals.stroke.apply(this,a); };
    });
    await page.goto(pathToFileURL(path.join(__dirname, '拋體運動.html')).href);
    const set = (id, value) => page.locator(id).evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
    const mode = name => page.locator(`[data-mode="${name}"]`).click();
    const rows = () => page.locator('#comparison-rows tr').evaluateAll(rows => rows.map(row => [...row.children].map(c => c.textContent)));
    const near = (actual, expected) => assert.ok(Math.abs(Number(actual) - expected) < .011, `${actual} != ${expected}`);
    for (const name of ['freefall', 'vertical', 'horizontal', 'oblique']) {
      await mode(name);
      near(await page.locator('#timeline').getAttribute('max'), 5);
      await set('#timeline', 5);
      near(parseFloat(await page.locator('#data-vy').textContent()), ['freefall', 'horizontal'].includes(name) ? -50 : -25);
    }
    await mode('horizontal');
    await page.locator('[data-count="3"]').click();
    await set('#timeline', 2);
    let data = await rows();
    data.forEach((row, i) => { near(row[2], 5); near(row[3], [90, 140, 190][i]); near(row[5], [18, 28, 38][i]); near(row[6], -20); });
    assert.equal(await page.locator('[id^="velocity-x-trace"]').count(), 3);
    assert.equal(await page.locator('#velocity-y-trace').getAttribute('d'), await page.locator('#velocity-y-trace-1').getAttribute('d'));
    await page.locator('#focus-particle').selectOption('2');
    near(parseFloat(await page.locator('#data-x').textContent()), 76);
    await page.locator('#vectors-on').click();
    await page.locator('#show-ghosts').check();
    await set('#particle-2-speed', 0);
    await set('#timeline', 5);
    data = await rows(); near(data[2][3], 0); near(data[2][5], 0);
    assert.ok(data.every(row => row[1] === '已落地'));
    await mode('oblique');
    await page.locator('[data-count="3"]').click();
    data = await rows(); data.forEach(row => near(row[2], 5));
    // Different launch times/impact velocities: B lands before A, C lands after A.
    await set('#particle-1-speed', 20); await set('#particle-1-angle', 30);
    await set('#particle-2-speed', 40); await set('#particle-2-angle', 60);
    near(await page.locator('#timeline').getAttribute('max'), 8 * Math.sin(Math.PI / 3));
    await set('#timeline', 3);
    data = await rows();
    assert.equal(data[1][1], '已落地'); near(data[1][2], 2); near(data[1][5], 20 * Math.cos(Math.PI / 6)); near(data[1][6], -10);
    assert.equal(data[0][1], '飛行中'); assert.equal(data[2][1], '飛行中');
    const impactPath = await page.locator('#velocity-y-trace-1').getAttribute('d');
    await set('#timeline', 6);
    assert.equal(await page.locator('#velocity-y-trace-1').getAttribute('d'), impactPath);
    data = await rows(); assert.equal(data[0][1], '已落地'); assert.equal(data[2][1], '飛行中');
    await page.locator('#reset-button').click();
    assert.equal(await page.locator('#time-display').textContent(), '0.00');
    await page.locator('#play-button').click(); await page.waitForTimeout(180); await page.locator('#play-button').click();
    const paused = await page.locator('#time-display').textContent();
    await page.waitForTimeout(120); assert.equal(await page.locator('#time-display').textContent(), paused);
    await set('#timeline', 6.92); await page.locator('#play-button').click(); await page.waitForTimeout(200);
    assert.equal(await page.locator('#play-button').textContent(), '重新播放');
    assert.ok((await rows()).every(row => row[1] === '已落地'));
    await page.locator('#play-button').click(); await page.locator('#play-button').click();
    assert.ok(parseFloat(await page.locator('#time-display').textContent()) < 1);
    // Removing the focused particle returns focus to a remaining particle safely.
    await page.locator('#focus-particle').selectOption('2'); await page.locator('[data-count="1"]').click();
    assert.equal(await page.locator('#focus-particle').inputValue(), '0');
    assert.equal(await page.locator('[id^="velocity-x-trace"]').count(), 1);
    await page.locator('[data-count="3"]').click();
    for (const speed of [5, 50]) for (const angle of [10, 90]) {
      await set('#particle-1-speed', speed); await set('#particle-1-angle', angle);
      await set('#timeline', 1);
      assert.ok(!(await page.locator('#velocity-y-plot').innerHTML()).match(/NaN|Infinity/));
    }
    assert.equal(await page.locator('#object-mass, #data-mass, #data-weight').count(), 0);
    assert.equal(await page.locator('#height-parameter').isVisible(), false);
    await page.locator('[data-count="1"]').click();
    assert.equal(await page.locator('#height-parameter').isVisible(), true);
    await set('#initial-height', 50);
    await page.locator('[data-count="2"]').click();
    assert.equal(await page.locator('#height-parameter').isVisible(), false);
    assert.match(await page.locator('#shared-height-note').textContent(), /50.0 m/);
    await page.locator('[data-scenario="complementary"]').click();
    data = await rows(); assert.equal(data.length, 2); near(data[0][3], data[1][3]);
    assert.notEqual(data[0][2], data[1][2]);
    assert.equal(await page.locator('#initial-height').inputValue(), '0');
    await page.locator('[data-scenario="equal-height"]').click();
    data = await rows(); assert.equal(data.length, 2);
    data.forEach(row => { near(row[2], 5); near(row[4], 31.25); });
    await page.locator('[data-count="3"]').click();
    data = await rows(); assert.equal(data.length, 3);
    data.forEach(row => { near(row[2], 5); near(row[4], 31.25); });
    await page.locator('[data-scenario="max-range"]').click();
    data = await rows(); near(data[0][3], data[2][3]); assert.ok(Number(data[1][3]) > Number(data[0][3]));
    await page.locator('[data-scenario="speed"]').click();
    data = await rows(); assert.ok(Math.abs(Number(data[1][2]) - Number(data[0][2]) * 2) <= .02); near(data[1][3], Number(data[0][3]) * 4); near(data[1][4], Number(data[0][4]) * 4);
    await set('#launch-angle', 40);
    assert.match(await page.locator('#scenario-note').textContent(), /自訂條件/);
    await page.locator('[data-count="3"]').click();
    await page.locator('[data-scenario="equal-height"]').click();
    assert.equal(await page.locator('#launch-summary li').count(), 3);
    assert.match(await page.locator('#launch-summary li').first().textContent(), /50.00 m\/s.*30°/);
    await page.locator('#independence-toggle').check();
    const arrows = () => page.evaluate(() => {
      const ground = window.drawnLines.find(l => l.color === '#49657c' && l.width === 2).points[0][1];
      return window.drawnLines.filter(l => l.width === 2 && ['#63e6be','#ffb86b','#ff8fae'].includes(l.color)).map(l => ({...l, horizontal:l.points[0][1] === l.points[1][1] && l.points[0][1] > ground}));
    });
    await set('#timeline', 1);
    assert.equal((await arrows()).filter(l=>l.horizontal).length, 1);
    await set('#timeline', 5);
    let projection = await arrows(), horizontal = projection.filter(l=>l.horizontal);
    assert.equal(horizontal.length, 5);
    horizontal.forEach((l,i)=> { near(l.points[0][1],horizontal[0].points[0][1]); if(i) near(l.points[0][0],horizontal[i-1].points[1][0]); });
    const vertical = projection.filter(l=>!l.horizontal);
    const up = vertical.filter(l=>l.points[1][1]<l.points[0][1]);
    const down = vertical.filter(l=>l.points[1][1]>l.points[0][1]);
    assert.equal(up.length,3); assert.equal(down.length,3);
    up.forEach((l,i)=>near(Math.abs(l.points[1][1]-l.points[0][1]),Math.abs(down[2-i].points[1][1]-down[2-i].points[0][1])));
    assert.deepEqual(horizontal.map(l=>l.color), ['#63e6be','#ffb86b','#63e6be','#ffb86b','#63e6be']);
    up.forEach((l,i)=>assert.equal(l.color,down[2-i].color));
    near(up[0].points[0][1],down.at(-1).points[1][1]);
    near(up.at(-1).points[1][1],down[0].points[0][1]);
    assert.equal(await page.locator('#independence-readout').isVisible(),false);
    await set('#timeline',2); assert.equal((await arrows()).filter(l=>l.horizontal).length,2);
    await page.locator('#focus-particle').selectOption('1');
    assert.deepEqual((await arrows()).filter(l=>l.horizontal).map(l=>l.color), ['#63e6be','#ffb86b']);
    await page.locator('#reset-button').click(); assert.equal((await arrows()).length,0);
    // Non-integer ascent time must still produce mirrored lengths and matching colors.
    await page.locator('[data-count="1"]').click();
    await set('#launch-speed',40); await set('#launch-angle',37);
    const duration = Number(await page.locator('#timeline').getAttribute('max'));
    await set('#timeline',duration-.03); await page.locator('#play-button').click(); await page.waitForTimeout(220);
    projection = await arrows();
    const mirroredUp = projection.filter(l=>!l.horizontal && l.points[1][1]<l.points[0][1]);
    const mirroredDown = projection.filter(l=>!l.horizontal && l.points[1][1]>l.points[0][1]);
    assert.equal(mirroredUp.length,2); assert.equal(mirroredDown.length,2);
    mirroredUp.forEach((l,i)=>{const r=mirroredDown[1-i]; near(l.points[0][1],r.points[1][1]);near(l.points[1][1],r.points[0][1]);assert.equal(l.color,r.color);});
    await page.locator('[data-scenario="equal-height"]').click();
    await set('#timeline',5);
    if (process.env.PROJECTILE_SCREENSHOTS) await page.locator('.stage-card').screenshot({ path: path.join(process.env.PROJECTILE_SCREENSHOTS, 'projectile-independence.png') });
    for (const width of [1500, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('#stage-zoom-button').click(); await page.keyboard.press('Escape');
    }
    if (process.env.PROJECTILE_SCREENSHOTS) await page.locator('.stage-card').screenshot({ path: path.join(process.env.PROJECTILE_SCREENSHOTS, 'projectile-independence-mobile.png') });
    await mode('horizontal');
    assert.doesNotMatch(await page.locator('#launch-summary').textContent(), /θ/);
    await set('#timeline', 2);
    assert.equal((await arrows()).filter(l=>l.horizontal).length,2);
    await page.locator('#independence-toggle').uncheck();
    assert.equal(await page.locator('#independence-readout').isVisible(), false);
    await mode('vertical');
    await page.locator('#height-comparison').check(); await set('#comparison-height', 100); await set('#timeline', 2.5);
    assert.match(await page.locator('#comparison-record').textContent(), /2.50 s，vᵧ = 0/);
    assert.equal(await page.locator('#particle-controls').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('PASS: four modes; 1–3 particles; independent speeds/angles; five-second defaults; analytic flight/impact values; synchronized charts; pause/replay/reset; focus/removal; parameter limits; four viewport sizes; vertical symmetry.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
