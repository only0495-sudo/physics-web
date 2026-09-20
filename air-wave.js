(() => {
  'use strict';
  const M = window.AirWave, $ = id => document.getElementById(id);
  const canvas = $('wave'), ctx = canvas.getContext('2d');
  const p = { ...M.defaults };
  let t = 0, playing = false, last = null, width = 0, height = 0;
  const length = 2.4;
  // Fixed, jittered equilibrium positions preserve each microparcel's identity.
  let seed = 193;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const particles = [];
  for (let row = 0; row < 24; row++) for (let col = 0; col < 220; col++) {
    particles.push({ x: (col + 0.2 + random() * 0.6) / 220 * (length + 0.12), y: (row + 0.2 + random() * 0.6) / 24 });
  }
  const signed = (n, digits) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
  function line(x1,y1,x2,y2,color,lineWidth=1,dash=[]) {
    ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=lineWidth; ctx.setLineDash(dash); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
  }
  function text(value,x,y,color='#657988',align='left',size=12) {
    ctx.fillStyle=color;ctx.font=`${size}px "Microsoft JhengHei", sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);
  }
  function dot(x,y,r,color,outline=false) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=outline?'white':color;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
  function render() {
    const w=width,h=height, narrow=w<550;
    if (!w || !h) return;
    const left=narrow?61:83,right=w-22,span=right-left;
    const X=x=>left+x/length*span;
    const y1=h*0.19,y2=h*0.80,scale=h*0.095,top=h*0.37,bottom=h*0.63;
    const d=M.derived(p),aMax=Math.max(p.amplitude,0.01),pMax=Math.max(d.pressureAmplitude,0.1);
    ctx.clearRect(0,0,w,h);
    for (const [zero,max,color,title,unit] of [[y1,aMax,'#2865ba','位移 ξ','mm'],[y2,pMax,'#a040a8','壓力變化 p′','Pa']]) {
      text(`${title}（${unit}）`,left,zero-scale-23,color,'left',narrow?13:15);
      for(const sign of [-1,0,1]) {
        const y=zero-sign*scale;
        line(left,y,right,y,sign===0?'#8d9daa':'#e6edf2',sign===0?1.3:1);
        text(sign===0?'0':`${sign>0?'+':'−'}${max.toFixed(unit==='mm'?2:1)}`,left-8,y+4,color,'right',narrow?10:12);
      }
      for(let x=0;x<=length+1e-8;x+=0.4) line(X(x),zero-scale,X(x),zero+scale,'#eef2f5');
      ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.7;
      for(let px=0;px<=span;px++) {
        const s=M.sample(px/span*length,t,p),val=unit==='mm'?s.displacement*1000:s.pressure;
        const y=zero-val/max*scale;
        if(px===0)ctx.moveTo(left+px,y);else ctx.lineTo(left+px,y);
      }
      ctx.stroke();
    }
    text('空氣微團',left,top-14,'#324f63','left',narrow?13:15);
    text('左右振盪 ↔',right,top-14,'#657988','right',narrow?11:12);
    const piston=X(M.sample(0,t,p).displacement*M.magnification);
    ctx.fillStyle='#f2f7fa';ctx.fillRect(piston,top,right-piston,bottom-top);
    ctx.save();ctx.beginPath();ctx.rect(piston,top,right-piston,bottom-top);ctx.clip();
    ctx.fillStyle='#426783';
    ctx.beginPath();
    for(const [index,q] of particles.entries()) {
      if(narrow && index%2)continue;
      const x=X(q.x+M.magnification*M.sample(q.x,t,p).displacement),y=top+5+q.y*(bottom-top-10);
      ctx.moveTo(x+1.05,y);ctx.arc(x,y,narrow?0.8:1.05,0,Math.PI*2);
    }
    ctx.fill();ctx.restore();
    line(left-14,top,right,top,'#7a95a5',2);line(left-14,bottom,right,bottom,'#7a95a5',2);
    ctx.fillStyle='#93acbb';ctx.fillRect(piston-10,top,10,bottom-top);ctx.fillStyle='#526f83';ctx.fillRect(piston-32,(top+bottom)/2-7,22,14);
    text('活塞',left-12,top-14,'#657988','right',11);
    const s=M.sample(p.probe,t,p),probeX=X(p.probe),particleX=X(p.probe+M.magnification*s.displacement),center=(top+bottom)/2;
    if($('reference').checked) {
      line(probeX,y1-scale-8,probeX,y2+scale+4,'#c28b44',1.2,[5,5]);
      dot(probeX,center,5,'#b97429',true);
      line(probeX,center,particleX,center,'#c48633',2);
      dot(probeX,y1-s.displacement*1000/aMax*scale,4,'#c48633');
      dot(probeX,y2-s.pressure/pMax*scale,4,'#c48633');
    }
    dot(particleX,center,5,'#dc8b28');
    for(let x=0;x<=length+1e-8;x+=narrow?0.8:0.4) text(x.toFixed(1),X(x),y2+scale+20,'#657988','center',11);
    text('平衡位置 x₀（m）',right,h-12,'#657988','right',12);
    $('time').textContent=`${(t*1000).toFixed(2)} ms`;
    const phase=(t/(p.period/1000))%1;
    $('phase').value=phase; $('phase-value').textContent=`${phase.toFixed(2)} T`;
    $('displacement').textContent=`${signed(s.displacement*1000,3)} mm`;
    $('pressure').textContent=`${signed(s.pressure,2)} Pa`;
    $('density').textContent=Math.abs(s.pressure)<Math.max(d.pressureAmplitude*0.02,1e-8)?'平衡壓力':s.pressure>0?'較密・高壓':'較疏・低壓';
  }
  function sync() {
    $('amplitude-value').textContent=`${p.amplitude.toFixed(2)} mm`;
    $('period-value').textContent=`${p.period.toFixed(1)} ms`;
    $('probe-value').textContent=`${p.probe.toFixed(2)} m`;
    const d=M.derived(p);
    $('frequency').textContent=`${d.frequency.toFixed(1)} Hz`;
    $('wavelength').textContent=`${d.wavelength.toFixed(3)} m`;
    render();
  }
  function pause() {playing=false;last=null;$('play').textContent='開始';}
  $('play').addEventListener('click',()=>{playing=!playing;last=null;$('play').textContent=playing?'暫停':'開始';});
  $('reset').addEventListener('click',()=>{pause();t=0;render();});
  $('step').addEventListener('click',()=>{pause();t+=p.period/1000/16;render();});
  $('phase').addEventListener('input',()=>{pause();t=Number($('phase').value)*p.period/1000;render();});
  for(const id of ['amplitude','period','probe']) $(id).addEventListener('input',()=>{
    const el=$(id),value=Number(el.value);
    if(!Number.isFinite(value))return;
    p[id]=Math.min(Number(el.max),Math.max(Number(el.min),value));
    if(id!=='probe'){pause();t=0;}sync();
  });
  $('reference').addEventListener('change',render);
  $('speed').addEventListener('change',()=>{last=null;});
  new ResizeObserver(()=>{
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    width=rect.width;height=rect.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();
  }).observe(canvas);
  document.addEventListener('visibilitychange',()=>{last=null;});
  function frame(now) {
    if(playing && !document.hidden && last!==null){t+=Math.min((now-last)/1000,0.05)*Number($('speed').value)*p.period/1000;render();}
    last=now;requestAnimationFrame(frame);
  }
  sync();requestAnimationFrame(frame);
})();
