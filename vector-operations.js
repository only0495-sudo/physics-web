(() => {
  'use strict';
  const $=id=>document.getElementById(id), svg=$('operation-board');
  const colors={a:'#087da7',b:'#b45b18',r:'#7852cc'};
  const add=(a,b)=>a.map((n,i)=>n+b[i]),sub=(a,b)=>a.map((n,i)=>n-b[i]);
  const distance=(a,b)=>Math.hypot(...sub(a,b));
  const fmt=([x,y])=>`${x}î ${y<0?'−':'+'} ${Math.abs(y)}ĵ`;
  let vectors,starts,initial,joined=null,selected='a',drag=null,range=10,scale=25.2,cx=320,cy=240;
  const value=id=>vectors[id];
  const end=id=>add(starts[id],value(id));
  const point=([x,y])=>[cx+x*scale,cy-y*scale];
  const choose=list=>list[Math.floor(Math.random()*list.length)];
  function scatter(){
    starts={a:sub([-4,3],value('a').map(n=>Math.round(n/2)))};
    const candidates=[];
    for(let x=-8;x<=8;x++)for(let y=-8;y<=8;y++){
      const tail=[x,y],head=add(tail,value('b'));
      if(head.some(n=>Math.abs(n)>9))continue;
      if([tail,head].some(p=>[starts.a,end('a')].some(q=>distance(p,q)<3)))continue;
      if(distance(add(tail,value('b').map(n=>n/2)),[-4,3])<6)continue;
      candidates.push(tail);
    }
    starts.b=choose(candidates);initial={a:[...starts.a],b:[...starts.b]};joined=null;fit();render();
  }
  function newVectors(){
    const choices=[];
    for(let x=-7;x<=7;x++)for(let y=-7;y<=7;y++)if(Math.hypot(x,y)>=6&&Math.hypot(x,y)<=9)choices.push([x,y]);
    const a=choose(choices),b=choose(choices.filter(b=>Math.abs(a[0]*b[1]-a[1]*b[0])>=18));
    vectors={a,b};scatter();
  }
  function result(){
    if(!joined)return null;
    const start=joined==='ab'?starts.a:joined==='ba'?starts.b:starts.a;
    return {start,finish:add(start,add(value('a'),value('b')))};
  }
  function fit(){
    const pts=[starts.a,starts.b,end('a'),end('b')];if(joined)pts.push(result().finish);
    pts.push([0,0]);
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    const minX=Math.min(...xs)-1.7,maxX=Math.max(...xs)+1.7,minY=Math.min(...ys)-1.7,maxY=Math.max(...ys)+1.7;
    scale=Math.min(560/Math.max(10,maxX-minX),380/Math.max(10,maxY-minY));
    cx=320-(minX+maxX)*scale/2;cy=240+(minY+maxY)*scale/2;
    range=Math.ceil(Math.max(...pts.flat().map(Math.abs))+3);
  }
  function arrow(start,finish,color,{label='',dashed=false,id='',movable=false}={}){
    const [x,y]=point(start),[ex,ey]=point(finish),length=Math.hypot(ex-x,ey-y);if(!length)return '';
    const dx=(ex-x)/length,dy=(ey-y)/length,head=Math.min(17,length*.4),bx=ex-head*dx,by=ey-head*dy;
    return `<g ${id?`id="${id}"`:''} ${movable?`data-vector="${id==='operand-a'?'a':'b'}" class="draggable-vector"`:''} data-start="${start}" data-end="${finish}">
      ${movable?`<path d="M${x},${y} L${ex},${ey}" stroke="transparent" stroke-width="32" fill="none"/>`:''}
      <path d="M${x},${y} L${bx},${by}" fill="none" stroke="${color}" stroke-width="${dashed?3:6}" ${dashed?'stroke-dasharray="8 6"':''}/><path d="M${ex},${ey} L${bx-dy*8},${by+dx*8} L${bx+dy*8},${by-dx*8} Z" fill="${color}"/>
      ${movable?`<circle cx="${x}" cy="${y}" r="7" fill="white" stroke="${color}" stroke-width="3"/>`:''}
      ${label?`<text class="arrow-label" x="${(x+ex)/2-dy*20}" y="${(y+ey)/2+dx*20}" fill="${color}" text-anchor="middle">${label}</text>`:''}</g>`;
  }
  function render(){
    const a=value('a'),b=value('b'),r=add(a,b),operand='B';
    $('select-a').setAttribute('aria-pressed',selected==='a');$('select-b').setAttribute('aria-pressed',selected==='b');
    $('construction-title').textContent=joined?(joined==='parallel'?'尾尾相接 · 平行四邊形法':'首尾相接 · 三角形法'):'拖動向量，試著接在一起';
    $('construction-step').textContent=joined?'連接成功':'等待連接';
    $('operand-legend').textContent=`━ 向量 ${operand}`;
    $('operation-rule').textContent='先把 A 和 B 接起來';
    $('a-components').textContent=`A = ${fmt(a)}`;
    $('b-components').textContent=`B = ${fmt(b)}`;
    $('operation-result').hidden=!joined;$('result-prompt').hidden=!!joined;
    $('result-equation').textContent=fmt(r);
    for(const [key,v] of Object.entries({a,b,r}))for(let i=0;i<2;i++)$('sum-'+key+(i?'y':'x')).textContent=v[i];
    $('sum-b-label').textContent=`＋ ${operand}`;
    $('component-calculation').textContent='水平、鉛直分量各自相加；向量移到哪裡，分量都不變。';
    $('success-method').textContent=joined==='parallel'?'成功！平行四邊形加法':'成功！三角形加法';
    $('step-explanation').textContent=joined==='parallel'?'兩支向量共用起點，補上平行邊；從共同起點畫出對角線。':joined==='ba'?'B 在前、A 在後；從第一支的起點連到第二支的終點。':'A 在前、第二支向量在後；從 A 的起點連到第二支的終點。';
    $('construction-note').textContent=drag?'正在平移：長度與方向不變。靠近端點後放開。':joined?'連接成功！左側已顯示分量直式。再拖開，試試另一種接法。':'抓住任一支向量拖動；首尾相接或尾尾相接後放開。';
    $('result-position').textContent=joined?`結果分量 (${r.join(', ')})`:'尚未顯示合成結果';
    let html='';
    const xmin=Math.ceil((40-cx)/scale),xmax=Math.floor((600-cx)/scale),ymin=Math.ceil((cy-430)/scale),ymax=Math.floor((cy-50)/scale);
    const tickStep=Math.max(2,2*Math.ceil(24/scale));
    for(let x=xmin;x<=xmax;x++){
      const px=cx+x*scale;html+=`<path d="M${px},50 V430" stroke="#e8edf4"/>`;
      if(x&&x%tickStep===0)html+=`<text x="${px}" y="${cy+21}" text-anchor="middle">${x}</text>`;
    }
    for(let y=ymin;y<=ymax;y++){
      const py=cy-y*scale;html+=`<path d="M40,${py} H600" stroke="#e8edf4"/>`;
      if(y&&y%tickStep===0)html+=`<text x="${cx-12}" y="${py+5}" text-anchor="end">${y}</text>`;
    }
    html+=`<path d="M30,${cy} H611 M${cx},440 V39" stroke="#aebccd" stroke-width="2"/><text x="618" y="${cy+5}">x</text><text x="${cx-5}" y="26">y</text><text x="${cx-18}" y="${cy+22}">O</text>`;
    if(joined==='parallel'){
      const res=result();html+=`<polygon points="${[starts.a,end('a'),res.finish,end('b')].map(p=>point(p).join(',')).join(' ')}" fill="#7852cc12"/>`;
      html+=arrow(end('a'),res.finish,colors.b,{dashed:true,id:'translated-b'})+arrow(end('b'),res.finish,colors.a,{dashed:true,id:'translated-a'});
    }
    if(joined){const res=result();html+=arrow(res.start,res.finish,colors.r,{label:'R',id:'result-arrow'});}
    for(const id of ['a','b'])html+=arrow(starts[id],end(id),colors[id],{label:id==='a'?'A':operand,id:'operand-'+id,movable:true});
    $('operation-drawing').innerHTML=html;
    $('operation-desc').textContent=`可拖動向量。A = (${a})，${operand} = (${b})。${$('construction-title').textContent}。${joined?`結果分量 (${r})。`:''}`;
  }
  function connect(id){
    const other=id==='a'?'b':'a',tail=starts[other],head=end(other);
    const candidates=[{tail:head,type:id==='b'?'ab':'ba'},{tail:sub(tail,value(id)),type:id==='a'?'ab':'ba'},{tail,type:'parallel'}];
    candidates.sort((a,b)=>distance(starts[id],a.tail)-distance(starts[id],b.tail));
    const closest=candidates[0];joined=null;
    if(distance(starts[id],closest.tail)<=22/scale){starts[id]=[...closest.tail];joined=closest.type;}
    fit();render();
  }
  function world(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());return [(p.x-cx)/scale,(cy-p.y)/scale];}
  svg.addEventListener('pointerdown',event=>{
    if(event.button!==0||drag)return;
    const hit=event.target.closest('[data-vector]');if(!hit)return;
    event.preventDefault();selected=hit.dataset.vector;svg.focus({preventScroll:true});
    drag={id:selected,pointer:event.pointerId,mouse:world(event),tail:[...starts[selected]],previous:joined};joined=null;
    svg.setPointerCapture(event.pointerId);render();
  });
  svg.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;
    const next=add(drag.tail,sub(world(event),drag.mouse));
    starts[drag.id]=next;
    render();
  });
  function finish(event,cancel=false){
    if(!drag||event.pointerId!==drag.pointer)return;
    const saved=drag;drag=null;
    if(cancel){starts[saved.id]=saved.tail;joined=saved.previous;fit();render();}else connect(saved.id);
    if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
  }
  svg.addEventListener('pointerup',event=>finish(event));svg.addEventListener('pointercancel',event=>finish(event,true));
  svg.addEventListener('lostpointercapture',event=>{if(drag)finish(event,true);});
  function keyboard(event){
    const delta={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];
    if(delta){event.preventDefault();const next=add(starts[selected],delta),head=add(next,value(selected));if([...next,...head].every(n=>Math.abs(n)<=range)){starts[selected]=next;joined=null;render();}}
    else if(event.key==='Enter'){event.preventDefault();connect(selected);}
  }
  svg.addEventListener('keydown',keyboard);
  for(const id of ['a','b']){$('select-'+id).addEventListener('click',()=>{selected=id;render();svg.focus({preventScroll:true});});}
  function switchScenario(unit){
    $('unit-scenario').hidden=!unit;$('operations-scenario').hidden=unit;
    $('scenario-unit').setAttribute('aria-pressed',unit);$('scenario-operations').setAttribute('aria-pressed',!unit);document.body.classList.toggle('operations-active',!unit);
  }
  $('scenario-unit').addEventListener('click',()=>switchScenario(true));$('scenario-operations').addEventListener('click',()=>switchScenario(false));
  $('operation-random').addEventListener('click',newVectors);
  $('operation-reset').addEventListener('click',()=>{starts={a:[...initial.a],b:[...initial.b]};joined=null;fit();render();});
  newVectors();
})();
