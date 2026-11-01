# B∞ RE:ZERO — FIRST ROOM V0.4.0

## Status

**Playable technical prototype, not an approved final art pass.** It is completely isolated from the legacy V0.12.7.2 game.

- Legacy entry: `/B-/` (original `index.html`, untouched)
- RE:ZERO entry: `/B-/rezero.html`
- Branch: `feat/rezero-v0.4-first-room`
- Base commit: `36b7de5ff94e3d17a5b31381c52058f40d30d83e`

## Run

```bash
npm install
npm run dev
```

Open the development-server URL followed by `/B-/rezero.html` (Vite base is `/B-/`).
For example, `http://localhost:5173/B-/rezero.html`.

```bash
npm test
npm run build
```

## Controls

- Start: click **근무 시작**
- WASD: move; mouse: look around; hold Shift: move faster
- E: interact with focused CCTV desk, control panel, logbook or room door
- F3: performance/debug overlay
- ESC: release mouse pointer

## Functional scope

1. Small standalone Three.js security room and visible concrete corridor.
2. Two physical 320×180 WebGL CCTV monitor feeds. CAM 01 updates roughly 8fps; CAM 02 is intentionally frozen after the initial frame.
3. Interactive CCTV terminal / test lamp: CAM 01's visual changes while CAM 02 remains stale. Evidence can be recorded after running the test.
4. Swinging door with passage restriction, keyboard/mouse controls, desk collision.
5. Procedurally generated grungy material texture, indoor and corridor practical lighting and sound generated with Web Audio.
6. Initial corridor noise is triggered on leaving the CCTV screen after recording evidence.
7. A logbook displaying investigation status.
8. Existing build remains available separately at `index.html`.

## Deliberately deferred

- Full 8-minute investigation; actual fire door investigation/return journey
- Observer / Listener enemy AI, chase/death and checkpoint logic
- GLB hero assets, professional hand-crafted PBR material library and final environment art
- Recorded bespoke Foley or premium voice work
- Real browser/frame-rate validation on user hardware

## Art source and license

All meshes, layouts and grunge textures are authored in repository code. No third-party GLB, licensed sound samples, or stock imagery were copied into this build. UI CSS optionally loads **Noto Sans KR** from Google Fonts (SIL Open Font License); browser fallbacks work without it.

**Quality gate:** build/test success does not imply art quality or horror-game playtest approval. First-room visual polish must be reviewed in a real browser and the next patch must address issues found in gameplay capture.


## V0.4.2-A — Seated Control (2026-11-01)

This **partial patch** introduces the security guard's interactive desk position, not the full first horror incident.

- Approach the swivel chair and press **E** to sit. Pressing E at the nearby CCTV terminal also enters seated control.
- While seated: normal OS cursor; click **전체 모니터**, **CAM 01 확대**, **CAM 02 확대**, **L-07 점검등**, **영상 이상 기록**.
- Hold **right mouse button** and move to look around the room without leaving the chair.
- Click **의자에서 일어서기** to restore the original FPS view and controls without pressing Escape.
- Camera orientation uses the actual Three.js camera's -Z direction, covered by math unit tests.
- CAM 02 remains one frozen captured frame. Recorded-loop footage, silhouette, event state, chase AI, investigation and ending are deferred to B/C/D stages.

### Verification

Tests: `npm test`. Build: `npm run build`. Automated Chrome smoke: `node scripts/smoke-rezero.mjs` (requires Chrome and playwright-core). The workflow produces `rezero-first-room-preview` when the browser capture succeeds.
Manual audio, framerate and mouse-feel validation on a real PC are still required.

**Old branches / production deployment are intentionally unchanged.**


## V0.4.2-B — First Presence (2026-11-01)

**Scope:** One partially revealed presence, without chase, attack or death. The scene is a test of atmosphere and spatial consistency, not the finished incident.

### How to trigger

1. Start the game at `/B-/rezero.html` and press **E** at the chair/monitor to enter the seated CCTV console.
2. Use the **L-07** lamp button at least once; select **CAM 02** and press **영상 이상 기록**.
3. Switch to **CAM 01 확대**. A dark human-like silhouette exists near the far fire-door end of the actual 3D corridor.
4. Remain with CAM 01 in view briefly. The same actor begins approaching along the corridor, giving spatial footsteps.
5. Turn toward the office door (hold **right mouse**, then move) for the handle event; you may also stand and enter the corridor for a brief direct encounter.
6. The actor withdraws. Re-selecting the cameras never creates duplicate actors.

### Event constraints

- The actor is only activated by completing the CCTV discrepancy evidence.
- A real 3D actor with a single shared position appears in CCTV and first-person view, never a full-screen overlay sprite.
- Initial observation phase lasts at least about 4.5s. Approach waits for about 2s of CAM01 visibility (30s safety fallback).
- The actor cannot pass through the office door in this patch. If the door is open, the closed-door handle animation is omitted.
- Audio events are generated by physical movement and position. In-game F3 shows the event phase for debugging.
- Current humanoid is deliberately rough procedural geometry, and footsteps are synthesized, not production assets.

### Pending

- Threat sensing/pursuit and meaningful use of door lock or diversion speaker (V0.4.2-C).
- Field investigation, logbook completion and proper checkpoint (V0.4.2-D).
- Real captured replay on CAM02 instead of one frozen still.
- Full browser click/visual audio quality and FPS inspection by the user on their own PC.


## V0.4.2-C — Security Response & Survival (2026-11-01)

**Status:** Survival-system prototype only. It does not close the first case or implement the final horror asset pass.

### Controls and strategy

1. Inspect L-07 and record the CAM 02 discrepancy; the actual corridor entity starts its approach as in B.
2. While seated in the physical CCTV console, use **경비실 문 잠그기** only when the office door is fully closed.
3. Once the presence is moving towards the office, use **복도 스피커 유인** to draw it toward the real speaker near the corridor far end. Broadcast cooldown is 16 seconds.
4. Unlocked office door can be opened using E. The locked door refuses E and makes a short latch sound.
5. In the corridor use **Shift** to sprint or hold **C** to crouch (left Ctrl also supported, but Ctrl+W can conflict with Chrome shortcuts). Walking and sprinting create positional sound events.
6. A metal locker near x=8.9 in the corridor is physical solid cover. Crouch to its office-side corner near x=8.0,z=2.3 to evade a creature on the far side; once the enemy passes the cover, it can spot you again.
7. If spotted the creature chases at about 2.28 m/s, slower than the player's 3.55 m/s sprint. It searches your last known position on losing sight.
8. Being caught in the corridor shows a retry screen. Click **CCTV 조사 이후부터 재시도**. The CCTV evidence remains saved; the creature and devices reset.

### Limitations

- Detection and patrol are designed for this **straight corridor only**, not general 3D pathfinding.
- The current speaker is temporary 3D geometry; effects are synthesized, not professional Foley.
- No complete safe exit, first incident resolution, story ending or multi-stage game yet (deferred to V0.4.2-D).
- GitHub build and unit tests are distinct from physical gameplay, sound and scare quality validation.
