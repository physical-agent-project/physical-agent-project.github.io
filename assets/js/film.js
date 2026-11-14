// Hero film. On wide screens this plays the pre-rendered film: the same story on the same clock, with the same captions
// drawn on top. On phones, odd window shapes, or if the video cannot play, it hands over to the real-time version (hero.js).
import { makeOverlay } from './timeline.js';

const stage = document.getElementById('stage');
const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const realTime = () => import('./hero.js');

async function video() {
  const ep = await fetch('assets/episode/episode.json').then((r) => r.json());
  const obsImgs = ep.turns.map((t) => { const i = new Image(); i.src = 'assets/episode/' + t.obs; return i; });
  const mk = (src) => {
    const v = document.createElement('video'); v.className = 'stage-video'; v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.src = src;
    stage.insertBefore(v, stage.querySelector('.stage-poster')); return v;
  };
  const film = mk('assets/video/film.mp4'), loop = mk('assets/video/idle.mp4'); loop.loop = true; loop.style.visibility = 'hidden';
  try {
    await new Promise((res, rej) => {
      if (film.readyState >= 2) return res();
      film.addEventListener('loadeddata', res, { once: true }); film.addEventListener('error', () => rej(new Error('film video failed to load')), { once: true });
      setTimeout(() => rej(new Error('film video timed out')), 15000);
    });
  } catch (e) { film.remove(); loop.remove(); throw e; }

  const { el, paintDom, T_END, T_LOOP } = makeOverlay(ep, obsImgs);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches, held = qs.has('paused');
  let idle = false, want = !held && !calm, visible = true, drag = false, prevT = 0, endedOnce = false;
  const last = () => (film.duration || T_LOOP) - 0.05;
  const pp = $('pp'), ppIcon = $('pp-i');
  const sync = () => { ppIcon.setAttribute('d', want ? 'M3 1h3v12H3zM8 1h3v12H8z' : 'M3 1l9 6-9 6z'); pp.setAttribute('aria-label', want ? 'Pause' : 'Play'); };
  const play = () => { want = true; sync(); if (visible) film.play().catch(() => { want = false; sync(); }); };
  const pause = () => { want = false; film.pause(); sync(); };
  // when the film ends, a short seamless loop of Ninelong idling on the arm takes over
  const enterIdle = () => { idle = true; want = false; sync(); loop.currentTime = 0; loop.style.visibility = 'visible'; if (!calm && !held && visible) loop.play().catch(() => {}); };
  const leaveIdle = () => { if (!idle) return; idle = false; loop.pause(); loop.style.visibility = 'hidden'; };
  const seekTo = (t) => { leaveIdle(); film.currentTime = Math.max(0, Math.min(t, last())); };
  film.addEventListener('ended', enterIdle);
  pp.addEventListener('click', () => { if (idle || film.ended || film.currentTime >= last()) { seekTo(0); play(); } else if (want) pause(); else play(); });
  $('rp').addEventListener('click', () => { seekTo(0); play(); });
  const scrub = (ev) => { const r = el.track.getBoundingClientRect(); seekTo(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * T_LOOP); };
  el.track.addEventListener('pointerdown', (e) => { drag = true; el.track.setPointerCapture(e.pointerId); scrub(e); });
  el.track.addEventListener('pointermove', (e) => drag && scrub(e));
  el.track.addEventListener('pointerup', () => (drag = false));
  el.track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') seekTo(film.currentTime + 1); else if (e.key === 'ArrowLeft') seekTo(film.currentTime - 1); else return; e.preventDefault(); });
  // nothing plays while the film is off screen
  new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (!visible) { film.pause(); loop.pause(); } else if (idle) { if (!calm && !held) loop.play().catch(() => {}); } else if (want) film.play().catch(() => {});
  }, { threshold: 0.05 }).observe(stage);

  if (qs.has('t')) seekTo(parseFloat(qs.get('t'))); else if (calm) seekTo(T_END + 3);
  sync(); if (want) play();
  const tick = () => {
    requestAnimationFrame(tick);
    const T = idle ? T_LOOP : film.currentTime; paintDom(T);
    if (!endedOnce && prevT < T_END + 3.4 && T >= T_END + 3.4 && !film.paused) { endedOnce = true; window.dispatchEvent(new Event('hero-ended')); }
    prevT = T;
  };
  tick();
  stage.classList.add('ready', 'video');
  window.__hero = { ready: true, video: true, seek: (t) => { seekTo(t); paintDom(Math.min(t, T_LOOP)); }, T_END, T_LOOP, film, loop };
}

const w = window.innerWidth, h = window.innerHeight || 1, shape = w / h;
const canPlay = !!document.createElement('video').canPlayType && document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"') !== '';
if (!qs.has('gl') && canPlay && w > 760 && shape >= 1.3 && shape <= 2.4) video().catch((e) => { console.warn('Hero film: using the real-time version.', e.message); realTime(); });
else realTime();
