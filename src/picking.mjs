const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function convexHull(points){
 const sorted=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>a.x-b.x||a.y-b.y);
 if(sorted.length<3)return sorted;
 const half=items=>{const hull=[];for(const p of items){while(hull.length>1&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}return hull;};
 const lower=half(sorted),upper=half([...sorted].reverse());return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
export function silhouetteHit(p,hull,tolerance=6){
 if(hull.length<3)return false;
 let inside=true;
 for(let i=0;i<hull.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length];if(cross(a,b,p)<0)inside=false;
  const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
  if((p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2<=tolerance*tolerance)return true;
 }
 return inside;
}
