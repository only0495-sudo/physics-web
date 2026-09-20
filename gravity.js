(() => {
  'use strict';
  const M=GravityModel, $=id=>document.getElementById(id), canvas=$('space'), ctx=canvas.getContext('2d');
  const colors=['#b5edcf','#91c9fa','#efb6dd','#f7d795','#b7a5ef','#f5ab96'];
  let bodies=[], running=true, time=0, nextId=0, aim=null, predicted=[], w=0,h=0,scale=1,accumulator=0,last=0,trailTick=0;
  const mutual=()=>$('mutual').checked;
  function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;scale=Math.min(w,h)/850;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);$('scale').textContent=`畫面短邊 850 m`;if(aim)cancelAim();}
  new ResizeObserver(resize).observe(canvas);
  const screen=p=>({x:w/2+p.x*scale,y:h/2-p.y*scale});
  function world(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-w/2)/scale,y:-(e.clientY-r.top-h/2)/scale};}
  function particle(x,y,vx=0,vy=0){return {x,y,vx,vy,id:nextId++,color:colors[(nextId-1)%colors.length],trail:[]};}
  function sync(){ $('count').innerHTML=`${bodies.length} <small>/ 32</small>`;$('time').innerHTML=`${time.toFixed(2)} <small>s</small>`;$('play').textContent=running?'暫停':'開始';$('state').textContent=aim?'瞄準中・時間暫停':running?'模擬中':'已暫停';$('empty').hidden=bodies.length>0||!!aim; }
  function velocity(){let vx=(aim.end.x-aim.start.x)*2,vy=(aim.end.y-aim.start.y)*2;const v=Math.hypot(vx,vy);if(v>1200){vx*=1200/v;vy*=1200/v;}return {vx,vy};}
  function preview(){
    if(!aim)return;
    const v=velocity(), candidate={...aim.start,...v,id:-1};
    let future=bodies.map(p=>({x:p.x,y:p.y,vx:p.vx,vy:p.vy,id:p.id}));future.push(candidate);predicted=[{...aim.start}];
    for(let i=0;i<1920;i++){future=M.step(future,mutual());const p=future.find(p=>p.id===-1);if(!p)break;if(i%8===0)predicted.push({x:p.x,y:p.y});}
    $('message').textContent=`初速 ${Math.hypot(v.vx,v.vy).toFixed(0)} m/s · 此處圓軌道參考 ${M.circularSpeed(Math.hypot(aim.start.x,aim.start.y)).toFixed(0)} m/s。放開發射。`;
  }
  function cancelAim(){aim=null;predicted=[];accumulator=0;sync();}
  canvas.addEventListener('pointerdown',e=>{
    if(aim||e.button!==0)return;
    const p=world(e);if(Math.hypot(p.x,p.y)<=M.radius){$('message').textContent='請在黑洞吸收範圍之外建立質點。';return;}
    if(bodies.length>=32){$('message').textContent='已達 32 顆質點上限，請重設後再試。';return;}
    canvas.setPointerCapture(e.pointerId);aim={start:p,end:p,pointer:e.pointerId};accumulator=0;preview();sync();
  });
  let previewDue=false;
  canvas.addEventListener('pointermove',e=>{if(!aim||e.pointerId!==aim.pointer)return;aim.end=world(e);previewDue=true;});
  canvas.addEventListener('pointerup',e=>{if(!aim||e.pointerId!==aim.pointer)return;aim.end=world(e);const v=velocity();bodies.push(particle(aim.start.x,aim.start.y,v.vx,v.vy));cancelAim();$('message').textContent=running?'已發射。試著再加入一顆，觀察軌道如何改變。':'已建立質點；按「開始」觀看運動。';});
  canvas.addEventListener('pointercancel',cancelAim);canvas.addEventListener('lostpointercapture',()=>{if(aim)cancelAim();});
  $('play').onclick=()=>{running=!running;accumulator=0;sync();};
  $('reset').onclick=()=>{bodies=[];time=0;nextId=0;trailTick=0;running=false;cancelAim();$('vectors').checked=false;$('mutual').checked=true;$('trails').checked=true;$('speed').value='0.25';$('message').textContent='已重設。點擊或拖曳建立質點，再按「開始」。';sync();};
  $('mutual').onchange=()=>{if(aim)preview();};
  $('trails').onchange=()=>{bodies.forEach(p=>p.trail=[]);};
  $('orbit').onclick=()=>{if(bodies.length>=32){$('message').textContent='已達 32 顆質點上限。';return;}const angle=bodies.length*2.4,r=250,x=r*Math.cos(angle),y=r*Math.sin(angle),v=M.circularSpeed(r);bodies.push(particle(x,y,-v*Math.sin(angle),v*Math.cos(angle)));$('message').textContent=`已加入圓軌道初速 ${v.toFixed(0)} m/s 的質點。${running?'':'按「開始」觀看運動。'}`;sync();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelAim();});
  document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;if(document.hidden)cancelAim();});
  function line(points,color,dashed=false){if(points.length<2)return;ctx.beginPath();points.forEach((p,i)=>{const s=screen(p);if(i===0)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y);});ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.setLineDash(dashed?[5,6]:[]);ctx.stroke();ctx.setLineDash([]);}
  function arrow(p,dx,dy,color){const len=Math.hypot(dx,dy);if(len<0.5)return;const angle=Math.atan2(dy,dx);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+dx,p.y+dy);ctx.stroke();const head=Math.min(7,len*0.5);ctx.beginPath();ctx.moveTo(p.x+dx,p.y+dy);ctx.lineTo(p.x+dx-head*Math.cos(angle-0.45),p.y+dy-head*Math.sin(angle-0.45));ctx.lineTo(p.x+dx-head*Math.cos(angle+0.45),p.y+dy-head*Math.sin(angle+0.45));ctx.fill();}
  function draw(){
    ctx.clearRect(0,0,w,h);
    if($('trails').checked)for(const p of bodies)line(p.trail,p.color+'65');
    if(aim){line(predicted,'#cadfd3',true);const p=screen(aim.start),v=velocity();arrow(p,v.vx*scale/2,-v.vy*scale/2,'#e1f6e9');ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.strokeStyle='#e1f6e9';ctx.stroke();}
    const r=M.radius*scale;ctx.save();ctx.shadowColor='#b5edcf';ctx.shadowBlur=17;ctx.strokeStyle='#b5edcf';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(w/2,h/2,r,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.fillStyle='#000';ctx.beginPath();ctx.arc(w/2,h/2,Math.max(0,r-1),0,Math.PI*2);ctx.fill();
    const a=$('vectors').checked?M.accelerations(bodies,mutual()):null;
    bodies.forEach((p,i)=>{const s=screen(p);if(s.x< -100||s.x>w+100||s.y< -100||s.y>h+100)return;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(s.x,s.y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(a){const value=Math.hypot(a[i].x,a[i].y),len=Math.min(240,18*Math.pow(value/250,0.75));if(value>0)arrow(s,a[i].x/value*len,-a[i].y/value*len,'#ebd997');}});
  }
  let lastPreview=0;
  function frame(now){
    const elapsed=last?Math.min((now-last)/1000,0.05):0;last=now;
    if(previewDue&&aim&&now-lastPreview>90){preview();previewDue=false;lastPreview=now;}
    if(running&&!aim){accumulator+=elapsed*Number($('speed').value);while(accumulator>=M.dt){bodies=M.step(bodies,mutual());time+=M.dt;accumulator-=M.dt;if(++trailTick%8===0&&$('trails').checked)bodies.forEach(p=>{p.trail.push({x:p.x,y:p.y});if(p.trail.length>900)p.trail.shift();});}}
    sync();draw();requestAnimationFrame(frame);
  }
  resize();sync();requestAnimationFrame(frame);
})();
