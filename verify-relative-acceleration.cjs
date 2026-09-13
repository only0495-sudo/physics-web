'use strict';
const assert = require('node:assert/strict');
const M = require('./relative-acceleration-model.js');
let checks = 0;
function near(actual, expected, message, tolerance = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < tolerance, `${message}: ${actual} ≠ ${expected}`); checks++;
}
const p = { ...M.defaults };
// Hand-calculated defaults and release continuity.
let s = M.state(1, p, 1);
near(s.A.y, 55.1, 'A 在一秒後高度'); near(s.B.y, 40.1, 'B 在一秒後高度');
near(M.relative(s.B, s.A).v, 0, '同初速自由落體相對靜止');
near(M.relative(s.ground, s.A).a, 9.8, '樹相對 A 向上加速');
s = M.state(2, p, M.duration(2, p));
near(s.A.y, s.B.y, '兩球相遇位置'); near(M.relative(s.B, s.A).v, 20, '兩球相對速度');
near(M.duration(2,p),3,'預設下落追及時間');near(s.B.y,15.9,'預設下落追及高度');assert.ok(s.B.v<0);checks++;
for(const preset of M.ballPresets){
  const q={...p,...preset}, event=M.ballEvent(q),s=M.state(2,q,event.time);
  assert.equal(event.kind,'meet');checks++;near(s.A.y,s.B.y,'指定參數相遇高度');
  if(['descending','late','high'].includes(preset.id)){assert.ok(s.A.v<s.B.v && s.B.v<0);checks++;}
  if(preset.id==='apex')near(s.B.v,0,'指定最高點相遇');
}
for(const height of [20,90,160])for(const launch of [10,25,40]){
  const q={...p,height,launch},event=M.ballEvent(q),s=M.state(2,q,event.time);
  if(event.kind==='meet')near(s.A.y,s.B.y,'擴充範圍相遇');else{near(s.B.y,0,'擴充範圍先觸地');assert.ok(s.A.y>0);checks++;}
}
s = M.state(3, p, 1.5);
near(s.screw.v, 1.1, '螺絲脫落後仍向上'); near(M.relative(s.screw,s.lift).v, -5.9, '螺絲相對電梯向下');
near(M.relative(s.screw,s.lift).a, -11.8, '螺絲相對加速度');
near(M.relative(s.screw,s.lift).y, 2.525, '螺絲距電梯地板高度');
for (const bv of [-8,-4,0,4,8]) {
  const q={...p,bv}, T=M.duration(1,q);
  for(const t of [0,T/2,T]) {const s=M.state(1,q,t);near(M.relative(s.B,s.A).v,bv,'初速差恆定');near(M.relative(s.B,s.A).a,0,'自由落體相對加速度零');}
  const e=M.state(1,q,T);near(Math.min(e.A.y,e.B.y),0,'第一人觸地即停止');
}
for(const height of [30,50,70])for(const launch of [20,24,35]){
  const q={...p,height,launch},T=M.duration(2,q),s=M.state(2,q,T);
  near(T,height/launch,'相遇解析時間');near(s.A.y,s.B.y,'極值參數兩球相遇');assert.ok(s.A.y>0,'相遇前未觸地');checks++;
}
for(const liftA of [0,2,6])for(const liftV of [1,4,8])for(const cabin of [2,4,6]){
  const q={...p,liftA,liftV,cabin},T=M.duration(3,q),s=M.state(3,q,T),release=M.state(3,q,1),before=M.state(3,q,1-1e-9);
  near(s.screw.y,s.lift.y,'極值參數螺絲接觸地板');near(release.screw.v,release.lift.v,'脫落瞬間同速');near(release.screw.y-before.screw.y,0,'脫落位置連續');
  near(M.relative(release.screw,release.lift).a,-9.8-liftA,'脫落後相對加速度');near(before.screw.a,liftA,'脫落前隨電梯加速');
}
// Numerical derivatives cross-check all moving reference frames away from release/contact.
for(const direction of [1,-1]){
  const q={...p,liftA:2*direction,liftV:4*direction,cabin:4},s=M.state(3,q,1.5),T=M.duration(3,q),e=M.state(3,q,T);
  near(M.relative(s.screw,s.lift).a,-9.8-2*direction,'固定上下加速情境的相對加速度');
  near(e.screw.y,e.lift.y,'上下加速皆接觸地板');assert.ok(e.lift.y>0);checks++;
}
for(const scene of [1,2,3])for(const t of [.4,1.3]){
  const dt=1e-4, s=M.state(scene,p,t),prev=M.state(scene,p,t-dt),next=M.state(scene,p,t+dt);
  for(const key of Object.keys(s))for(const ref of Object.keys(s)){
    const r=M.relative(s[key],s[ref]),a=M.relative(prev[key],prev[ref]),b=M.relative(next[key],next[ref]);
    near((b.y-a.y)/(2*dt),r.v,'相對位置導數等於速度',1e-6);near((b.v-a.v)/(2*dt),r.a,'相對速度導數等於加速度',1e-6);
    near(r.a,-M.relative(s[ref],s[key]).a,'觀察者互換時符號反轉');
  }
}
console.log(`相對加速度物理驗證通過：${checks} 項解析解、極值與數值微分檢查。`);

async function browserChecks() {
  const { chromium, devices } = require('playwright');
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const url=(process.env.SIM_BASE_URL || 'http://127.0.0.1:8765')+'/'+encodeURIComponent('相對加速度.html');
  const page=await browser.newPage({viewport:{width:1440,height:1100}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(() => {
    const proto=CanvasRenderingContext2D.prototype;
    for(const name of ['clearRect','beginPath','moveTo','lineTo','arc','fill','fillText','fillRect','roundRect']){
      const original=proto[name];
      proto[name]=function(...args){
        if(this.canvas.id==='scene-canvas'){
          const audit=window.vectorAudit ||= {texts:[],arrows:[]};
          if(name==='clearRect'){audit.texts=[];audit.arrows=[];}
          if(name==='fillRect'&&this.fillStyle==='#526f7b'&&args[3]===7)audit.floorY=args[1];
          if(name==='roundRect'&&args[2]===28&&args[3]===11){const tr=this.getTransform();audit.screwY=tr.f/tr.d;}
          if(name==='beginPath')this.auditPath=[];
          if(name==='arc')this.auditPath=null;
          if((name==='moveTo'||name==='lineTo')&&this.auditPath)this.auditPath.push(args.slice(0,2));
          if(name==='fill'&&this.auditPath?.length===7)audit.arrows.push(this.auditPath.slice());
          if(name==='fillText'&&(['A','B','地面／樹','地面','電梯地板','螺絲','v′','a′','a′ = 0','m/s²'].includes(String(args[0]))||/^\d+\.\d m\/s²$/.test(String(args[0])))){
            const width=this.measureText(args[0]).width, height=parseFloat(this.font.match(/([\d.]+)px/)[1]);
            audit.texts.push({text:args[0],x:args[1]-width/2,y:args[2]-height/2,w:width,h:height});
          }
        }
        return original.apply(this,args);
      };
    }
  });
  async function checkVectorLayout(){
    const audit=await page.evaluate(()=>window.vectorAudit);
    const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    const boxes=audit.arrows.map(points=>{
      const xs=points.map(v=>v[0]),ys=points.map(v=>v[1]);
      const tip=points[3], tail=points[0];
      assert.equal(tip[1],tip[1]<tail[1]?Math.min(...ys):Math.max(...ys),'箭尖必須是向量最前端');
      assert.ok(Math.abs(points[0][0]-points[6][0])<=6.01,'箭身不超出設計寬度');
      return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
    });
    assert.equal(audit.texts.filter(v=>v.text==='v′'||v.text==='a′').length,boxes.length,'每支箭頭皆有未遺失的符號');
    for(let i=0;i<audit.texts.length;i++){
      assert.ok(!boxes.some(b=>overlap(audit.texts[i],b)),'文字不遮住向量');
      for(let j=i+1;j<audit.texts.length;j++)assert.ok(!overlap(audit.texts[i],audit.texts[j]),'文字不互相重疊');
    }
  }
  const slider=async(id,value)=>{const input=page.locator(id);if(value===Number(await input.getAttribute('max'))){await input.focus();await input.press('End');}else{await input.fill(String(value));await input.dispatchEvent('input');}};
  try {
    await page.goto(url); await page.locator('#readouts tr').first().waitFor();
    await page.locator('#play').click();await page.waitForTimeout(180);await page.locator('#play').click();
    const paused=await page.locator('#time').innerText();assert.notEqual(paused,'0.00 s');await page.waitForTimeout(120);assert.equal(await page.locator('#time').innerText(),paused);
    await slider('#timeline',1);await page.locator('[data-observer="A"]').click();assert.equal(await page.locator('#time').innerText(),'1.00 s');
    assert.match(await page.locator('#readouts tr').first().innerText(),/\+9.80/);
    await page.locator('#step').click();assert.equal(await page.locator('#time').innerText(),'1.10 s');
    await slider('#param-bv',-8);assert.equal(await page.locator('#time').innerText(),'0.00 s');assert.match(await page.locator('#insight-title').innerText(),/8.0 m\/s/);
    for(const scene of [1,2,3]){
      await page.locator(`[data-scene="${scene}"]`).click();
      const inputs=page.locator('[data-param]');
      for(let i=0;i<await inputs.count();i++){
        const input=inputs.nth(i),id='#'+await input.getAttribute('id');
        const min=Number(await input.getAttribute('min')),max=Number(await input.getAttribute('max'));
        const step=Number(await input.getAttribute('step'));
        for(const val of [min,min+Math.round((max-min)/2/step)*step,max]){await slider(id,val);assert.equal(await page.locator('#time').innerText(),'0.00 s');}
      }
      const T=Number(await page.locator('#timeline').getAttribute('max'));
      await slider('#timeline',Math.min(1.3,T));
      for(const ref of await page.locator('#views [data-observer]').evaluateAll(bs=>bs.map(b=>b.dataset.observer))){
        await page.locator(`[data-observer="${ref}"]`).click();assert.equal(await page.locator('[data-observer="'+ref+'"]').getAttribute('aria-pressed'),'true');
        const zeros=await page.locator('#readouts tr[data-observer="true"] td').allTextContents();assert.deepEqual(zeros.slice(1),['0.00','0.00','0.00']);
        await checkVectorLayout();
      }
      for(const id of ['show-v','show-a','show-trails']){await page.locator('#'+id).check();await page.locator('#'+id).uncheck();await page.locator('#'+id).check();}
      for(const value of await page.locator('#target option').evaluateAll(os=>os.map(o=>o.value)))await page.locator('#target').selectOption(value);
      await slider('#timeline',T);assert.match(await page.locator('#phase').innerText(),/碰前定格/);assert.equal(await page.locator('#step').isDisabled(),true);
      await checkVectorLayout();
      await page.locator('#play').click();await page.waitForTimeout(70);await page.locator('#play').click();assert.ok(Number((await page.locator('#time').innerText()).split(' ')[0])<T);
      await page.locator('#reset').click();assert.equal(await page.locator('#time').innerText(),'0.00 s');
    }
    for(const speed of ['0.25','0.5','1'])await page.locator('#speed').selectOption(speed);
    await page.locator('[data-scene="2"]').click();
    for(const preset of M.ballPresets){
      await page.locator('#ball-preset').selectOption(preset.id);
      assert.equal(await page.locator('#param-height').inputValue(),String(preset.height));
      assert.equal(await page.locator('#param-launch').inputValue(),String(preset.launch));
      assert.equal(await page.locator('#time').innerText(),'0.00 s');
      if(!await page.locator('#jump-apex').isDisabled()){await page.locator('#jump-apex').click();assert.ok(await page.locator('#readouts tr').nth(2).innerText().then(v=>v.includes('0.00')));}
      for(const width of [390,1440]){
        await page.setViewportSize({width,height:1100});
        for(const ref of ['ground','A','B']){await page.locator(`[data-observer="${ref}"]`).click();await checkVectorLayout();}
        await slider('#timeline',Number(await page.locator('#timeline').getAttribute('max')));await checkVectorLayout();
      }
    }
    await slider('#param-height',160);await slider('#param-launch',10);await slider('#timeline',Number(await page.locator('#timeline').getAttribute('max')));
    assert.match(await page.locator('#phase').innerText(),/先觸地/);assert.match(await page.locator('#scene-note').innerText(),/尚未相遇/);
    // Save representative frames for visual inspection, outside the source tree if configured.
    const dir=process.env.SIM_SCREENSHOTS || '.agents';
    await page.locator('[data-scene="3"]').click();
    assert.equal(await page.locator('#parameters [data-param]').count(),0,'電梯模式沒有參數滑桿');
    for(const direction of ['down','up']){
      await page.locator(`[data-lift="${direction}"]`).click();
      assert.equal(await page.locator('#time').innerText(),'0.00 s');
      await page.locator('[data-observer="lift"]').click();await slider('#timeline',1.5);
      assert.match(await page.locator('#calculation').innerText(),direction==='down'?/-7.80/:/-11.80/);
      await checkVectorLayout();await page.screenshot({path:dir+`/lift-${direction}.png`,fullPage:true});
      await page.locator('[data-observer="screw"]').click();
      await slider('#timeline',1.05);const first=await page.evaluate(()=>({floor:window.vectorAudit.floorY,screw:window.vectorAudit.screwY}));
      await slider('#timeline',1.7);const later=await page.evaluate(()=>({floor:window.vectorAudit.floorY,screw:window.vectorAudit.screwY}));
      assert.ok(later.floor<first.floor-20,'螺絲視角必須真的看到電梯地板向上移動');
      assert.ok(Math.abs(later.screw-first.screw)<.01,'螺絲圖示必須固定在螺絲觀察者畫面中');
      await checkVectorLayout();await page.screenshot({path:dir+`/screw-view-${direction}.png`,fullPage:true});
    }
    await page.locator('[data-scene="3"]').click();await slider('#timeline',1.3);await page.locator('[data-observer="lift"]').click();
    await page.screenshot({path:dir+'/relative-elevator.png',fullPage:true});
    const mobile=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}}),mp=await mobile.newPage();
    mp.on('pageerror',e=>errors.push(e.message));await mp.goto(url);
    await mp.locator('[data-scene="2"]').click();await mp.locator('[data-observer="B"]').click();await mp.locator('#step').click();
    assert.equal(await mp.locator('#time').innerText(),'0.10 s');
    assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'手機無水平溢出');
    await mp.screenshot({path:dir+'/relative-mobile.png',fullPage:true});
    await mobile.close();
    const landscape=await browser.newContext({...devices['iPhone 13 landscape']}),lp=await landscape.newPage();
    lp.on('pageerror',e=>errors.push(e.message));await lp.goto(url);await lp.locator('[data-scene="3"]').click();await lp.locator('[data-observer="lift"]').click();await lp.locator('#step').click();
    assert.equal(await lp.locator('#time').innerText(),'0.10 s');await lp.screenshot({path:dir+'/relative-landscape.png',fullPage:true});await landscape.close();
    await page.goto(url.replace(encodeURIComponent('相對加速度.html'),'index.html'));await page.locator('#activity-search').fill('相對加速度');
    assert.ok(await page.locator('a[href*="'+encodeURIComponent('相對加速度.html')+'"]').count() || await page.locator('a[href*="相對加速度.html"]').count(),'首頁可找到新模擬');
    assert.deepEqual(errors,[]);console.log('瀏覽器驗證通過：三情境、全部視角、播放／暫停／續播／重設、參數極值、圖表追蹤、桌面與直橫向手機、首頁入口；無 JavaScript 錯誤。');
  } finally { await browser.close(); }
}
if(process.argv.includes('--browser'))browserChecks().catch(e=>{console.error(e);process.exitCode=1;});

