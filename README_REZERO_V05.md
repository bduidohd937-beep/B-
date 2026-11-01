# RE:ZERO V0.5-A — SURVIVE THE NIGHT / UNDERGROUND ROUTE BLOCKOUT

**Status:** implementation candidate / route prototype only, not the completed horror game.

## Version isolation
- Original B∞ `index.html`: untouched
- Earlier RE:ZERO security office `rezero.html`: untouched
- V0.5-A independently accessible at **`/B-/survive.html`**
- Branch `feat/rezero-v0.5a-maintenance-map`, based on V0.4.2-C commit `78aa96ddc1135d82d316454aed38892110ffb4fd`
- Nothing merged into main or existing Draft PRs

## Prototype route
A 경비실 → B 계단실 → C 지하 중앙복도 → D 전기실 → F 정비 우회통로/정비실 → E 관리 창고 → C 중앙복도 → B 계단실 → A 경비실.

The C–D–F–E–C loop is fully traversable. A blocked G 설비 구역 entrance is only a later enemy spawn concept, not a playable area. Physical wall positions and collision boxes are derived from one area/portal map definition.

The emergency security shutter at the stairs is **open** for route testing. No power failure, quest item, monster, chase, or forced shutdown event is implemented in V0.5-A.

## Start locally
```bash
npm install
npm run dev -- --port 5186 --strictPort
```
Visit **http://localhost:5186/B-/survive.html** (not `/B-/` or `/B-/rezero.html`).

## Controls
- Click **지하층 동선 점검 시작**
- WASD move, mouse look, hold Shift sprint, hold C crouch
- F flashlight, M overhead map, F3 diagnostics, ESC release pointer
- Walk through D (electrical), F (service), E (storage), return to A (guard) to finish the movement proof

## Test plan
- `npm test` includes `tests/rezeroV05Map.test.js` which simulates collision-constrained traversal across the loop and a second return route; it also checks seals, stair height and legacy entry preservation
- `npm run build` must bundle all three HTML entry points
- Dedicated Chrome workflow `RE:ZERO V0.5 Underground Map Chrome` checks WebGL mounting, start/map toggle and logs JS errors, and uploads a screenshot artifact
- Manual gamepad? **Not supported**. PC keyboard and mouse are needed for route feedback.

## Visual asset and scope notice
3D geometry, simple PBR materials and procedural grime are built in code. No professional GLB models or licensed sound files were incorporated. Sound is a synthetic temporary hum/step, not a horror soundscape. This version tests routes, collisions and lighting legibility, **not whether it scares players**.

## Next gate
V0.5-B requires manual confirmation that the first forced chase has at least two usable path options, an actual hiding location, fair monster speed/response and no geometry tunneling. The next feature must not ship before the map is tested in a browser.
