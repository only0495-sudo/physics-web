// Run with Playwright on NODE_PATH and Microsoft Edge installed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = file => pathToFileURL(path.join(__dirname, file)).href;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const screenshots = path.join(os.tmpdir(), 'physics-home-preview');
  fs.mkdirSync(screenshots, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url('index.html'));
    const activities = await page.evaluate(() => window.PhysicsClassroom.activities);
    assert.equal(await page.locator('.card-link').count(), activities.length);
    assert.equal(await page.getByText('加入課堂流程').count(), 0);
    for (const activity of activities) {
      assert.ok(fs.existsSync(path.join(__dirname, activity.file)));
      const html = fs.readFileSync(path.join(__dirname, activity.file), 'utf8');
      assert.ok(html.includes('classroom-shell.css') || html.includes('lab-navigation.css'), activity.file);
      const link = page.getByRole('link', { name: `模擬開始：${activity.title}`, exact: true });
      assert.equal(decodeURI(await link.getAttribute('href')), `${activity.file}?role=teacher`);
    }
    const firstCard = await page.locator('.activity-card').first().boundingBox();
    assert.ok(firstCard.y < 650, 'Catalog visible without scrolling on desktop');
    await page.screenshot({ path: path.join(screenshots, 'desktop.png') });
    for (const category of ['力學', '電磁學', '波動學', '近代物理']) {
      await page.locator(`[data-category="${category}"].filter-button`).click();
      assert.equal(await page.locator('.activity-card').count(), activities.filter(a => a.category === category).length);
    }
    await page.locator('[data-category="全部"].filter-button').click();
    await page.locator('#activity-search').fill('拋體');
    assert.equal(await page.locator('.activity-card').count(), 1);
    await page.locator('[data-role="student"]').click();
    assert.ok((await page.locator('.card-link').getAttribute('href')).endsWith('?role=student'));
    await page.locator('.card-link').click();
    await page.locator('.pc-home-link').waitFor();
    assert.ok(decodeURI(page.url()).includes('拋體運動.html?role=student'));
    await page.locator('.pc-dock-minimize').click();
    assert.ok(await page.locator('.pc-home-link').isVisible(), 'Return remains visible in collapsed toolbar');
    await page.locator('.pc-home-link').click();
    await page.locator('#activity-search').fill('不存在的模擬xyz');
    assert.ok(await page.locator('#empty-state').isVisible());
    await page.locator('#clear-search').click();
    assert.equal(await page.locator('.activity-card').count(), activities.length);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('/');
    assert.equal(await page.locator('#activity-search').evaluate(el => el === document.activeElement), true);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(screenshots, 'phone.png'), fullPage: false });

    const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
    for (const file of ['拋體運動.html', '相對加速度.html', '空氣振盪.html', '向量.html', '重力場模擬器.html']) {
      await phone.goto(url(file));
      const home = phone.locator('.pc-home-link, header .lab-home-link').first();
      await home.waitFor();
      const box = await home.boundingBox();
      const scale = await phone.evaluate(() => window.visualViewport.scale);
      assert.ok(box.width * scale >= 44 && box.height * scale >= 44, `${file}: touch target`);
      assert.ok(box.x >= 0 && box.y >= 0 && (box.x + box.width) * scale <= 845 && (box.y + box.height) * scale <= 391, `${file}: on screen`);
      if (file === '拋體運動.html') await phone.screenshot({ path: path.join(screenshots, 'sim-phone.png') });
      await home.click();
      assert.ok(phone.url().endsWith('index.html'));
    }
    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.goto(url('拋體運動.html'));
    await phone.locator('.pc-orientation-guard .lab-home-link').click();
    assert.ok(phone.url().endsWith('index.html'));
    assert.deepEqual(errors, []);
    console.log(`PASS: ${activities.length} links, four categories, search/empty state, role, direct entry/return, collapsed dock, phone layouts and five simulation return links. Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
