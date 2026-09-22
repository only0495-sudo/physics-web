(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const LIMIT = 6;
  let scale = 42, cx = 320, cy = 320;
  const directions = {right:[1,0],left:[-1,0],up:[0,1],down:[0,-1]};
  const keys = {ArrowRight:'right',ArrowLeft:'left',ArrowUp:'up',ArrowDown:'down'};
  let target, path = [[0,0]], moves = [];
  const point = ([x,y]) => [cx+x*scale,cy-y*scale];
  const equation = (x,y) => `${x}î ${y < 0 ? '−' : '+'} ${Math.abs(y)}ĵ`;
  const position = () => path[path.length-1];
  const arrived = () => position()[0] === target[0] && position()[1] === target[1];
  function arrow(a,b,color,width=4,dash='') {
    if(a[0]===b[0] && a[1]===b[1]) return '';
    const [x1,y1]=point(a),[x2,y2]=point(b),angle=Math.atan2(y2-y1,x2-x1);
    const length=width===2?7:13,spread=width===2?3.5:6;
    const bx=x2-length*Math.cos(angle),by=y2-length*Math.sin(angle);
    return `<path d="M${x1},${y1} L${bx},${by}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?'stroke-dasharray="'+dash+'"':''}/><path d="M${x2},${y2} L${bx-spread*Math.sin(angle)},${by+spread*Math.cos(angle)} L${bx+spread*Math.sin(angle)},${by-spread*Math.cos(angle)} Z" fill="${color}"/>`;
  }
  function draw() {
    // Fit origin, target and the entire route with equal horizontal/vertical scale.
    let minX=Math.min(0,target[0]),maxX=Math.max(0,target[0]);
    let minY=Math.min(0,target[1]),maxY=Math.max(0,target[1]);
    for(const [x,y] of path){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    const span=Math.max(5,maxX-minX+2.6,maxY-minY+2.6);
    scale=544/span;cx=320-(minX+maxX)*scale/2;cy=320+(minY+maxY)*scale/2;
    let html='';
    const xmin=Math.max(-LIMIT,Math.ceil((48-cx)/scale)),xmax=Math.min(LIMIT,Math.floor((592-cx)/scale));
    const ymin=Math.max(-LIMIT,Math.ceil((cy-592)/scale)),ymax=Math.min(LIMIT,Math.floor((cy-48)/scale));
    for(let x=xmin;x<=xmax;x++){
      const px=cx+x*scale;
      html+=`<path d="M${px},48 V592" stroke="#e8edf4" stroke-width="1"/>`;
      if(x)html+=`<text x="${px}" y="${cy+21}" text-anchor="middle">${x}</text>`;
    }
    for(let y=ymin;y<=ymax;y++){
      const py=cy-y*scale;
      html+=`<path d="M48,${py} H592" stroke="#e8edf4" stroke-width="1"/>`;
      if(y)html+=`<text x="${cx-15}" y="${py+5}" text-anchor="end">${y}</text>`;
    }
    html+=arrow([(36-cx)/scale,0],[(602-cx)/scale,0],'#b5c1d0',2)+arrow([0,(cy-604)/scale],[0,(cy-36)/scale],'#b5c1d0',2);
    html+=`<text x="612" y="${cy+5}">x</text><text x="${cx-5}" y="24">y</text><text x="${cx-18}" y="${cy+22}">O</text>`;
    const reveal=$('decompose').checked||arrived();
    if(reveal){
      html+=arrow([0,0],[target[0],0],'#087da7',4,'7 5')+arrow([target[0],0],target,'#b45b18',4,'7 5');
    }
    // Unit arrows record the route; the translucent target remains a distinct resultant.
    for(let i=1;i<path.length;i++)html+=arrow(path[i-1],path[i],'#8298ac',2);
    html+=arrow([0,0],target,'#7852cc',5);
    const [tx,ty]=point(target),[px,py]=point(position());
    html+=`<circle cx="${tx}" cy="${ty}" r="14" fill="none" stroke="#7852cc" stroke-width="2" stroke-dasharray="3 3"/><circle cx="${cx}" cy="${cy}" r="4" fill="#243d61"/><circle cx="${px}" cy="${py}" r="10" fill="${arrived()?'#21846a':'#243d61'}" stroke="white" stroke-width="3"/>`;
    $('drawing').innerHTML=html;
    $('drawing').setAttribute('font-size','16');$('drawing').setAttribute('fill','#718097');
    $('board-desc').textContent=`目標終點 (${target.join(', ')})，目前位置 (${position().join(', ')})。向右是正 x，向上是正 y，每格一單位。`;
  }
  function render(note) {
    const [x,y]=position(),counts={right:0,left:0,up:0,down:0};
    for(const move of moves)counts[move]++;
    $('x-value').textContent=`${x} î`;$('y-value').textContent=`${y} ĵ`;
    $('x-count').textContent=`右 ${counts.right} − 左 ${counts.left} = ${x}`;
    $('y-count').textContent=`上 ${counts.up} − 下 ${counts.down} = ${y}`;
    $('equation').textContent=equation(x,y);$('steps').textContent=moves.length;
    $('position').textContent=`目前 (${x}, ${y})`;
    $('badge').textContent=arrived()?'已抵達！':'探索中';
    $('undo').disabled=!moves.length;
    $('answer').hidden=!($('decompose').checked||arrived());
    $('answer').textContent=`目標向量 = ${equation(...target)}。水平分量 ${target[0]}，鉛直分量 ${target[1]}。`;
    $('message').textContent=note||(arrived()?`抵達了！${equation(...target)} 就是目標向量。你走了 ${moves.length} 步，最少需要 ${Math.abs(x)+Math.abs(y)} 步；繞路不改變位移。`:'看一看紫色箭頭，試著走到它的終點。');
    draw();
  }
  function move(direction){
    const [dx,dy]=directions[direction],[x,y]=position();
    if(Math.abs(x+dx)>LIMIT||Math.abs(y+dy)>LIMIT){render('已到座標平面的邊界，換個方向繼續走。');return;}
    path.push([x+dx,y+dy]);moves.push(direction);render();
  }
  function reset(){path=[[0,0]];moves=[];render();}
  function newTarget(){
    const choices=[];
    for(let x=-5;x<=5;x++)for(let y=-5;y<=5;y++){
      if((x||y)&&(!target||x!==target[0]||y!==target[1]))choices.push([x,y]);
    }
    target=choices[Math.floor(Math.random()*choices.length)];$('decompose').checked=false;reset();
  }
  document.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('click',()=>move(button.dataset.direction)));
  document.addEventListener('keydown',event=>{
    if($('unit-scenario').hidden||!keys[event.key]||event.altKey||event.ctrlKey||event.metaKey||event.target.matches('input,select,textarea,[contenteditable="true"]'))return;
    event.preventDefault();if(!event.repeat)move(keys[event.key]);
  });
  $('undo').addEventListener('click',()=>{if(moves.length){moves.pop();path.pop();render();}});
  $('reset').addEventListener('click',reset);$('new').addEventListener('click',newTarget);
  $('decompose').addEventListener('change',()=>render());
  newTarget();
})();
