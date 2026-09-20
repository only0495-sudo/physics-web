'use strict';
const assert = require('node:assert/strict');
const M = require('./air-wave-model.js');
const near = (a,b,e=1e-7) => assert.ok(Math.abs(a-b)<e, `${a} != ${b}`);
const p=M.defaults,d=M.derived(p),T=p.period/1000;
near(d.frequency,250);near(d.wavelength,1.372);
near(M.sample(d.wavelength/4,0,p).displacement,0.00015);
near(M.sample(d.wavelength/4,0,p).pressure,0);
near(M.sample(0,0,p).pressure,-M.rho*M.c*2*Math.PI/T*0.00015);
for(const amplitude of [0,0.01,0.15,0.2]) for(const period of [2,4,10]) {
  const q={amplitude,period},dt=1e-9,dx=1e-6;
  for(const x of [0,0.1,0.8,2.3]) for(const t of [0,0.0007,0.003]) {
    const s=M.sample(x,t,q);
    near(s.pressure,-M.rho*M.c*M.c*(M.sample(x+dx,t,q).displacement-M.sample(x-dx,t,q).displacement)/(2*dx),1e-5);
    near(s.velocity,(M.sample(x,t+dt,q).displacement-M.sample(x,t-dt,q).displacement)/(2*dt));
    near(s.displacement,M.sample(x+M.c*0.001,t+0.001,q).displacement);
    const jacobian=1+M.magnification*(M.sample(x+dx,t,q).displacement-M.sample(x-dx,t,q).displacement)/(2*dx);
    assert.ok(jacobian>0,'粒子不能互相穿越');
  }
}
console.log('解析解、壓力梯度、速度、傳播方向及參數極值通過');
if(process.argv.includes('--browser')) (async()=>{
  const {chromium,devices}=require('playwright');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    for(const mobile of [false,true]) {
      const context=await browser.newContext(mobile?devices['iPhone 13']:{viewport:{width:1440,height:1100}});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(require('node:url').pathToFileURL(require('node:path').resolve('空氣振盪.html')).href);
      await page.waitForTimeout(250);
      assert.equal(await page.locator('#frequency').textContent(),'250.0 Hz');
      await page.locator('#play').click();await page.waitForTimeout(220);await page.locator('#play').click();
      const paused=await page.locator('#time').textContent();assert.notEqual(paused,'0.00 ms');
      await page.waitForTimeout(150);assert.equal(await page.locator('#time').textContent(),paused);
      await page.locator('#reset').click();assert.equal(await page.locator('#time').textContent(),'0.00 ms');
      await page.locator('#step').click();assert.equal(await page.locator('#time').textContent(),'0.25 ms');
      for(const [id,values] of [['amplitude',['0','0.2','0.15']],['period',['2','10','4']],['probe',['0.1','2.3','0.8']]])for(const value of values){
        await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('input');
        assert.ok(!(await page.locator('#displacement').textContent()).includes('NaN'));
      }
      await page.locator('#reference').uncheck();await page.locator('#reference').check();
      await page.locator('#speed').selectOption('0.25');
      await page.locator('#phase').fill('0.5');await page.locator('#phase').dispatchEvent('input');assert.equal(await page.locator('#time').textContent(),'2.00 ms');
      await page.locator('#reset').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'不可水平溢出');
      assert.deepEqual(errors,[]);
      await page.screenshot({path:require('node:path').join(process.env.TEMP,`air-wave-${mobile?'mobile':'desktop'}.png`),fullPage:true});
      await context.close();
    }
    console.log('桌面與手機互動、暫停、步進、重設、滑桿極值、時間軸、參考線與無溢出檢查通過');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
