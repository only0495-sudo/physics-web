'use strict';
const assert=require('node:assert/strict');
const {chromium,devices}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    for(const mobile of [false,true]){
      const context=await browser.newContext(mobile?devices['iPhone 13']:{viewport:{width:1440,height:1080}});
      // Pick (3, -2) from the ordered list of 120 nonzero targets.
      await context.addInitScript(()=>{Math.random=()=>90/120;});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(pathToFileURL(path.resolve('向量.html')).href);
      assert.equal(await page.locator('#answer').isVisible(),false);
      assert.match(await page.locator('#board-desc').textContent(),/\(3, -2\)/);
      await page.locator('#right').click();await page.locator('#left').click();
      assert.equal(await page.locator('#equation').textContent(),'0î + 0ĵ');
      assert.equal(await page.locator('#steps').textContent(),'2');
      await page.locator('#undo').click();assert.equal(await page.locator('#equation').textContent(),'1î + 0ĵ');
      await page.locator('#reset').click();assert.equal(await page.locator('#steps').textContent(),'0');
      await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowRight');await page.keyboard.up('ArrowRight');
      assert.equal(await page.locator('#steps').textContent(),'1');
      await page.locator('#right').click();await page.locator('#right').click();
      await page.locator('#down').click();await page.locator('#down').click();
      assert.equal(await page.locator('#badge').textContent(),'已抵達！');
      assert.equal(await page.locator('#equation').textContent(),'3î − 2ĵ');
      assert.equal(await page.locator('#answer').isVisible(),true);
      await page.locator('#up').click();assert.equal(await page.locator('#answer').isVisible(),false);
      await page.locator('#down').click();assert.match(await page.locator('#message').textContent(),/7 步，最少需要 5 步/);
      await page.locator('#decompose').check();await page.locator('#decompose').uncheck();
      await page.screenshot({path:path.join(process.env.TEMP,`vector-${mobile?'mobile':'desktop'}.png`),fullPage:true});
      await page.locator('#reset').click();assert.equal(await page.locator('#undo').isDisabled(),true);
      for(const direction of ['right','up','left','down']){
        await page.locator('#reset').click();for(let n=0;n<7;n++)await page.locator('#'+direction).click();
        assert.equal(await page.locator('#steps').textContent(),'6');assert.match(await page.locator('#message').textContent(),/邊界/);
      }
      // All quadrants, both axes, and maximum target components.
      for(const [x,y] of [[-5,-5],[-5,5],[5,-5],[5,5],[0,5],[5,0],[0,-5],[-5,0]]){
        await page.evaluate(([tx,ty])=>{
          const match=document.getElementById('board-desc').textContent.match(/目標終點 \((-?\d+), (-?\d+)\)/);
          const old=match.slice(1).map(Number),choices=[];
          for(let a=-5;a<=5;a++)for(let b=-5;b<=5;b++)if((a||b)&&(a!==old[0]||b!==old[1]))choices.push([a,b]);
          const index=choices.findIndex(([a,b])=>a===tx&&b===ty);Math.random=()=>(index+.1)/choices.length;
        },[x,y]);
        await page.locator('#new').click();assert.equal(await page.locator('#steps').textContent(),'0');
        assert.equal(await page.locator('#decompose').isChecked(),false);
        for(let n=0;n<Math.abs(x);n++)await page.locator(x<0?'#left':'#right').click();
        for(let n=0;n<Math.abs(y);n++)await page.locator(y<0?'#down':'#up').click();
        assert.equal(await page.locator('#badge').textContent(),'已抵達！');
      }
      if(mobile){await page.locator('#reset').click();const b=await page.locator('#up').boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);assert.equal(await page.locator('#y-value').textContent(),'1 ĵ');}
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const oldSteps=await page.locator('#steps').textContent();
      await page.locator('#scenario-operations').click();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#steps').textContent(),oldSteps);
      assert.equal(await page.locator('.dpad').isVisible(),false);
      async function geometry(){return page.evaluate(()=>Object.fromEntries(['a','b'].map(id=>{const g=document.getElementById('operand-'+id),start=g.dataset.start.split(',').map(Number),end=g.dataset.end.split(',').map(Number);return [id,{start,end,v:end.map((n,i)=>n-start[i])}]})));}
      async function dragVector(id,destination,touch=false){
        const g=await geometry();
        const points=await page.evaluate(({id,destination,g})=>{
          const node=document.getElementById('operand-'+id),circle=node.querySelector('circle'),matrix=document.getElementById('operation-board').getScreenCTM();
          const x=Number(circle.getAttribute('cx')),y=Number(circle.getAttribute('cy'));
          // Infer the exact world scale from the nonzero vector and its visible tip.
          const arrow=node.querySelector('path[fill]:not([fill="none"])');
          const tip=arrow.getAttribute('d').match(/M([-\d.]+),([-\d.]+)/).slice(1).map(Number);
          const v=g[id].v,unit=v[0]?(tip[0]-x)/v[0]:(y-tip[1])/v[1];
          const from=new DOMPoint(x,y).matrixTransform(matrix),to=new DOMPoint(x+(destination[0]-g[id].start[0])*unit,y-(destination[1]-g[id].start[1])*unit).matrixTransform(matrix);
          return {from:{x:from.x,y:from.y},to:{x:to.x,y:to.y}};
        },{id,destination,g});
        if(touch){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points.from]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[points.to]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
        else {await page.mouse.move(points.from.x,points.from.y);await page.mouse.down();await page.mouse.move(points.to.x,points.to.y,{steps:10});await page.mouse.up();}
      }
      await page.locator('#operation-board').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#operation-result').isVisible(),false);
      {
        assert.equal(await page.locator('#operation-subtract').count(),0);
        for(const mode of ['ab','ba','parallel']){
          await page.locator('#operation-reset').click();await page.locator('#operation-board').scrollIntoViewIfNeeded();
          const g=await geometry();
          for(const id of ['a','b'])assert.ok(Math.hypot(...g[id].v)>=6&&Math.hypot(...g[id].v)<=9);
          const id=mode==='ba'?'a':'b',destination=mode==='ba'?g.b.end:mode==='ab'?g.a.end:g.a.start;
          await dragVector(id,destination,mobile);
          assert.equal(await page.locator('#operation-result').isVisible(),true,`${mode}`);
          assert.match(await page.locator('#construction-title').textContent(),mode==='parallel'?/平行四邊形/:/三角形/);
          const sum=g.a.v.map((n,i)=>n+g.b.v[i]);
          assert.equal(await page.locator('#sum-rx').textContent(),String(sum[0]));assert.equal(await page.locator('#sum-ry').textContent(),String(sum[1]));
          const before=await geometry();for(const v of ['a','b'])for(let i=0;i<2;i++)assert.ok(Math.abs(before[v].v[i]-g[v].v[i])<1e-8);
          const result=await page.locator('#result-arrow').getAttribute('data-start');assert.ok(result);
        }
      }
      await page.screenshot({path:path.join(process.env.TEMP,`vector-operations-${mobile?'mobile':'desktop'}.png`),fullPage:true});
      const connected=await geometry();
      await page.locator('#operation-board').scrollIntoViewIfNeeded();
      await dragVector('b',connected.b.start.map(n=>n+2),mobile);
      assert.equal(await page.locator('#operation-result').isVisible(),false);
      await page.locator('#operation-reset').click();assert.equal(await page.locator('#operation-result').isVisible(),false);
      const loose=await geometry();
      await page.locator('#operation-board').scrollIntoViewIfNeeded();
      await dragVector('b',loose.a.end.map((n,i)=>n-loose.b.v[i]),mobile);
      assert.equal(await page.locator('#operation-result').isVisible(),false,'頭頭相接不應算成功');
      for(let i=0;i<12;i++){await page.locator('#operation-random').click();const g=await geometry();for(const id of ['a','b'])assert.ok(Math.hypot(...g[id].v)>=6&&Math.hypot(...g[id].v)<=9);assert.equal(await page.locator('#result-arrow').count(),0);}
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.locator('#scenario-unit').click();assert.equal(await page.locator('#steps').textContent(),oldSteps);
      await page.locator('#scenario-operations').click();
      assert.deepEqual(errors,[]);await context.close();
    }
    const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve('index.html')).href);
    await page.locator('#activity-search').fill('方向鍵');assert.equal(await page.locator('.activity-card').count(),1);
    console.log('通過：桌面／手機、鍵盤／觸控、長按去重、撤銷／重設／換題、四象限與座標軸、邊界、分解提示、繞路抵消、首頁搜尋、拖曳／觸控三種接法、直式、拖開與頭頭不誤判、向量長度限制及無水平溢出。');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
