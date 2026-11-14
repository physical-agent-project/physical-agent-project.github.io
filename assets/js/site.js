(() => {
  // hero: the film opens full-screen and shrinks into a card as the page scrolls
  const hs = document.getElementById('hero-scroll'), stage = document.getElementById('stage'), head = document.getElementById('hero-head'), hint = document.getElementById('scroll-hint'), topbar = document.querySelector('.top');
  const mq = matchMedia('(min-width: 761px) and (min-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)');
  const clamp01 = (x) => Math.min(1, Math.max(0, x)), ease = (t) => t * t * (3 - 2 * t);
  let pinned = false, vw = 0, vh = 0, s1 = 1, top1 = 0, len = 1;
  const heroUpdate = () => {
    if (!pinned) return;
    const p = clamp01(window.scrollY / len), e = ease(p), s = 1 + (s1 - 1) * e, w = vw * s, h = vh * s;
    stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.style.left = (vw - w) / 2 + 'px'; stage.style.top = top1 * e + 'px';
    head.style.top = top1 * e + h + 20 + 'px';
    stage.style.borderRadius = 22 * e + 'px';
    const ha = ease(clamp01((p - 0.3) / 0.6)); head.style.opacity = ha; head.style.transform = `translateY(${(1 - ha) * 18}px)`;
    hint.style.opacity = clamp01(1 - p * 7);
    topbar.classList.toggle('away', p < 0.5);
  };
  const heroLayout = () => {
    pinned = mq.matches; hs.classList.toggle('pinned', pinned); stage.dataset.full = pinned ? '1' : '';
    if (!pinned) { for (const k of ['width', 'height', 'left', 'top', 'borderRadius']) stage.style[k] = ''; head.style.opacity = ''; head.style.transform = ''; head.style.top = ''; hs.style.marginBottom = ''; topbar.classList.remove('away'); window.dispatchEvent(new Event('hero-layout')); return; }
    vw = document.documentElement.clientWidth; vh = window.innerHeight; top1 = 74;
    s1 = Math.min(Math.min(1240, vw - 40) / vw, (vh - top1 - 20 - head.offsetHeight - 4) / vh); len = Math.round(vh * 0.85); hs.style.setProperty('--len', len + 'px');
    // on a large window the settled film is limited by the column width, not the height, which leaves empty space under the title inside the pinned screen: pull the next block up by that much
    hs.style.marginBottom = -Math.max(0, Math.round(vh - (top1 + vh * s1 + 20 + head.offsetHeight) - 4)) + 'px';
    heroUpdate(); window.dispatchEvent(new Event('hero-layout'));
  };
  heroLayout(); window.addEventListener('resize', heroLayout); mq.addEventListener('change', heroLayout);
  window.addEventListener('scroll', heroUpdate, { passive: true });
  // when the film has played through once and the reader has not scrolled yet, ease the page down so the film settles into its card
  window.addEventListener('hero-ended', () => {
    if (!pinned || window.scrollY > len * 0.12) return;
    const from = window.scrollY, t0 = performance.now(), dur = 2200; let stop = false;
    const cancel = () => { stop = true; }; const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    evs.forEach((e) => window.addEventListener(e, cancel, { passive: true, once: true }));
    const step = (now) => { if (stop) return; const k = clamp01((now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; window.scrollTo({ top: from + (len - from) * e, behavior: 'instant' }); if (k < 1) requestAnimationFrame(step); else evs.forEach((ev) => window.removeEventListener(ev, cancel)); };
    requestAnimationFrame(step);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(heroLayout);

  // reveal + chart animation
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // table of contents highlight, with Ninelong commenting on whichever section is in view
  const links = [...document.querySelectorAll('.toc a')];
  const secs = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const SAY = {
    top: ["Scroll. I'll narrate.", 'I jumped out of a monitor for this.'],
    tldr: ['Too long? I read it for you.', 'Four GPUs. One egg.'],
    method: ['I see. I think. I call a tool.', 'No action head. Just numbers in a tool call.'],
    physical: ['79.2%. No action head was harmed.', 'New instruction? Fine. I can read.'],
    general: ['Still does math. Mostly.', 'Robot by day, general agent always.'],
    icl: ["Show me once. I'll take it from there.", 'Wrong demo, wrong bowl. My bad.'],
    compute: ['Four GPUs. We counted twice.', '71 GPU-hours. That was all of it.'],
    recovery: ['Dropped it. Picked it up. Nobody saw.', "Not sure I'm holding it. Checking."],
    limits: ['Simulation today. Real arms next.', 'Next up: practice. Lots of it.'],
    collab: ['Psst. Got GPUs?', 'Will stack bowls for compute.'],
    bibtex: ["Cite me. I'm an egg.", 'Author order: egg last.'],
  };
  // Ninelong's wardrobe. Layers: back (behind the egg), under/over (worn, move with the body), hat (lifts off in a hop), front (stays on the ground).
  const E = {
    body: '<path d="M26 4.5C38.75 4.5 48.25 19.25 48.25 35.25C48.25 48.5 38.5 56.75 26 56.75C13.5 56.75 3.75 48.5 3.75 35.25C3.75 19.25 13.25 4.5 26 4.5Z" fill="#FFD43B"/><path d="M48.25 35.25C48.25 48.5 38.5 56.75 26 56.75C19 56.75 13 54 9 49.25C22 55 42 50.25 47.3 30C47.95 31.75 48.25 33.5 48.25 35.25Z" fill="#F2B90F"/>',
    eyes: '<circle cx="18" cy="26.25" r="3.7" fill="#49B867"/><circle cx="34" cy="26.25" r="3.7" fill="#49B867"/><circle cx="18.5" cy="26.55" r="2.1" fill="#17150F"/><circle cx="34.5" cy="26.55" r="2.1" fill="#17150F"/><circle cx="17.6" cy="25.55" r=".7" fill="#fff"/><circle cx="33.6" cy="25.55" r=".7" fill="#fff"/>',
    mouth: '<path d="M22.5 32.25q3.5 2.2 7 0" stroke="#D98A14" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
    cry: '<circle cx="17.6" cy="26.6" r="4.9" fill="#49B867"/><circle cx="34.4" cy="26.6" r="4.9" fill="#49B867"/><circle cx="17.8" cy="26.9" r="3.2" fill="#17150F"/><circle cx="34.6" cy="26.9" r="3.2" fill="#17150F"/><circle cx="16.2" cy="25.1" r="1.45" fill="#fff"/><circle cx="33" cy="25.1" r="1.45" fill="#fff"/><circle cx="19.3" cy="28.3" r=".75" fill="#fff"/><circle cx="36.1" cy="28.3" r=".75" fill="#fff"/><path d="M12.9 28.6C14 31.9 21.2 31.9 22.3 28.6C20.8 30.2 14.4 30.2 12.9 28.6ZM29.7 28.6C30.8 31.9 38 31.9 39.1 28.6C37.6 30.2 31.2 30.2 29.7 28.6Z" fill="#BFE6FF"/><path d="M22.3 35.2c1.2-1.6 2.5-1.6 3.7-.3c1.2 1.3 2.5 1.3 3.7-.3" stroke="#D98A14" stroke-width="1.7" stroke-linecap="round" fill="none"/>',
  };
  const OUTFITS = [
    { id: 'plain' },
    { id: 'onsen', line: 'Ahh. Forty-two degrees.',
      back: '<path class="st" d="M12 -3c-2.5-3 2.5-5 0-8.5" stroke="#C9D3DF" stroke-width="1.7" stroke-linecap="round" fill="none"/><path class="st" d="M26-5c-2.5-3 2.5-5 0-8.5" stroke="#C9D3DF" stroke-width="1.7" stroke-linecap="round" fill="none"/><path class="st" d="M40-3c-2.5-3 2.5-5 0-8.5" stroke="#C9D3DF" stroke-width="1.7" stroke-linecap="round" fill="none"/><ellipse cx="26" cy="38" rx="25" ry="5" fill="#B27A44"/><ellipse cx="26" cy="38.6" rx="23" ry="4" fill="#BFE6FF"/>',
      face: '<path d="M14.5 27q3.5-3.2 7 0M30.5 27q3.5-3.2 7 0" stroke="#17150F" stroke-width="1.8" stroke-linecap="round" fill="none"/><ellipse cx="12.5" cy="31.5" rx="3" ry="1.7" fill="#FF9E80" opacity=".75"/><ellipse cx="39.5" cy="31.5" rx="3" ry="1.7" fill="#FF9E80" opacity=".75"/><path d="M22.5 32.5q3.5 2.6 7 0" stroke="#D98A14" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
      hat: '<g transform="rotate(-7 26 5)"><rect x="15" y="0.5" width="22" height="8" rx="3.2" fill="#fff" stroke="#E0DACB" stroke-width=".8"/><path d="M15.5 5.5h21" stroke="#E0DACB" stroke-width=".8"/><rect x="30" y="1" width="3" height="7" fill="#8FD0FF"/></g>',
      front: '<path class="rip" d="M3 39C10 43.5 42 43.5 49 39V44H3Z" fill="#BFE6FF" opacity=".9"/><path d="M1 39C9 44.5 43 44.5 51 39L47.5 58C47 61 45 62 42 62H10C7 62 5 61 4.5 58Z" fill="#C98F55"/><path d="M2.3 46C12 50.5 40 50.5 49.7 46M3.8 54C13 58 39 58 48.2 54" stroke="#8A5A2E" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 43.2L15 61.5M26 43.8V62M38 43.2L37 61.5" stroke="#B27A44" stroke-width="1" fill="none"/>' },
    { id: 'witch', line: 'Boo. Still a general agent.',
      over: '<path d="M27.3 33.1l1.3 2.6l1-3.1z" fill="#fff"/>',
      hat: '<ellipse cx="26" cy="8.5" rx="21" ry="4.3" fill="#43236F"/><path d="M13.5 8C16 0 21-9.5 27-12.5C31-14.5 35.5-12 33.5-8.5C32-9.3 30.3-8.8 29.8-7.3C33-3 36.5 2 38.5 8C31 11.3 21 11.3 13.5 8Z" fill="#5A3391"/><path d="M15.2 3.8C22 6.6 30 6.6 36.8 3.8L38.3 7.6C31 10.8 21 10.8 13.7 7.6Z" fill="#F08A24"/><rect x="24" y="5.3" width="4" height="4.2" rx=".8" fill="#FFD43B"/>',
      fx: '<g class="bat"><path class="batw" d="M43-6c1.4-2.4 3.7-2.4 5.1-1c.7-1 1.600-1 2.300 0c1.400-1.400 3.700-1.400 5.100 1c-1.900-.5-3.100.3-3.700 1.900c-.8-1.100-1.800-1.700-2.600-.3c-.7-1.400-1.700-.8-2.500.3c-.600-1.600-1.800-2.400-3.700-1.900z" fill="#2A1845"/></g>' },
    { id: 'santa', line: 'Ho ho ho. Send GPUs.',
      over: '<path d="M5.5 38C14 42.8 38 42.8 46.5 38L47.5 42.8C38 48 14 48 4.5 42.8Z" fill="#2F9E6B"/><path d="M33 45.5l7.5-1.2l2.5 11.5l-6.5 1.2z" fill="#27865A"/><path d="M36.7 54l6.3-1.2" stroke="#fff" stroke-width="1.2"/>',
      hat: '<path d="M10.5 11C12-1 22-9.5 31-8.5C38.5-7.5 43.5-1.5 46.5 6C43.5 4.8 40.5 5.3 38.3 7C36 3 33 1.2 30 1.2C24 2 18 6 14.5 12Z" fill="#E5484D"/><path d="M8 12C13 5.5 39 5.5 44 12C45 14.2 43.3 15.8 41.2 15C32 11.5 20 11.5 10.8 15C8.7 15.8 7 14.2 8 12Z" fill="#fff" stroke="#E7E1D4" stroke-width=".6"/><circle cx="47" cy="7.5" r="3.6" fill="#fff" stroke="#E7E1D4" stroke-width=".6"/>',
      fx: [2, 13, 24, 35, 46, 52].map((x, i) => `<circle class="sn" cx="${x}" cy="-14" r="${1 + (i % 3) * 0.35}" fill="#EDF5FF" stroke="#A9C6E6" stroke-width=".5" style="animation-delay:${(i * 0.53).toFixed(2)}s"/>`).join('') },
    { id: 'grad', line: 'Dr. Egg. Soon.',
      hat: '<path d="M15 2V8.5C19 12 33 12 37 8.5V2C33 5 19 5 15 2Z" fill="#3A3F4D"/><path d="M26-9.5L47-2L26 5.5L5-2Z" fill="#2B2F3A"/><path d="M26-2L41 1.5V10" stroke="#FFD43B" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="39.3" y="9.5" width="3.4" height="5" rx="1" fill="#FFD43B"/><circle cx="26" cy="-2" r="1.5" fill="#FFD43B"/>' },
    { id: 'coder', line: 'It works on my machine.',
      over: '<rect x="12.6" y="21.4" width="10.8" height="9.8" rx="3" fill="none" stroke="#2B2F3A" stroke-width="1.6"/><rect x="28.6" y="21.4" width="10.8" height="9.8" rx="3" fill="none" stroke="#2B2F3A" stroke-width="1.6"/><path d="M23.4 25.6h5.2" stroke="#2B2F3A" stroke-width="1.6"/>',
      hat: '<path d="M6.2 27C5.6 12 14.5 2.6 26 2.6C37.5 2.6 46.4 12 45.8 27" stroke="#2B2F3A" stroke-width="3.2" fill="none" stroke-linecap="round"/><rect x="1.2" y="21.5" width="7.6" height="13" rx="3.4" fill="#3A3F4D"/><rect x="43.2" y="21.5" width="7.6" height="13" rx="3.4" fill="#3A3F4D"/><rect x="2.6" y="24.5" width="2" height="7" rx="1" fill="#F08A6B"/><rect x="47.4" y="24.5" width="2" height="7" rx="1" fill="#F08A6B"/>',
      front: '<rect x="9.5" y="42" width="33" height="20" rx="3" fill="#27345A"/><rect x="11" y="43.5" width="30" height="17" rx="2" fill="#2F3E6B"/><circle class="logo" cx="26" cy="52" r="2.8" fill="#9BE0FF"/><rect x="5.5" y="61" width="41" height="3.2" rx="1.6" fill="#1D2740"/>',
      fx: ['{', ';', '}'].map((ch, i) => `<text class="gl" x="${[2, 50, 44][i]}" y="${[36, 30, 44][i]}" font-family="ui-monospace,Menlo,monospace" font-size="9" font-weight="700" fill="#6F55B5" style="animation-delay:${i * 0.8}s">${ch}</text>`).join('') },
    { id: 'shades', line: 'Deal with it.',
      face: E.eyes + '<g class="m0">' + E.mouth + '</g>',
      over: '<g class="drop"><path d="M5.5 24h41" stroke="#17150F" stroke-width="1.8" stroke-linecap="round"/><path d="M10.5 22.5h13a1.5 1.5 0 0 1 1.5 1.5v3a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5v-3a1.5 1.5 0 0 1 1.5-1.5zM28.5 22.5h13a1.5 1.5 0 0 1 1.5 1.5v3a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5v-3a1.5 1.5 0 0 1 1.5-1.5z" fill="#17150F"/><path class="gli" d="M12.5 25l3.5 3.5M15.5 24.5l2 2M30.5 25l3.5 3.5M33.5 24.5l2 2" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".85"/></g><path class="smirk" d="M22.5 36.5q4 1.8 7.5-1.2" stroke="#D98A14" stroke-width="1.8" stroke-linecap="round" fill="none"/>' },
  ];
  const egg = document.getElementById('toc-egg'), eggLine = document.getElementById('egg-line'), eggFig = document.getElementById('egg-fig');
  const noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let curId = '', lineIdx = 0, outfit = 0, busy = false, figO = null;
  try { outfit = Math.max(0, OUTFITS.findIndex((o) => o.id === localStorage.getItem('ninelong-outfit'))); } catch { /* storage may be unavailable */ }
  if (eggFig) {
    const star = 'M0-3.2L.9-.9L3.2 0L.9.9L0 3.2L-.9.9L-3.2 0L-.9-.9Z';
    eggFig.innerHTML = '<span class="fig-o"></span><svg class="sparks" viewBox="-4 -16 60 80"><circle class="ring" cx="26" cy="30" r="24" fill="none" stroke="#FFDf6B" stroke-width="2.6"/>' + [[4, 6, -9, -8], [48, 4, 9, -9], [-1, 30, -10, 2], [53, 28, 10, 1], [10, 58, -7, 8], [44, 60, 8, 8], [26, -10, 0, -9]].map(([x, y, dx, dy], i) => `<path d="${star}" fill="${['#FFD43B', '#fff', '#F08A6B', '#9BE0FF'][i % 4]}" stroke="#E8C25A" stroke-width=".4" transform="translate(${x} ${y})" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${i * 28}ms"/>`).join('') + '</svg>';
    figO = eggFig.firstElementChild;
  }
  const dress = () => {
    if (!figO) return; const o = OUTFITS[outfit], face = o.face || (curId === 'collab' ? E.cry : E.eyes + E.mouth);
    figO.innerHTML = `<svg viewBox="-4 -16 60 80" data-o="${o.id}"><g class="g-back">${o.back || ''}</g><g class="g-body"><g class="sig-body">${E.body}${o.under || ''}${face}${o.over || ''}</g></g><g class="g-hat"><g class="sig-hat">${o.hat || ''}</g></g><g class="g-front">${o.front || ''}</g><g class="g-fx">${o.fx || ''}</g></svg>`;
  };
  const pop = () => { const b = eggLine.parentElement; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
  const say = (id, idx) => { if (!egg) return; const lines = SAY[id] || SAY.top; lineIdx = idx % lines.length; eggLine.textContent = lines[lineIdx]; pop(); };
  const spy = () => {
    const y = window.scrollY + 120;
    let cur = null;
    for (const s of secs) if (s.offsetTop <= y) cur = s;
    const id = cur ? cur.id : 'top';
    links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
    if (id !== curId) { const cry = id === 'collab' || curId === 'collab'; curId = id; say(id, 0); if (cry && !busy) dress(); }
  };
  dress(); eggFig?.classList.add('sig'); window.addEventListener('scroll', spy, { passive: true }); spy();
  // click: a quick change. Old outfit flies off, the egg flips, the new one lands, then it does that outfit's own little bit.
  egg?.addEventListener('click', () => {
    if (busy) return; busy = true;
    const next = (outfit + 1) % OUTFITS.length, o = OUTFITS[next];
    const land = () => { outfit = next; try { localStorage.setItem('ninelong-outfit', o.id); } catch { /* ignore */ } dress(); if (o.line) { eggLine.textContent = o.line; pop(); } else say(curId, lineIdx + 1); };
    if (noMotion) { land(); busy = false; return; }
    eggFig.classList.remove('sig', 'in'); eggFig.classList.add('out');
    setTimeout(() => { land(); eggFig.classList.remove('out'); void eggFig.offsetWidth; eggFig.classList.add('in'); }, 210);
    setTimeout(() => { eggFig.classList.remove('in'); eggFig.classList.add('sig'); busy = false; }, 210 + 700);
  });

  // disabled links
  document.querySelectorAll('a[aria-disabled="true"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  // the BibTeX entry cites this page, wherever it ends up being served
  const bibUrl = document.getElementById('bib-url');
  if (bibUrl) bibUrl.textContent = location.origin + location.pathname.replace(/index\.html$/, '');

  // copy bibtex
  const cb = document.getElementById('copy-bib');
  cb?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.getElementById('bib').textContent); cb.textContent = 'Copied'; }
    catch { cb.textContent = 'Select and copy manually'; }
    setTimeout(() => (cb.textContent = 'Copy'), 1600);
  });

  const epP = fetch('assets/episode/episode.json').then((r) => r.json());

  // Figure 1: three lanes on one clock. The physical agent's lane is a conveyor of the recorded turns.
  const how = document.getElementById('how');
  if (how) epP.then((ep) => {
    const g = (id) => document.getElementById(id), track = g('pa-track'), conv = g('pa-conv'), btn = g('how-pp');
    const sub = (ch, n) => `<em>${ch}<sub>${n}</sub></em>`;
    const mk = (cls, html, label, bg) => { const d = document.createElement('div'); d.className = 'ci fut ' + cls; d.innerHTML = `<div class="cb"${bg ? ` style="background-image:url(assets/episode/${bg})"` : ''}>${html}</div>${label}`; track.appendChild(d); return d; };
    const items = [mk('i', esc(ep.instruction), '<em>I</em>')];
    ep.turns.forEach((t, i) => {
      let a = null; try { a = JSON.parse(t.call.match(/\[(.*)\]/s)[0])[0]; } catch { /* keep null */ }
      const f = (v) => `<span class="n">${Number(v).toFixed(3)}</span>`, words = t.reasoning.split(' ').slice(0, 11).join(' ') + ' …';
      items.push(mk('o', '', sub('o', i + 1), t.obs), mk('r', esc(words), sub('r', i + 1)),
        mk('a', a ? `<span class="k">tool_call</span>\nx ${f(a.x)}\ny ${f(a.y)}\nz ${f(a.z)}\n<span class="d">… ×${t.n}</span>` : '', sub('a', i + 1)));
    });
    const vImg = g('vla-img'), vBox = g('vla-box'), vChunk = [...g('vla-chunk').children], vCtl = g('vla-ctl');
    const cBox = g('cap-box'), cLines = [...g('cap-code').children], cCtl = g('cap-ctl'), cNow = g('cap-now'), paCtl = g('pa-ctl');
    const capNow = ['detect', 'detect', 'grasp', 'move'], cArm = g('cap-arm');
    const TURN = 3900, N = ep.turns.length, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let acc = reduce ? TURN * 3.99 : 0, paused = reduce, vis = false, last = 0, key = '';
    const paint = () => {
      const k = Math.floor(acc / TURN) % N, e = acc % TURN, ph = e < 700 ? 0 : e < 2100 ? 1 : e < 2800 ? 2 : 3, cur = 1 + k * 3 + Math.min(ph, 2);
      const kk = k + ':' + ph;
      if (kk !== key) {
        key = kk;
        items.forEach((it, i) => { it.classList.toggle('fut', i > cur); it.classList.toggle('cur', i === cur); });
        const x = items[cur].offsetLeft, w = conv.clientWidth; track.style.transform = `translateX(${Math.min(0, w - 150 - x)}px)`;
        paCtl.classList.toggle('on', ph === 3);
        // VLA: a fresh mapping every step, nothing carried over
        vImg.style.backgroundImage = `url(assets/episode/${ep.turns[k].obs})`; vBox.classList.toggle('on', ph === 1); vCtl.classList.toggle('on', ph === 3);
        // Code as Policies: write the program once, then the harness runs it line by line
        const c = k % 6; cBox.classList.toggle('on', c === 0 && ph >= 1);
        cLines.forEach((l, i) => { l.classList.toggle('typed', c > 0 || ph > 1 || (ph === 1 && i < 2)); l.classList.toggle('run', c === i + 1); });
        cCtl.classList.toggle('on', c >= 1 && c <= 4); cArm.classList.toggle('on', c >= 3 && c <= 4 && ph >= 2); cNow.textContent = c >= 1 && c <= 4 ? capNow[c - 1] : '\u00a0';
      }
      vChunk.forEach((b, i) => b.classList.toggle('on', ph >= 2 || (ph === 1 && e > 700 + i * 320)));
    };
    const tick = (now) => { requestAnimationFrame(tick); const dt = Math.min(80, now - (last || now)); last = now; if (!vis || paused) return; acc += dt; paint(); };
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0.15 }).observe(how);
    window.addEventListener('resize', () => { key = ''; paint(); });
    btn.textContent = paused ? 'Play' : 'Pause';
    btn.addEventListener('click', () => { paused = !paused; btn.textContent = paused ? 'Play' : 'Pause'; });
    paint(); requestAnimationFrame(tick);
  });

  // turn explorer (Figure 2): what the agent receives on the left, what it writes on the right
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const parseCall = (call) => { const m = call.match(/\[(.*)\]/s); try { return JSON.parse('[' + m[1] + ']'); } catch { return []; } };
  const fmtCall = (targets) => {
    const one = (t) => '  {' + Object.entries(t).map(([k, v]) => `<span class="k">"${k}"</span>: <span class="n">${typeof v === 'number' && k !== 'control_steps' ? (Number.isInteger(v) ? v.toFixed(1) : v) : v}</span>`).join(', ') + '}';
    const wrap = (line) => line.replace(/, <span class="k">"roll_deg"/, ',\n   <span class="k">"roll_deg"').replace(/, <span class="k">"yaw_deg"/, ',\n   <span class="k">"yaw_deg"').replace(/, <span class="k">"control_steps"/, ',\n   <span class="k">"control_steps"');
    return `<span class="t">&lt;function=</span><span class="k">execute_absolute_eef_sequence</span><span class="t">&gt;</span>\n<span class="t">&lt;parameter=</span>actions<span class="t">&gt;</span>\n[\n${targets.slice(0, 1).map((t) => wrap(one(t))).join(',\n')},\n  <span class="d">… ${Math.max(0, targets.length - 1)} more targets</span>\n]`;
  };
  const tx = document.getElementById('tx');
  if (tx) {
    epP.then((ep) => {
      const steps = document.getElementById('tx-steps'), img = document.getElementById('tx-img'), side = document.getElementById('tx-side');
      const reason = document.getElementById('tx-reason'), playBtn = document.getElementById('tx-play');
      const calls = ep.turns.map((t) => parseCall(t.call));
      const zs = calls.flat().map((a) => a.z), z0 = Math.min(...zs), z1 = Math.max(...zs);
      // the eight targets of one call: height on the episode's own scale, marker filled when the gripper is commanded closed
      const traj = (targets) => {
        const W = 480, x = (k) => 26 + k * (W - 52) / Math.max(1, targets.length - 1), y = (z) => 24 + (1 - (z - z0) / (z1 - z0 || 1)) * 34;
        const d = targets.map((a, k) => (k ? 'L' : 'M') + x(k).toFixed(1) + ' ' + y(a.z).toFixed(1)).join('');
        const dots = targets.map((a, k) => { const shut = a.gripper > 0; return `<circle cx="${x(k).toFixed(1)}" cy="${y(a.z).toFixed(1)}" r="4.6" fill="${shut ? '#ffd43b' : '#1b1b3a'}" stroke="${shut ? '#1b1b3a' : '#9be0ff'}" stroke-width="1.8"><title>target ${k + 1}: height ${a.z.toFixed(3)} m, gripper ${shut ? 'closed' : 'open'}</title></circle><text x="${x(k).toFixed(1)}" y="76" text-anchor="middle">${k + 1}</text>`; }).join('');
        return `<svg viewBox="0 0 ${W} 80" role="img" aria-label="Height and gripper command of the eight targets in this tool call"><text x="8" y="12">gripper height, ${targets.length} targets</text><circle cx="${W - 122}" cy="8.500" r="3.6" fill="#1b1b3a" stroke="#9be0ff" stroke-width="1.6"/><text x="${W - 114}" y="12">open</text><circle cx="${W - 62}" cy="8.500" r="3.6" fill="#ffd43b"/><text x="${W - 54}" y="12">closed</text><path d="${d}" fill="none" stroke="#9be0ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
      };
      let cur = 0, timer = null;
      const show = (i, quiet) => {
        cur = (i + ep.turns.length) % ep.turns.length;
        const t = ep.turns[cur];
        img.src = 'assets/episode/' + t.obs;
        reason.textContent = t.reasoning;
        document.getElementById('tx-call').innerHTML = fmtCall(calls[cur]);
        document.getElementById('tx-traj').innerHTML = traj(calls[cur]);
        document.getElementById('tx-fb').textContent = ep.feedback_example.replace('"policy_steps":8', `"policy_steps":${t.step1}`);
        document.getElementById('tx-turn').textContent = `Observation · turn ${cur + 1} of ${ep.turns.length}`;
        document.getElementById('tx-meta').textContent = `control steps ${t.step0 + 1}–${t.step1} of ${ep.steps}`;
        [...steps.children].forEach((b, k) => { b.classList.toggle('on', k === cur); b.classList.toggle('done', k < cur); b.setAttribute('aria-selected', k === cur); });
        if (!quiet) [side, document.getElementById('tx-fbw')].forEach((el) => { el.classList.remove('sw'); void el.offsetWidth; el.classList.add('sw'); });
      };
      const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = 'Play'; };
      ep.turns.forEach((t, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Turn ' + (i + 1));
        b.style.backgroundImage = `url(assets/episode/${t.obs})`; b.innerHTML = `<span>${i + 1}</span>`;
        b.addEventListener('click', () => { stop(); show(i); });
        steps.appendChild(b);
      });
      playBtn.addEventListener('click', () => {
        if (timer) return stop();
        playBtn.textContent = 'Stop'; show(cur >= ep.turns.length - 1 ? 0 : cur);
        timer = setInterval(() => { if (cur >= ep.turns.length - 1) return stop(); show(cur + 1); }, 2200);
      });
      document.getElementById('tx-prev').addEventListener('click', () => { stop(); show(cur - 1); });
      document.getElementById('tx-next').addEventListener('click', () => { stop(); show(cur + 1); });
      // keep the reasoning box as tall as the longest turn, so nothing below it jumps while stepping
      const fit = () => { reason.style.minHeight = ''; let m = 0; ep.turns.forEach((t) => { reason.textContent = t.reasoning; m = Math.max(m, reason.offsetHeight); }); reason.style.minHeight = m + 'px'; show(cur, true); };
      let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(fit, 200); });
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fit);
      show(0, true);
    }).catch(() => { tx.style.display = 'none'; });
  }
  // Figure 5: the demonstration drops into the first turn. Starts empty, fills in once it scrolls into view.
  const cxf = document.getElementById('cxf');
  if (cxf) {
    const tb = [...cxf.querySelectorAll('#cx-tog button')];
    let touched = false;
    const setM = (m) => { cxf.dataset.m = m; tb.forEach((b) => { const on = b.dataset.m === String(m); b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); };
    tb.forEach((b) => b.addEventListener('click', () => { touched = true; setM(+b.dataset.m); }));
    setM(1);
    if (!noMotion) {
      setM(0);
      new IntersectionObserver((es, ob) => { if (!es[0].isIntersecting) return; ob.disconnect(); setTimeout(() => { if (!touched) setM(1); }, 650); }, { threshold: 0.55 }).observe(cxf);
    }
  }
  // Figure 9: three recorded recoveries, four frames each. Brackets are placed from the paper figure's own overlay boxes (in % of the frame).
  const rcv = document.getElementById('rcv');
  if (rcv) {
    const CASES = [
      { id: 'ketchup', name: 'Ketchup bottle', b2: [46.5, 25.9, 16.4, 65], b4: [45.8, 12.3, 19.1, 58.8],
        t: ['Closes on the bottle and lifts.', '“The previous lift did not give me confirmed grasp evidence …”', '“I open the fingers and lower back toward the target to re-establish a better alignment.”', 'The bottle lifts with the gripper.'] },
      { id: 'soup', name: 'Soup can', b2: [51.6, 48, 18.4, 38], b4: [20.4, 6.1, 21.1, 40.1],
        t: ['Closes on the can and lifts.', '“The wrist view shows the can still on the table …”', '“I move away from the failed first grasp and reposition toward the alphabet soup can.”', 'The can lifts with the gripper.'] },
      { id: 'butter', name: 'Butter box', b2: [42.4, 52.4, 15.2, 16.9], b4: [37.8, 19.6, 22.8, 21.3],
        t: ['Closes on the butter and lifts.', '“The current view does not clearly show the butter retained in the gripper.”', '“I open the gripper and lower slightly to reposition for another grasp.”', 'The butter moves toward the basket.'] },
    ];
    const STG = ['Attempt', 'Mismatch', 'Correct', 'Verify'], DUR = [2000, 3600, 3600, 3000];
    const view = document.getElementById('rv-view'), imgs = [...view.querySelectorAll('img')], box = document.getElementById('rv-box'), chip = document.getElementById('rv-chip');
    const tabs = document.getElementById('rv-tabs'), strip = document.getElementById('rv-strip'), lis = [...rcv.querySelectorAll('#rv-steps li')];
    tabs.innerHTML = CASES.map((k, i) => `<button type="button" role="tab" data-i="${i}">${k.name}</button>`).join('');
    strip.innerHTML = STG.map((n, i) => `<button type="button" data-i="${i}" aria-label="Step ${i + 1}: ${n}"><img alt="" loading="lazy"><b>${i + 1}</b><i></i></button>`).join('');
    const tabB = [...tabs.children], stripB = [...strip.children];
    let c = 0, s = 0, timer = null, auto = !noMotion, vis = false, started = false;
    const setCase = (i) => {
      c = i; const k = CASES[c];
      imgs.forEach((im, n) => { im.removeAttribute('loading'); im.src = `assets/img/rcv-${k.id}-${n + 1}.jpg`; im.classList.remove('was'); });
      stripB.forEach((b, n) => { b.firstElementChild.src = `assets/img/rcv-${k.id}-${n + 1}.jpg`; });
      lis.forEach((li, n) => { li.querySelector('.rv-tx').textContent = k.t[n]; });
      tabB.forEach((b, n) => { b.classList.toggle('on', n === c); b.setAttribute('aria-selected', n === c); });
    };
    const setStage = (i, playing) => {
      imgs.forEach((im, n) => im.classList.toggle('was', n === s && n !== i)); s = i;
      imgs.forEach((im, n) => im.classList.toggle('on', n === s));
      lis.forEach((li, n) => { li.classList.toggle('on', n === s); li.classList.toggle('done', n < s); });
      stripB.forEach((b, n) => { b.classList.remove('on'); b.classList.toggle('done', n < s); });
      rcv.style.setProperty('--d', DUR[s] + 'ms'); rcv.classList.toggle('play', !!playing); void strip.offsetWidth; stripB[s].classList.add('on');
      chip.innerHTML = `<b>${s + 1}</b>${STG[s]}`;
      const k = CASES[c], b = s === 1 ? k.b2 : s === 3 ? k.b4 : null;
      box.classList.remove('show');
      if (b) { box.style.cssText = `left:${b[0]}%;top:${b[1]}%;width:${b[2]}%;height:${b[3]}%`; box.dataset.t = s === 1 ? '✕ not held' : '✓ held'; box.classList.toggle('ok', s === 3); box.classList.toggle('low', b[1] < 16); void box.offsetWidth; box.classList.add('show'); }
    };
    const run = () => {
      clearTimeout(timer); if (!vis || !rcv.classList.contains('play')) return;
      timer = setTimeout(() => {
        if (s < 3) setStage(s + 1, true); else if (auto) { setCase((c + 1) % CASES.length); setStage(0, true); } else { rcv.classList.remove('play'); return; }
        run();
      }, DUR[s]);
    };
    const play = (i) => { setCase(i); setStage(0, true); run(); };
    const stop = (i) => { auto = false; clearTimeout(timer); setStage(i, false); };
    tabB.forEach((b, n) => b.addEventListener('click', () => { auto = false; play(n); }));
    stripB.forEach((b, n) => b.addEventListener('click', () => stop(n)));
    lis.forEach((li, n) => li.addEventListener('click', () => stop(n)));
    document.getElementById('rv-re').addEventListener('click', () => { auto = false; play(c); });
    setCase(0); setStage(0, false);
    new IntersectionObserver((es) => {
      vis = es[0].isIntersecting;
      if (!vis) { clearTimeout(timer); return; }
      if (!started) { started = true; CASES.forEach((k) => { for (let n = 1; n <= 4; n++) { const p = new Image(); p.src = `assets/img/rcv-${k.id}-${n}.jpg`; } }); if (!noMotion) { play(0); return; } }
      run();
    }, { threshold: 0.35 }).observe(rcv);
  }
})();
