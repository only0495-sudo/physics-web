(() => {
  'use strict';
  const M = window.RelativeAcceleration, $ = id => document.getElementById(id);
  let scene = 1, observer = 'ground', target = 'A', t = 0, running = false, last = null;
  const p = { ...M.defaults };
  const names = { ground: '地面', A: 'A 的視角', B: 'B 的視角', lift: '電梯內', screw: '螺絲的視角' };
  const specs = {
    1: [['bv', 'B 的初速度（向上為正）', -8, 8, 1, 'm/s']],
    2: [['height', '上方球 A 初始高度 h₀', 20, 160, .1, 'm'], ['launch', '上拋球 B 初速 v₀', 10, 40, .1, 'm/s']],
    3: []
  };
  let frameRanges = {};
  let velocityScale = 2.2;
  const end = () => M.duration(scene, p);
  const signed = n => (Math.abs(n) < .005 ? '0.00' : (n > 0 ? '+' : '') + n.toFixed(2));
  function prepareRanges() {
    const keys = Object.keys(M.state(scene, p, 0));
    let span = 0;
    let maxSpeed = 0;
    frameRanges = {};
    for (const key of keys) {
      let min = Infinity, max = -Infinity, cabinMin=Infinity,cabinMax=-Infinity;
      for (let j = 0; j <= 160; j++) {
        const s = M.state(scene, p, end() * j / 160);
        const values = Object.values(s).map(b => b.y - s[key].y);
        maxSpeed = Math.max(maxSpeed, ...Object.values(s).map(b => Math.abs(b.v - s[key].v)));
        if (scene === 3) values.push(s.lift.y + p.cabin - s[key].y);
        if(scene===3){cabinMin=Math.min(cabinMin,s.lift.y-s[key].y);cabinMax=Math.max(cabinMax,s.lift.y+p.cabin-s[key].y);}
        min = Math.min(min, ...values); max = Math.max(max, ...values);
      }
      frameRanges[key] = { center: (max + min) / 2, cabinCenter:(cabinMin+cabinMax)/2,cabinSpan:cabinMax-cabinMin };
      span = Math.max(span, max - min);
    }
    for (const range of Object.values(frameRanges)) range.span = scene === 3 ? span + 2 : span * 1.20 + 7;
    velocityScale = Math.min(scene === 3 ? 4 : 2.2, 85 / Math.max(1, maxSpeed));
  }
  function configure() {
    const s = M.state(scene, p, 0);
    $('views').innerHTML = Object.keys(s).map(key => `<button type="button" data-observer="${key}" aria-pressed="${observer === key}">${names[key]}</button>`).join('');
    $('target').innerHTML = Object.entries(s).map(([key, b]) => `<option value="${key}">${b.name}</option>`).join('');
    $('target').value = target;
    $('parameters').innerHTML = (scene === 2 ? `<label class="ra-preset-picker">指定拋球參數<select id="ball-preset"><option value="custom">自訂參數</option>${M.ballPresets.map(preset => `<option value="${preset.id}">${preset.label}（${preset.height} m、${preset.launch} m/s）</option>`).join('')}</select></label><p id="ball-event" class="ra-event"></p><button type="button" id="jump-apex">跳到 B 的最高點</button>` : '') + specs[scene].map(([id, label, min, max, step, unit]) => `<label class="ra-param"><span>${label}<output id="value-${id}">${p[id]} ${unit}</output></span><input type="range" id="param-${id}" data-param="${id}" min="${min}" max="${max}" step="${step}" value="${p[id]}" aria-label="${label}（${unit}）"></label>`).join('');
    if(scene===3)$('parameters').innerHTML=`<div class="ra-lift-modes" role="group" aria-label="電梯加速情境"><button type="button" data-lift="up" aria-pressed="${p.liftA>0}">↑ 向上加速</button><button type="button" data-lift="down" aria-pressed="${p.liftA<0}">↓ 向下加速</button></div><p class="ra-event">固定向${p.liftA>0?'上':'下'}加速 2 m/s²<br>加速度大小 2 &lt; g = 9.8 m/s²<br>車廂高度 4 m；初速向${p.liftA>0?'上':'下'} 4 m/s</p>`;
    $('parameters').insertAdjacentHTML('beforeend', `<p class="ra-muted">${scene === 1 ? 'A 從 60 m 靜止釋放；B 同時從 45 m 開始自由落體。B 初速為 0 時，兩人互看靜止。' : scene === 2 ? 'A 由靜止釋放，B 同時從正下方地面上拋。以相遇或首次觸地為終點，球以質點處理。' : `電梯從離地 ${p.liftA>0?4:20} m 處向${p.liftA>0?'上':'下'}運動；t = 1.00 s 螺絲從天花板脫落，以接觸電梯地板為終點。`}</p>`);
    reset();
  }
  function reset() { running = false; last = null; t = 0; prepareRanges(); render(); }
  function phase() {
    if (t >= end() - 1e-8) return scene === 1 ? '首次觸地｜碰前定格' : scene === 2 ? (M.ballEvent(p).kind === 'meet' ? '兩球相遇｜碰前定格' : 'B 先觸地，尚未相遇｜碰前定格') : '螺絲接觸電梯地板｜碰前定格';
    if (scene === 2) return Math.abs(t - p.launch / M.g) < 1e-8 ? 'B 到達最高點（地面視角）' : t < p.launch / M.g ? 'B 正在上升（地面視角）' : 'B 已開始下落，A 正在追上 B';
    if (scene === 3) return t < 1 ? '螺絲仍固定在天花板' : '螺絲已脫落，自由飛行中';
    return running ? '模擬進行中' : t === 0 ? '準備開始' : '已暫停';
  }
  function explain(s) {
    let title, text;
    if (scene <= 2 && observer === 'ground') {
      title = '方向可以不同，加速度仍相同';
      text = scene === 1 ? 'A、B 都只受重力，加速度皆向下。樹固定在地面；切到 A 或 B，觀察樹如何往上加速。' : 'A 從靜止落下，B 先上升再下落；兩者加速度都向下。B 開始下落後，A 的向下速度更大，兩球距離仍以固定速率縮短。';
      if (scene === 2 && t > p.launch / M.g) title = '同向下落，A 比 B 更快';
    } else if (scene <= 2) {
      const other = observer === 'A' ? 'B' : 'A';
      const rv = M.relative(s[other], s[observer]).v;
      title = Math.abs(rv) < .005 ? '對方相對靜止，也是等速的特例' : `對方以 ${Math.abs(rv).toFixed(1)} m/s 等速${rv > 0 ? '向上' : '向下'}`;
      text = '兩者的重力加速度互相抵消，因此相對加速度為 0。地面與樹則以 +9.8 m/s² 向上加速；速度為零的起始瞬間也可以有加速度。';
    } else if (t < 1) {
      title = `先隨電梯一起向${p.liftA>0?'上':'下'}加速`;
      text = `螺絲目前固定在天花板，和電梯同速、同加速度，彼此相對靜止。t = 1.00 s 自動脫落；脫落時保留原本向${p.liftA>0?'上':'下'}的速度。`;
    } else if (observer === 'ground') {
      title = s.screw.v > 0 ? '螺絲脫落後，仍暫時向上飛' : '螺絲以重力加速度向下加速';
      text = `脫落時螺絲繼承電梯向${p.liftA>0?'上':'下'} ${Math.abs(p.liftV + p.liftA).toFixed(1)} m/s 的速度；此後加速度為 −9.8 m/s²。電梯仍向${p.liftA>0?'上':'下'}加速，螺絲最後接觸電梯地板。`;
    } else if (observer === 'lift') {
      title = `螺絲以 ${(M.g + p.liftA).toFixed(1)} m/s² 向下加速`;
      text = p.liftA>0 ? '脫落瞬間，螺絲相對電梯的初速度為 0；電梯向上加速，使螺絲相對電梯以 g + 2 = 11.8 m/s² 向下加速。' : '脫落瞬間，螺絲相對電梯的初速度為 0；電梯也向下加速，但加速度大小小於 g，因此螺絲仍會以 g − 2 = 7.8 m/s² 向下追上電梯地板。';
    } else {
      title = '電梯地板向上追上螺絲';
      text = `螺絲視角中，電梯以 +${(M.g + p.liftA).toFixed(1)} m/s² 向上加速；地面則以 +9.8 m/s² 向上加速。`;
    }
    $('insight-title').textContent = title; $('insight').textContent = text;
    const b = s[target], o = s[observer], r = M.relative(b, o);
    $('calculation').textContent = `${b.name}：a′ = (${signed(b.a)}) − (${signed(o.a)}) = ${signed(r.a)} m/s²`;
    const event = M.ballEvent(p);
    const eventCopy = { ascending: 'B 上升途中與 A 相遇', apex: 'B 恰在最高點與 A 相遇', descending: 'B 下落途中被 A 追上', ground: 'B 先回到地面，空中尚未相遇' }[event.phase];
    $('scene-note').textContent = scene === 1 ? '兩人同時自由落體；互看等速，樹相對兩人向上加速。' : scene === 2 ? `預期終點：${eventCopy}｜t = ${event.time.toFixed(2)} s` : `t = 1.00 s 脫落；${Math.sqrt(2 * p.cabin / (M.g + p.liftA)).toFixed(2)} s 後接觸電梯地板。`;
    if (scene === 2) {
      $('ball-event').textContent = `最高點：${event.apex.toFixed(2)} s；${eventCopy}：${event.time.toFixed(2)} s。下落中相遇條件：v₀²/g < h₀ < 2v₀²/g。`;
      $('jump-apex').disabled = event.apex > end();
      $('ball-preset').value = M.ballPresets.find(q => q.height === p.height && q.launch === p.launch)?.id || 'custom';
    }
  }
  function canvas(id) {
    const c = $(id), box = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, box.width), height = Math.max(1, box.height);
    if (c.width !== Math.round(width * dpr) || c.height !== Math.round(height * dpr)) { c.width = Math.round(width * dpr); c.height = Math.round(height * dpr); }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    return { ctx, w: width, h: height };
  }
  function label(ctx, text, x, y, color = '#405a62', align = 'left', size = 12) {
    ctx.font = `600 ${size}px "Microsoft JhengHei", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = '#f3f7f8'; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function arrow(ctx, x, y, value, scale, color, text, queue, obstacles) {
    if (Math.abs(value) < 1e-7) {
      if(text==='a′')queue.push({text:'a′ = 0\nm/s²',x:x+32,y:y-24,color,size:14});
      return;
    }
    const length = Math.abs(value * scale), to = y - value * scale, dir = Math.sign(value);
    const head = Math.min(16, length * .55), halfHead = Math.min(10, head * .7), halfShaft = Math.min(3, halfHead * .38);
    const neck = to + dir * head;
    // One filled outline: no stroked shaft can protrude beyond the arrow tip.
    ctx.save(); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x - halfShaft, y); ctx.lineTo(x - halfShaft, neck);
    ctx.lineTo(x - halfHead, neck); ctx.lineTo(x, to); ctx.lineTo(x + halfHead, neck);
    ctx.lineTo(x + halfShaft, neck); ctx.lineTo(x + halfShaft, y); ctx.closePath(); ctx.fill(); ctx.restore();
    obstacles.push({ x: x - halfHead - 3, y: Math.min(y, to) - 3, w: halfHead * 2 + 6, h: length + 6 });
    queue.push(text==='a′' ? {text:`a′\n${Math.abs(value).toFixed(1)} m/s²`,x:x+56,y:(y+to)/2,color,size:15} : { text, x, y: y + dir * 19, color, size: 15 });
  }
  function placeSceneLabels(ctx, queue, obstacles, w, h) {
    const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const item of queue) {
      const size = Math.max(14, item.size || 14);
      ctx.font = `600 ${size}px "Microsoft JhengHei", sans-serif`;
      const lines=item.text.split('\n'),lineHeight=size*1.3;
      const width = Math.max(...lines.map(line=>ctx.measureText(line).width)) + 8, height = lineHeight*lines.length + 8;
      let spot;
      // Prefer a nearby clear position, accounting for all arrows and previously placed words.
      for (const dy of [0, -22, 22, -44, 44, -66, 66, -88, 88]) {
        for (const dx of [0, -24, 24, -48, 48]) {
          const box = { x: Math.max(48, Math.min(w - width - 8, item.x + dx - width / 2)), y: item.y + dy - height / 2, w: width, h: height };
          if (box.y < 54 || box.y + height > h - 66 || obstacles.some(b => overlaps(box, b))) continue;
          spot = box; break;
        }
        if (spot) break;
      }
      if(!spot){
        for(let y=58;y+height<h-66&&!spot;y+=12)for(let x=48;x+width<w-8;x+=12){
          const box={x,y,w:width,h:height};if(!obstacles.some(b=>overlaps(box,b))){spot=box;break;}
        }
      }
      if (!spot) continue;
      obstacles.push(spot);
      lines.forEach((line,i)=>label(ctx,line,spot.x+width/2,spot.y+4+lineHeight*(i+.5),item.color,'center',size));
    }
  }
  function person(ctx, x, y, color) {
    ctx.save(); ctx.translate(x,y); ctx.scale(1.7,1.7); x=0; y=0;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y - 26, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - 19); ctx.lineTo(x, y - 8); ctx.moveTo(x - 10, y - 11); ctx.lineTo(x, y - 17); ctx.lineTo(x + 10, y - 11); ctx.moveTo(x - 7, y); ctx.lineTo(x, y - 8); ctx.lineTo(x + 7, y); ctx.stroke();
    ctx.restore();
  }
  function tree(ctx, x, y) {
    ctx.save(); ctx.translate(x,y); ctx.scale(1.25,1.55); x=0; y=0;
    ctx.fillStyle = '#897658'; ctx.fillRect(x - 3, y - 20, 6, 20); ctx.fillStyle = '#76977a';
    ctx.beginPath(); ctx.moveTo(x, y - 55); ctx.lineTo(x - 20, y - 15); ctx.lineTo(x + 20, y - 15); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function screw(ctx,x,y) {
    ctx.save();ctx.translate(x,y);
    // Tip marks the simulated point; the enlarged icon ends exactly at the floor on contact.
    const metal=ctx.createLinearGradient(-9,0,9,0);
    metal.addColorStop(0,'#667781');metal.addColorStop(.45,'#ecf1f3');metal.addColorStop(1,'#8998a0');
    ctx.fillStyle=metal;ctx.strokeStyle='#485d68';ctx.lineWidth=1.8;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(-7,-31);ctx.lineTo(7,-31);ctx.lineTo(6,-9);ctx.lineTo(0,0);ctx.lineTo(-6,-9);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#566c78';ctx.lineWidth=2;
    for(let y=-26;y<=-10;y+=5){ctx.beginPath();ctx.moveTo(-7,y+2);ctx.lineTo(7,y-2);ctx.stroke();}
    ctx.fillStyle=metal;ctx.strokeStyle='#485d68';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-14,-41,28,11,4);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#344955';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-7,-36);ctx.lineTo(7,-36);ctx.stroke();
    ctx.restore();
  }
  function drawScene(s) {
    const {ctx, w, h} = canvas('scene-canvas'), range = frameRanges[observer], o = s[observer];
    const baseUnit = (h - (scene===3?160:270)) / range.span;
    const unit = scene===3 ? Math.min(baseUnit*2,(h-180)/range.cabinSpan) : baseUnit;
    // Track the rendered screw as well as its mathematical reference point.
    // This keeps the enlarged screw stationary while the entire cabin approaches it.
    const screwIconOffset=scene===3&&observer==='screw'?43*Math.max(0,Math.min(1,(s.screw.y-s.lift.y)/p.cabin)):0;
    const Y = relativeY => scene===3 ? (h-20)/2+(range.cabinCenter-relativeY)*unit-screwIconOffset : 130+(range.center+range.span/2-relativeY)*unit;
    const queue = [], obstacles = [];
    const at = b => Y(b.y - o.y), floorY = at(s.ground);
    ctx.fillStyle = '#eef4f5'; ctx.fillRect(0, 0, w, h);
    // Grid belongs to the observer's coordinate system; the tree and ground move with the world.
    const tick = [2, 5, 10, 20, 50, 100].find(step => step >= (scene === 3 ? 2 : 10) && step * unit >= 24) || 100;
    $('scale-note').textContent = `｜ 固定尺度：${tick} m／格`;
    const axisCenter=scene===3?range.cabinCenter:range.center;
    for (let n = Math.ceil((axisCenter - range.span / 2) / tick) * tick; n <= axisCenter + range.span / 2; n += tick) {
      if(Y(n)<58||Y(n)>h-66)continue;
      const y = Y(n); ctx.strokeStyle = n === 0 ? '#adc3c9' : '#dce7ea'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(46, y); ctx.lineTo(w - 15, y); ctx.stroke(); label(ctx, String(n), 38, y, '#71878e', 'right', 10);
    }
    label(ctx, 'y′ (m)', 12, 38, '#64777d', 'left', 10);
    ctx.fillStyle = '#dce5d5'; ctx.fillRect(47, floorY, w - 60, Math.max(0, h - floorY));
    ctx.strokeStyle = '#75936e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(47, floorY); ctx.lineTo(w - 13, floorY); ctx.stroke();
    const gx = 48 + (w - 64) * .15;
    const groundVisible=floorY>=140&&floorY<h-100;
    if(groundVisible){tree(ctx,gx,floorY);queue.push({text:'地面／樹',x:gx,y:floorY+20,color:'#497158'});obstacles.push({x:gx-27,y:floorY-87,w:54,h:88});}
    else {
      const start=M.state(scene,p,0);
      const groundChange=(s.ground.y-o.y)-(start.ground.y-start[observer].y);
      // The lower strip is a compressed overview, separate from the enlarged cabin ruler.
      const bandY=h-78-groundChange*1.5;
      ctx.fillStyle='#e4eddf';ctx.fillRect(47,bandY,w-60,h-bandY);
      ctx.strokeStyle='#aac49b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(47,bandY);ctx.lineTo(w-13,bandY);ctx.stroke();
      queue.push({text:'地面示意',x:gx,y:h-95,color:'#497158'});
    }
    const X = fraction => 48 + (w - 64) * fraction;
    const xs = scene === 3 ? { ground: gx, lift: X(.45), screw: X(.74) } : scene === 2 ? { ground: gx, A: X(.59), B: X(.59) } : { ground: gx, A: X(.46), B: X(.80) };
    let cabinLeft, cabinRight;
    if (scene === 3) {
      const cabinHeight=p.cabin*unit, cabinWidth=Math.min(cabinHeight*.78,(w-64)*.42);
      const left = X(.65)-cabinWidth/2, right = left+cabinWidth, fy = at(s.lift), cy = fy-cabinHeight;
      cabinLeft=left;cabinRight=right;xs.lift=left+cabinWidth*.28;xs.screw=left+cabinWidth*.73;
      const wall=ctx.createLinearGradient(left,0,right,0);wall.addColorStop(0,'#cbd9de');wall.addColorStop(.18,'#f7fafb');wall.addColorStop(.8,'#e8eff2');wall.addColorStop(1,'#c1d0d7');
      ctx.fillStyle=wall;ctx.fillRect(left,cy,cabinWidth,cabinHeight);
      ctx.strokeStyle='#b7c8d0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo((left+right)/2,cy+8);ctx.lineTo((left+right)/2,fy-6);ctx.stroke();
      ctx.strokeStyle = '#63818c'; ctx.lineWidth = 5; ctx.strokeRect(left, cy, right - left, fy - cy);
      ctx.fillStyle='#526f7b';ctx.fillRect(left-3,fy-3,cabinWidth+6,7);
      ctx.strokeStyle = '#a6b9bf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo((left+right)/2, cy); ctx.lineTo((left+right)/2, -10); ctx.stroke();
      const personScale=Math.min(1,(cabinHeight-14)/58,cabinWidth*.46/42);
      ctx.save();ctx.translate(xs.lift,fy);ctx.scale(personScale,personScale);person(ctx,0,0,'#126c9a');ctx.restore();
      queue.push({text: '電梯地板', x: xs.lift, y: fy + 20, color: '#126c9a'});
      obstacles.push({x:xs.lift-21*personScale,y:fy-58*personScale,w:42*personScale,h:60*personScale});
    }
    for (const [key, b] of Object.entries(s)) {
      const x = xs[key], y = at(b), r = M.relative(b, o);
      if ($('show-trails').checked && key !== 'ground' && key !== 'lift') {
        ctx.fillStyle = b.color;
        for (let u = 0; u < t - 1e-7; u += .2) { const past = M.state(scene, p, u); const yy = Y(past[key].y - past[observer].y); ctx.globalAlpha = .22; ctx.beginPath(); ctx.arc(x, yy, 3, 0, 2*Math.PI); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (key === 'A' || key === 'B') {
        if (scene === 1) person(ctx, x, y, b.color);
        else { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(x, y, key === 'A' ? 21 : 17, 0, 2*Math.PI); ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke(); }
        queue.push({text: key, x: x + (scene === 2 ? (key === 'A' ? -34 : 34) : 0), y: y - (scene === 1 ? 72 : 0), color:b.color, size:18});
        obstacles.push({x:x-23,y:y-(scene===1?59:23),w:46,h:scene===1?61:46});
      }
      if (key === 'screw') {
        // Fit the enlarged icon between the ceiling and floor: its head begins at
        // the ceiling and its tip reaches the floor. Numerical y remains the model point.
        const fraction=Math.max(0,Math.min(1,(b.y-s.lift.y)/p.cabin));
        const tipY=y+43*fraction;
        screw(ctx,x,tipY);
        queue.push({text:'螺絲', x:x+32, y:tipY-24, color:b.color,size:16});
        obstacles.push({x:x-17,y:tipY-44,w:34,h:47});
      }
      if (key === observer) {
        ctx.strokeStyle = '#087b75'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, 28, 0, 2*Math.PI); ctx.stroke(); ctx.setLineDash([]);
        // The selected view is named above the canvas; a ring identifies its object without another overlapping caption.
      }
      let vx = x - Math.max(25, (w-64)*.075), ax = x + Math.max(25, (w-64)*.075);
      if (scene === 2 && key === 'A') { vx = X(.35); ax = X(.45); }
      if (scene === 2 && key === 'B') { vx = X(.78); ax = X(.90); }
      if (scene === 3 && key === 'lift') { vx = cabinLeft-58; ax = cabinLeft-26; }
      if (scene === 3 && key === 'screw') { vx = cabinRight+26; ax = cabinRight+58; }
      if (key === 'ground') { vx = x - 38; ax = x + 38; }
      const vectorY = key === 'ground' ? (groundVisible ? y - 26 : h-180) : y;
      if ($('show-v').checked) arrow(ctx, vx, vectorY, r.v, velocityScale, '#126c9a', 'v′', queue, obstacles);
      if ($('show-a').checked) arrow(ctx, ax, vectorY, r.a, 4.6, '#bd6030', 'a′', queue, obstacles);
    }
    placeSceneLabels(ctx, queue, obstacles, w, h);
  }
  function drawChart() {
    const {ctx, w, h} = canvas('velocity-chart'), left = 53, right = w - 24, top = 30, bottom = h - 48;
    const values = [];
    for (let j = 0; j <= 160; j++) { const u = end() * j / 160, s = M.state(scene, p, u); values.push({ t: u, v: s[target].v - s[observer].v }); }
    if (scene === 3) { const s = M.state(scene,p,1); values.push({t:1,v:s[target].v-s[observer].v}); values.sort((a,b)=>a.t-b.t); }
    const min = Math.min(0, ...values.map(v => v.v)), max = Math.max(0, ...values.map(v => v.v)), pad = Math.max(2, (max - min)*.15);
    const lo = min - pad, hi = max + pad, X = u => left + u/end()*(right-left), Y = v => bottom - (v-lo)/(hi-lo)*(bottom-top);
    label(ctx, 'v′ (m/s)', 2, 10, '#64777d', 'left', 11);
    for (let j=0;j<=4;j++) { const val=lo+(hi-lo)*j/4,y=Y(val);ctx.strokeStyle='#e3e9e7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();label(ctx,val.toFixed(1),left-7,y,'#64777d','right',10); }
    ctx.strokeStyle='#8aa1a8';ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.lineTo(right,bottom);ctx.moveTo(left,Y(0));ctx.lineTo(right,Y(0));ctx.stroke();
    for(let j=0;j<=4;j++)label(ctx,(end()*j/4).toFixed(2),X(end()*j/4),bottom+13,'#64777d','center',10);
    label(ctx,'t (s)',right,h-10,'#64777d','right',14);
    ctx.strokeStyle=M.state(scene,p,t)[target].color;ctx.lineWidth=2.5;ctx.beginPath();values.forEach((v,i)=>i===0?ctx.moveTo(X(v.t),Y(v.v)):ctx.lineTo(X(v.t),Y(v.v)));ctx.stroke();
    ctx.setLineDash([4,4]);ctx.strokeStyle='#526971';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(t),top);ctx.lineTo(X(t),bottom);ctx.stroke();ctx.setLineDash([]);
    const s=M.state(scene,p,t);ctx.fillStyle=s[target].color;ctx.beginPath();ctx.arc(X(t),Y(s[target].v-s[observer].v),4,0,Math.PI*2);ctx.fill();
    if(scene===3)label(ctx,'脫落',X(1),13,'#bd6030','center',10);
  }
  function render() {
    const s = M.state(scene, p, t);
    $('play').textContent = running ? '暫停' : t >= end()-1e-8 ? '重新播放' : t === 0 ? '開始' : '繼續';
    $('step').disabled = t >= end()-1e-8;
    $('time').textContent = t.toFixed(2) + ' s'; $('timeline').max = end(); $('timeline').value = t;
    $('end-time').textContent = `終點 ${end().toFixed(2)} s`;
    $('phase').textContent = phase(); $('view-title').textContent = observer==='ground' ? '地面觀察者' : observer==='lift' ? '電梯內觀察者' : `${s[observer].name}的視角`;
    $('table-frame').textContent = `相對於${s[observer].name}`;
    document.querySelectorAll('#views [data-observer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observer===observer)));
    $('readouts').innerHTML = Object.entries(s).map(([key,b])=>{const r=M.relative(b,s[observer]);return `<tr data-observer="${key===observer}"><td style="color:${b.color}">${b.name}${key===observer?' ◉':''}</td><td>${signed(r.y)}</td><td>${signed(r.v)}</td><td>${signed(r.a)}</td></tr>`;}).join('');
    explain(s); drawScene(s); drawChart();
  }
  document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>{
    scene=Number(b.dataset.scene);observer='ground';target=scene===3?'screw':'A';
    document.querySelectorAll('[data-scene]').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));configure();
  }));
  $('views').addEventListener('click',e=>{const b=e.target.closest('[data-observer]');if(!b)return;observer=b.dataset.observer;if(target===observer)target=scene===3?(observer==='screw'?'lift':'screw'):(observer==='A'?'B':'A');$('target').value=target;render();});
  $('parameters').addEventListener('input',e=>{const key=e.target.dataset.param;if(!key)return;const spec=specs[scene].find(s=>s[0]===key),value=Number(e.target.value);if(!Number.isFinite(value))return;p[key]=Math.min(spec[3],Math.max(spec[2],value));$('value-'+key).textContent=p[key]+' '+spec[5];reset();});
  $('parameters').addEventListener('change',e=>{
    if(e.target.id !== 'ball-preset') return;
    const preset=M.ballPresets.find(q=>q.id===e.target.value); if(!preset) return;
    p.height=preset.height;p.launch=preset.launch;configure();
  });
  $('parameters').addEventListener('click',e=>{
    const mode=e.target.closest('[data-lift]');
    if(mode){const direction=mode.dataset.lift==='up'?1:-1;p.liftA=direction*2;p.liftV=direction*4;p.cabin=4;configure();return;}
    if(e.target.id !== 'jump-apex') return;
    running=false;last=null;t=Math.min(end(),p.launch/M.g);render();
  });
  $('play').addEventListener('click',()=>{if(t>=end()-1e-8)t=0;running=!running;last=null;render();});
  $('reset').addEventListener('click',reset);
  $('expand').addEventListener('click',()=>{
    const wide=document.querySelector('.ra-app').classList.toggle('ra-wide');
    $('expand').textContent=wide?'恢復一般版面':'放大畫面';$('expand').setAttribute('aria-pressed',String(wide));
    render();
  });
  $('step').addEventListener('click',()=>{running=false;last=null;t=Math.min(end(),t+.1);render();});
  $('timeline').addEventListener('input',()=>{running=false;last=null;t=Math.max(0,Math.min(end(),Number($('timeline').value)||0));render();});
  $('target').addEventListener('change',()=>{target=$('target').value;render();});
  ['show-v','show-a','show-trails'].forEach(id=>$(id).addEventListener('change',render));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){running=false;last=null;render();}});
  new ResizeObserver(()=>render()).observe($('scene-canvas'));
  window.addEventListener('resize',render);
  function animate(now) {
    if(running && last!==null){t=Math.min(end(),t+Math.min((now-last)/1000,.1)*Number($('speed').value));if(t>=end())running=false;render();}
    last=now;requestAnimationFrame(animate);
  }
  configure();requestAnimationFrame(animate);
})();
