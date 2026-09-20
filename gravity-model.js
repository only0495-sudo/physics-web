(function (root) {
  'use strict';
  const G = 6.6743e-11, M = 6e17, mass = 6e14, epsilon = 4, radius = 18, dt = 1 / 480;
  function accelerations(bodies, mutual = true) {
    const a = bodies.map(p => {
      const k = -G * M / Math.pow(p.x*p.x + p.y*p.y + epsilon*epsilon, 1.5);
      return {x: k*p.x, y: k*p.y};
    });
    if (mutual) for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++) {
      const x=bodies[j].x-bodies[i].x, y=bodies[j].y-bodies[i].y;
      const k=G*mass/Math.pow(x*x+y*y+epsilon*epsilon,1.5);
      a[i].x+=k*x; a[i].y+=k*y; a[j].x-=k*x; a[j].y-=k*y;
    }
    return a;
  }
  // Kick–drift–kick leapfrog. All positions, times and masses use SI units.
  function step(bodies, mutual = true) {
    const a=accelerations(bodies,mutual);
    bodies.forEach((p,i)=>{p.vx+=a[i].x*dt/2;p.vy+=a[i].y*dt/2;p.x+=p.vx*dt;p.y+=p.vy*dt;});
    const survivors=bodies.filter(p=>Math.hypot(p.x,p.y)>radius && Number.isFinite(p.x+p.y+p.vx+p.vy));
    const b=accelerations(survivors,mutual);
    survivors.forEach((p,i)=>{p.vx+=b[i].x*dt/2;p.vy+=b[i].y*dt/2;});
    return survivors;
  }
  const circularSpeed=r=>Math.sqrt(G*M*r*r/Math.pow(r*r+epsilon*epsilon,1.5));
  const api={G,M,mass,epsilon,radius,dt,accelerations,step,circularSpeed};
  if(typeof module==='object') module.exports=api; else root.GravityModel=api;
})(globalThis);
