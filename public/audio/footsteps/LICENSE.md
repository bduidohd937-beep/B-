# Footstep recordings — Kenney CC0 1.0

These are original recorded game footstep effects, not AI-created or synthesized
from the noise oscillators used before V0.12.7.1. All five are shared under
**Creative Commons CC0 1.0 (public domain dedication)**, permitting commercial
use and redistribution without attribution.

- `concrete_a.b64`: Kenney **Impact Sounds**, original `footstep_concrete_000.ogg`.
  Source: https://kenney.nl/assets/impact-sounds
  Public GitHub copy: `shoemoney/commander-in-chief`,
  `assets/cc0_extra/sfx_impact/footstep_concrete_000.ogg`.
- `hard_a.b64`, `hard_b.b64`, `hard_c.b64`, `hard_d.b64`: Kenney
  **RPG Audio** (`footstep00.ogg`, `footstep02.ogg`, `footstep06.ogg`,
  `footstep09.ogg`).
  Source: https://kenney.nl/assets/rpg-audio
  Public GitHub copy: `euuuuuuan/moonshard-warden-public`,
  `src/assets/kenney-rpg-audio/`.

  Both upstream copies retain CC0 licensing/source documentation.

The data files use Base64 text wrapping the ORIGINAL Ogg Vorbis binary so
GitHub's UTF-8-only file upload mechanism can preserve exact audio bytes.
At runtime `src/recordedFootsteps.js` decodes them to AudioBuffers, after
which the game plays short unlooped samples. Replacing `*.b64` with true
`*.ogg` binaries is a future packaging optimization, not a license change.

Original license: https://creativecommons.org/publicdomain/zero/1.0/
