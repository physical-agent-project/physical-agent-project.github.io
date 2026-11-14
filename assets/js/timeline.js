// The film's clock and its on-screen captions. Shared by the pre-rendered player (film.js) and the real-time version (hero.js),
// so both show the same text at the same moment.
export const T_UP0 = 1.7, T_UP1 = 4.2, T_TASK = 5.3, T_DIVE0 = T_TASK + 0.35, T_DIVE1 = T_TASK + 1.7, T_GLANCE = 7.1, T_JUMP = 8.0, T_CROSS = T_JUMP + 0.5, T_LAND = T_CROSS + 1.55;
export const T_TURNS = T_LAND + 1.05, THINK = 0.72, EXEC = 0.82, TURN = THINK + EXEC, CALL_AT = 0.6;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const $ = (id) => document.getElementById(id);

// ep: the recorded episode; obsImgs: its preloaded observation images. Returns the overlay elements and a painter for time T.
export function makeOverlay(ep, obsImgs) {
  const N_TURNS = ep.turns.length, T_END = T_TURNS + N_TURNS * TURN, T_LOOP = T_END + 6.5;
  const el = { vig: $('ov-vig'), note: $('ov-note'), phase: $('ov-phase'), obs: $('ov-obs'), turn: $('ov-turn'), done: $('ov-done'), obsImg: $('obs-img'), k: $('turn-k'), ph: $('turn-ph'), reason: $('reason'), call: $('call'), fill: $('track-fill'), track: $('track') };
  const callHTML = ep.turns.map((t) => {
    let a = null; try { a = JSON.parse(t.call.match(/\[(.*)\]/s)[0])[0]; } catch { /* leave empty */ }
    if (!a) return '';
    const n = (v) => `<span class="n">${Number(v).toFixed(3)}</span>`;
    return `<span class="k">${ep.tool}</span> <span class="d">→</span> x ${n(a.x)} y ${n(a.y)} z ${n(a.z)} <span class="d">· gripper ${a.gripper > 0 ? 'close' : 'open'} · ${t.n} targets</span>`;
  });
  for (const t of [T_JUMP, T_TURNS, T_END]) { const s = document.createElement('i'); s.className = 'track-seg'; s.style.left = (t / T_LOOP * 100) + '%'; el.track.appendChild(s); }
  const dom = {};
  const setDom = (k, v, fn) => { if (dom[k] !== v) { dom[k] = v; fn(v); } };
  function paintDom(T) {
    const phys = T >= T_CROSS + 0.25;
    setDom('phase', phys, (v) => { el.phase.classList.toggle('phys', v); el.phase.lastElementChild.textContent = v ? 'Physical world' : 'Digital world'; });
    setDom('vig', T < T_CROSS + 0.15, (v) => el.vig.classList.toggle('hide', !v));
    const inTurns = T >= T_TURNS - 0.35;
    setDom('show', inTurns, (v) => el.obs.classList.toggle('hide', !v));
    setDom('turnv', inTurns && T < T_END + 1.3, (v) => el.turn.classList.toggle('hide', !v));
    setDom('note', T >= T_END + 1.7, (v) => el.note.classList.toggle('hide', !v));
    setDom('done', T >= T_END + 0.35, (v) => el.done.classList.toggle('hide', !v));
    setDom('fill', Math.round(Math.min(1, T / T_LOOP) * 1000), (v) => { el.fill.style.width = v / 10 + '%'; el.track.setAttribute('aria-valuenow', Math.round(v / 10)); });
    if (!inTurns) return;
    const tt = Math.max(0, T - T_TURNS), k = Math.min(N_TURNS - 1, Math.floor(tt / TURN)), local = T >= T_END ? TURN : tt - k * TURN, turn = ep.turns[k];
    setDom('k', k, (v) => { el.k.textContent = v + 1; el.obsImg.src = obsImgs[v].src; });
    const first = turn.reasoning.split(/(?<=\.)\s/).slice(0, 2).join(' ');
    const chars = Math.floor(first.length * clamp(local / (THINK * CALL_AT)));
    setDom('reason', k * 10000 + chars, () => { el.reason.textContent = first.slice(0, chars); });
    const called = local >= THINK * CALL_AT, exec = local >= THINK, fin = local >= THINK + EXEC * 0.85;
    setDom('call', k * 2 + (called ? 1 : 0), () => { el.call.innerHTML = called ? callHTML[k] : ''; });
    setDom('ph', k * 4 + (fin ? 3 : exec ? 2 : called ? 1 : 0), () => { el.ph.textContent = fin ? 'observing' : exec ? 'controller executing' : called ? 'tool call' : 'reasoning'; });
  }
  return { el, paintDom, N_TURNS, T_END, T_LOOP };
}
