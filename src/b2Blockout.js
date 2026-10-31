// V0.14.0-A: closed, asymmetric B2 blockout. This module is deliberately
// independent from garageLayout.js so Stage01/02 cannot inherit its solids.
export const B2_BOUNDS = Object.freeze({ minX: -22, maxX: 22, minZ: -38, maxZ: 22 });
export const B2_CEILINGS = Object.freeze({ general: 3.2, security: 2.9, zone317: 2.9, service: 2.8 });
export const B2_ZONES = Object.freeze({
  A: Object.freeze({ name: 'security', center: [-15, 16], size: [10, 9], ceiling: 2.9 }),
  B: Object.freeze({ name: 'parking', center: [0, 6], size: [25, 18], ceiling: 3.2 }),
  C: Object.freeze({ name: 'zone317', center: [-15, -11], size: [10, 10], ceiling: 2.9 }),
  D: Object.freeze({ name: 'electrical', center: [15, -19], size: [10, 9], ceiling: 3.2 }),
  E: Object.freeze({ name: 'service', center: [-16, 4], size: [3, 17], ceiling: 2.8 }),
  F: Object.freeze({ name: 'shutter', center: [0, -33], size: [8, 4], ceiling: 3.2 })
});
const wall = (x, z, halfX, halfZ, id) => Object.freeze({ x, z, halfX, halfZ, id });
export const B2_WALLS = Object.freeze([
  wall(-20, 16, .18, 4.5, 'A-west'), wall(-15, 20.5, 5, .18, 'A-north'),
  wall(-10, 17.5, .18, 3, 'A-east-upper'), wall(-10, 11.5, .18, .3, 'A-east-lower'), wall(-15, 11.5, 5, .18, 'A-south'),
  // B's side walls are split at the actual door openings. A doorway is an
  // absence of a solid, not a decorative marker placed on top of one.
  wall(-8.5, 8.5, .18, 4.5, 'B-west-upper'), wall(-8.5, 2.5, .18, 3.5, 'B-west-lower'),
  wall(8.5, 8.5, .18, 4.5, 'B-east-upper'), wall(8.5, 2.5, .18, 3.5, 'B-east-lower'),
  wall(-15, -6, 1.7, .18, 'C-north-west'), wall(-11.2, -6, 1.0, .18, 'C-north-east'),
  wall(-20, -11, .18, 5, 'C-west'),
  wall(-15, -16, 5, .18, 'C-south'), wall(-10, -11, .18, 5, 'C-east'),
  wall(10, -19, .18, 3.8, 'D-west-upper'), wall(10, -25, .18, 1.5, 'D-west-lower'), wall(20, -19, .18, 4.5, 'D-east'),
  wall(15, -23.5, 5, .18, 'D-south'), wall(-17.5, 4, .18, 8.5, 'E-west'),
  wall(-14.5, 12.5, .18, 3.5, 'E-east-upper'), wall(-14.5, -4.5, .18, 3.5, 'E-east-lower'),
  wall(-4, -28.8, .18, 1.1, 'F-west-upper'), wall(-4, -35.3, .18, .3, 'F-west-lower'),
  wall(4, -28.8, .18, 1.1, 'F-east-upper'), wall(4, -35.3, .18, .3, 'F-east-lower'),
  wall(-4, -35, 4, .18, 'F-south'), wall(4, -35, 4, .18, 'F-south-2')
]);
export const B2_DOORS = Object.freeze([
  { id: 'A-B', x: -10, z: 13, halfX: .7, halfZ: 1.1, connects: ['A','B'], locked: false },
  { id: 'B-C', x: -12.75, z: -6, halfX: .55, halfZ: .7, connects: ['B','C'], locked: false },
  { id: 'B-D', x: 10, z: -14, halfX: .7, halfZ: 1.2, connects: ['B','D'], locked: false },
  { id: 'C-F', x: -4, z: -31, halfX: 1.2, halfZ: .7, connects: ['C','F'], locked: false },
  { id: 'D-F', x: 4, z: -31, halfX: 1.2, halfZ: .7, connects: ['D','F'], locked: false },
  { id: 'A-E', x: -14.5, z: 8, halfX: .7, halfZ: 1.1, connects: ['A','E'], locked: true },
  { id: 'E-C', x: -14.5, z: -5.5, halfX: .7, halfZ: 1.1, connects: ['E','C'], locked: true }
]);
const inside = (x,z,r, o) => Math.abs(x-o.x) < o.halfX+r && Math.abs(z-o.z) < o.halfZ+r;
export function b2Blocked(x, z, radius = 0, { shortcutOpen = false, shutterOpen = false } = {}) {
  const r = Math.max(0, radius);
  if (!Number.isFinite(x) || !Number.isFinite(z) || x-r < B2_BOUNDS.minX || x+r > B2_BOUNDS.maxX || z-r < B2_BOUNDS.minZ || z+r > B2_BOUNDS.maxZ) return true;
  if (B2_WALLS.some(o => inside(x,z,r,o))) return true;
  if (!shortcutOpen && B2_DOORS.filter(d => d.locked).some(o => inside(x,z,r,o))) return true;
  if (!shutterOpen && Math.abs(z + 33) < .7 + r && Math.abs(x) < 4 + r) return true;
  return false;
}
export const B2_NAV_STEP = 1;
export function buildB2Grid(options = {}) {
  const cols = Math.floor((B2_BOUNDS.maxX-B2_BOUNDS.minX)/B2_NAV_STEP)+1;
  const rows = Math.floor((B2_BOUNDS.maxZ-B2_BOUNDS.minZ)/B2_NAV_STEP)+1;
  const blocked = new Uint8Array(cols*rows);
  for (let z=0; z<rows; z++) for (let x=0; x<cols; x++) blocked[x+z*cols] = b2Blocked(B2_BOUNDS.minX+x, B2_BOUNDS.minZ+z, .55, options) ? 1 : 0;
  return Object.freeze({ cols, rows, step: B2_NAV_STEP, blocked });
}
const b2Index = (x, z, cols) => x + z * cols;
const b2Cell = (value, min, max) => Math.max(0, Math.min(max, Math.round((value - min) / B2_NAV_STEP)));
export function buildB2Route(from, to, options = {}) {
  if (!from || !to) return [];
  const cols = Math.floor((B2_BOUNDS.maxX - B2_BOUNDS.minX) / B2_NAV_STEP) + 1;
  const rows = Math.floor((B2_BOUNDS.maxZ - B2_BOUNDS.minZ) / B2_NAV_STEP) + 1;
  const grid = buildB2Grid(options);
  const sx = b2Cell(from.x, B2_BOUNDS.minX, cols - 1), sz = b2Cell(from.z, B2_BOUNDS.minZ, rows - 1);
  const tx = b2Cell(to.x, B2_BOUNDS.minX, cols - 1), tz = b2Cell(to.z, B2_BOUNDS.minZ, rows - 1);
  const nearest = (x, z) => {
    const start = b2Index(x, z, cols);
    if (!grid.blocked[start]) return start;
    for (let radius = 1; radius <= 5; radius++) for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
      const nx = x + dx, nz = z + dz;
      if (nx >= 0 && nz >= 0 && nx < cols && nz < rows && !grid.blocked[b2Index(nx, nz, cols)]) return b2Index(nx, nz, cols);
    }
    return -1;
  };
  const start = nearest(sx, sz), goal = nearest(tx, tz);
  if (start < 0 || goal < 0 || start === goal) return [];
  const parent = new Int32Array(cols * rows); parent.fill(-1);
  const queue = new Int32Array(cols * rows); let head = 0, tail = 1; queue[0] = start; parent[start] = start;
  while (head < tail && parent[goal] < 0) {
    const current = queue[head++], x = current % cols, z = Math.floor(current / cols);
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue;
      const next = b2Index(nx, nz, cols);
      if (parent[next] !== -1 || grid.blocked[next]) continue;
      parent[next] = current; queue[tail++] = next;
    }
  }
  if (parent[goal] < 0) return [];
  const route = []; let current = goal;
  while (current !== start && route.length < cols * rows) {
    const x = current % cols, z = Math.floor(current / cols);
    route.push({x:B2_BOUNDS.minX+x*B2_NAV_STEP,z:B2_BOUNDS.minZ+z*B2_NAV_STEP}); current = parent[current];
  }
  return route.reverse();
}
