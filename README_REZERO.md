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
