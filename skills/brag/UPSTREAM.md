# Upstream source and assets

This skill is vendored from [latent-spaces/brag](https://github.com/latent-spaces/brag) at commit `cb89b9f44309b0bf4e3cb89e685fadf80c7999ed` (2026-10-01). The upstream `skills/brag` tree is `cf665eadb7024c8bf88b3b0637f996e68d220b1d`.

The skill and scripts are distributed under the upstream MIT license; see [LICENSE](LICENSE). The included sound effects are identified as CC0 in upstream `references/audio.md` (Kenney assets and the keyboard soundpack).

The upstream music tracks and generated music-cue presets are not included. Upstream `skills/brag/assets/music/README.md` requires verifying and documenting exact music license terms before redistribution, and those terms could not be verified. Use no music unless the project or user supplies a track with clear usage rights; the skill tells the user when it proceeds without music.

The full video workflow also requires Node.js 22+, FFmpeg, and the Hyperframes CLI (`npx hyperframes`). The upstream workflow references Hyperframes domain skills (`hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, and `hyperframes-cli`); those skills are not bundled here and may need to be installed separately.
