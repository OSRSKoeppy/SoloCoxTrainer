// Region 12889. Coordinates are local to (3200, 5696), not model origins.
export const ROOM = { west:28, east:37, south:35, north:52 };
export const PRACTICE_TILES = [
  {x:28,y:38},{x:28,y:43},{x:28,y:45},{x:28,y:47},{x:28,y:50},
  {x:37,y:38},{x:37,y:41},{x:37,y:43},{x:37,y:45},{x:37,y:50},
];
export function roomWalkable(scene) {
  const cells=new Set(scene.tiles.filter(t=>!(t.settings&1)&&t.x>=ROOM.west&&t.x<=ROOM.east&&t.y>=ROOM.south&&t.y<=ROOM.north).map(t=>`${t.x},${t.y}`));
  // Solid corner and footprint objects; straight boundary walls do not fill a tile.
  for(const loc of scene.locations||[]) {
    if(!loc.blocks||![9,10,11,22].includes(loc.type))continue;
    const w=loc.rotation%2?loc.sizeY:loc.sizeX,h=loc.rotation%2?loc.sizeX:loc.sizeY;
    for(let x=loc.x;x<loc.x+w;x++)for(let y=loc.y;y<loc.y+h;y++)cells.delete(`${x},${y}`);
  }
  return cells;
}
export function meleeReach(p,r) {
  const alongX=p.x>=r.x&&p.x<r.x+r.w,alongY=p.y>=r.y&&p.y<r.y+r.h;
  return (alongX&&(p.y===r.y-1||p.y===r.y+r.h))||(alongY&&(p.x===r.x-1||p.x===r.x+r.w));
}
export function mapPoint(p) {return{x:88+(p.x+.5-33)*8,y:88-(p.y+.5-44.5)*8};}
export function mapTile(p) {return{x:Math.floor((p.x-88)/8+33),y:Math.floor((88-p.y)/8+44.5)};}
