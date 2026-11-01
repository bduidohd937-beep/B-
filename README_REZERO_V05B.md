# B∞ RE:ZERO V0.5-B — FIRST CHASE (2026-11-01)

**State:** An intentionally small, playable horror-chase test. This does not finalize the story or art direction.

## What changed
- Fixed WASD using the camera's *actual local +X (right), -Z (forward)*; the initial security-room camera looks world +Z and the D key now moves left on the world map but **right on the screen**, as expected.
- New independent chase module `src/rezero/v05/chase.js`: grid A* derived from real level colliders, actual visibility rays, limited spotting, pursuit, last-known-position search, no wall clipping / no scene-teleport.
- Electrical breaker E interaction starts a power-failure scare, causes a humanoid entity to emerge from the dark rear electrical-room service passage, and sends it along a real path toward the electrical room.
- Player runs at 4.2 m/s while creature chases at 3.35 m/s. Normal corridors and the existing service/storage loop let the player escape.
- In the management storage area, get close to the rack and press E to hide; stay hidden for a few seconds to clear the **first-chase vertical slice**.
- Capture screen; replay from the electrical room rather than returning to the start of the level.
- Temporary 3D entity, footsteps/alert sound, emergency lighting, objectives and simple red ambience.

## How to play
`npm run dev -- --port 5186 --strictPort`

Visit `http://localhost:5186/B-/survive.html`.

1. Follow the stairs to the electrical room.
2. Approach the wall-mounted breaker and press E.
3. Upon alarm, turn and RUN through electrical-room south exit into the service corridor. The creature first appears from the rear service passage; retreat to the central corridor or take a risky alternative route.
4. Loop through the service maintenance room to the storage. Find the left-hand rack near x=-1.3,z=27 and press E to hide.
5. If captured, click retry to return to the electrical room (pre-scare checkpoint).

Controls: mouse look, WASD move, Shift sprint, C crouch, E interaction, F flashlight, M map, F3 debug overlay.

## Scope and validation limitations
- This is **first chase only**; power restore, security shutter final escape, real asset/animation/Foley and full level pacing are not implemented.
- The programmatic tests validate simulated navigation, camera direction and vision/capture rules; they do not prove subjective horror or mouse feel.
- Chrome headless smoke must pass independently. User's real-hardware play/video is required before marking the experience approved.
- Previous game/reboot branches remain unchanged, and this feature stays a Draft PR until approved.

## Technical note
The route graph is created from walkable world geometry, not separate visual-only portals. A* uses .5m cells and replans the target at bounded intervals to avoid per-frame heavy search.
