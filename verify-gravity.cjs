'use strict';
const assert=require('node:assert/strict'),M=require('./gravity-model.js');
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
let p={x:250,y:0,vx:0,vy:M.circularSpeed(250),id:1};
const a=M.accelerations([p],false)[0];near(a.y,0);near(a.x,-M.G*M.M*250/(250**2+M.epsilon**2)**1.5);
const period=2*Math.PI*250/p.vy;let orbit=[{...p}];
for(let i=0;i<Math.round(10*period/M.dt);i++)orbit=M.step(orbit,false);
near(Math.hypot(orbit[0].x,orbit[0].y),250,0.02);
near(orbit[0].x*orbit[0].vy-orbit[0].y*orbit[0].vx,250*p.vy,1e-5);
let fall=[{x:100,y:0,vx:0,vy:0}];for(let i=0;i<480;i++)fall=M.step(fall);assert.equal(fall.length,0);
const pair=[{x:200,y:40,vx:0,vy:0},{x:220,y:40,vx:0,vy:0}];
const on=M.accelerations(pair,true),off=M.accelerations(pair,false);
assert.ok(on[0].x>off[0].x);near(on[0].x-off[0].x,-(on[1].x-off[1].x));
for(const overlap of [0,0.0001,4,100]){let b=[{x:250,y:0,vx:0,vy:0},{x:250+overlap,y:0,vx:0,vy:0}];for(let i=0;i<200;i++)b=M.step(b);assert.ok(b.every(p=>Number.isFinite(p.x+p.y+p.vx+p.vy)));}
for(const speed of [0,400,1200]){let b=[{x:18.01,y:0,vx:-speed,vy:0}];for(let i=0;i<480;i++)b=M.step(b);assert.equal(b.length,0);}
console.log('通過：引力解析值、十圈圓軌道半徑與角動量、落入吸收、相互作用對稱性、重疊與高速穩定性。');
if(process.argv.includes('--browser'))(async()=>{
 const {chromium,devices}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?devices['iPhone 13']:{viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(require('node:url').pathToFileURL(require('node:path').resolve('重力場模擬器.html')).href);
  await page.locator('#play').click();const frozen=await page.locator('#time').textContent();await page.waitForTimeout(120);assert.equal(await page.locator('#time').textContent(),frozen);
  await page.locator('#reset').click();assert.match(await page.locator('#time').textContent(),/0.00/);
  const box=await page.locator('#space').boundingBox();
  await page.locator('#space').click({position:{x:box.width*.7,y:box.height*.4}});assert.match(await page.locator('#count').textContent(),/^1 /);
  await page.mouse.move(box.x+box.width*.3,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.3+50,box.y+box.height*.4-30);await page.waitForTimeout(150);assert.match(await page.locator('#message').textContent(),/初速/);assert.match(await page.locator('#state').textContent(),/瞄準/);await page.mouse.up();assert.match(await page.locator('#count').textContent(),/^2 /);
  await page.locator('#vectors').check();await page.locator('#mutual').uncheck();await page.locator('#mutual').check();await page.locator('#trails').uncheck();await page.locator('#trails').check();
  for(const value of ['0.125','0.25','0.5','1','2'])await page.locator('#speed').selectOption(value);
  await page.locator('#reset').click();await page.locator('#orbit').click();await page.locator('#play').click();await page.waitForTimeout(700);await page.locator('#play').click();assert.match(await page.locator('#count').textContent(),/^1 /);assert.notEqual(await page.locator('#time').textContent(),'0.00 s');
  if(mobile){await page.touchscreen.tap(box.x+box.width*.2,box.y+box.height*.3);assert.match(await page.locator('#count').textContent(),/^2 /);}
  await page.locator('#vectors').check();await page.screenshot({path:require('node:path').join(process.env.TEMP,`gravity-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('#reset').click();for(let i=0;i<33;i++)await page.locator('#orbit').click();assert.match(await page.locator('#count').textContent(),/^32 /);assert.match(await page.locator('#message').textContent(),/上限/);
  await page.locator('#reset').click();assert.match(await page.locator('#count').textContent(),/^0 /);assert.equal(await page.locator('#play').textContent(),'開始');assert.equal(await page.locator('#speed').inputValue(),'0.25');assert.deepEqual(errors,[]);await context.close();
 }console.log('通過：桌面／手機點擊、拖曳預測、觸控點擊、開關、倍率、播放暫停、示範、上限、重設及版面無溢出。');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
