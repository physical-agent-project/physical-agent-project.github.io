# Physical Agent — project page

Source of the Physical Agent project page. It is a static site with no build step: plain HTML, CSS and ES modules.

## Preview locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765. Add `?t=12&paused=1` to jump to a moment of the hero film, and `?gl=1` to force the real-time version of it.

`python3 -m http.server` does not support HTTP range requests, so seeking inside the film's video will not work with it. GitHub Pages does; for local work use any static server that supports ranges.

## What is where

| Path | What it is |
| --- | --- |
| `index.html` | Page content: text, figures, tables. |
| `assets/css/site.css` | All styles. |
| `assets/js/film.js` | The hero film's player. On wide screens it plays the pre-rendered film in `assets/video/`; on phones, or if the video cannot play, it loads the real-time version. |
| `assets/js/hero.js` | The real-time version of the film (three.js): the digital office, the jump through the screen, the cockpit on the Franka, and the replay of a recorded episode. |
| `assets/js/timeline.js` | The film's clock and its on-screen captions, shared by both versions. |
| `assets/video/` | `film.mp4` and the looping `idle.mp4`: the same scenes and motion as the real-time version, exported frame by frame and path-traced in Blender (Cycles). |
| `assets/js/site.js` | Table of contents, figures and the turn-by-turn explorer. |
| `assets/scene/` | Simplified meshes and per-step poses of one recorded LIBERO-Spatial episode. |
| `assets/episode/` | The model's verbatim reasoning and tool calls for the 12 turns of that episode, with the recorded camera observations. |
| `assets/img/` | Figure images and the mascot icon. |
| `assets/vendor/` | three.js r160 and the add-ons used. |

`.nojekyll` is present so that GitHub Pages serves `assets/vendor` untouched.

## Credits

- [three.js](https://threejs.org) (MIT licence).
- The pre-rendered film was rendered with [Blender](https://www.blender.org) (Cycles).
- Robot and object meshes are derived from [LIBERO](https://github.com/Lifelong-Robot-Learning/LIBERO) and [robosuite](https://github.com/ARISE-Initiative/robosuite) assets and remain under their licences.
- Fonts: [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), both under the SIL Open Font License.
- The Georgia Tech logo is a trademark of the Georgia Institute of Technology.
