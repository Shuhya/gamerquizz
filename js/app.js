/* =============================================================
   BASE DE QUESTIONS — structure définitive du MVP.
   Chaque question : { id, format, theme, diff, asset, text, opts, ans }
   - asset: null pour les formats texte ; pour 'image' et 'sound',
     chemin du fichier à déposer dans assets/ (ex: "img/zelda_botw.webp").
     En attendant, un emoji placeholder est affiché.
   - Formats texte (citation, anecdote, date, riddle) : jouables maintenant.
   ============================================================= */
/* QUESTIONS est défini dans questions.js */

/* ---------- moteur ---------- */
let AC = null, muted = false;
function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; }
function tone(freq, t0, dur, type, vol, slide) {
  if (muted) return;
  try {
    const ctx = ac(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, ctx.currentTime + t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + t0 + dur);
    g.gain.setValueAtTime(0, ctx.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol || .12, ctx.currentTime + t0 + .01);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + .05);
  } catch (e) {}
}
function sfxClick() { tone(220, 0, .06, 'square', .06); }
function sfxGood() { tone(523, 0, .1, 'square', .12); tone(659, .08, .1, 'square', .12); tone(784, .16, .18, 'square', .12); tone(1047, .26, .22, 'square', .1); }
function sfxBad() { tone(160, 0, .25, 'sawtooth', .16, 90); tone(120, .18, .3, 'sawtooth', .12, 70); }
function sfxCombo(n) { const f = 660 + Math.min(n, 8) * 80; tone(f, 0, .09, 'square', .13); tone(f * 1.25, .07, .12, 'square', .11); tone(f * 1.5, .15, .16, 'square', .1); }
function sfxTick() { tone(1000, 0, .04, 'square', .05); }
function sfxTimeout() { tone(200, 0, .4, 'sawtooth', .14, 80); }
function sfxFinish() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .12, .25, 'square', .1)); }
function toggleMute() {
  muted = !muted;
  const b = document.getElementById('mute');
  b.textContent = muted ? 'SON : OFF' : 'SON : ON';
  b.classList.toggle('off', muted);
}
// Icônes SVG pixel-art inline (aucune dépendance externe, aucun emoji)
// Icones Flaticon (Uicons, CDN officiel) — attribution requise : voir footer
const ICONS = {
  all:      '<i class="fi fi-rr-apps"></i>',
  image:    '<i class="fi fi-rr-picture"></i>',
  sound:    '<i class="fi fi-rr-music"></i>',
  citation: '<i class="fi fi-rr-quote-right"></i>',
  anecdote: '<i class="fi fi-rr-lightbulb-on"></i>',
  date:     '<i class="fi fi-rr-calendar"></i>',
  riddle:   '<i class="fi fi-rr-puzzle"></i>',
  retro:    '<i class="fi fi-rr-gamepad"></i>',
  pokemon:  '<svg class="pkball" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">'
    + '<defs><clipPath id="pk-top"><rect x="0" y="0" width="24" height="12"/></clipPath></defs>'
    + '<circle cx="12" cy="12" r="10.3" fill="#fff" stroke="#111" stroke-width="1.4"/>'
    + '<circle cx="12" cy="12" r="10.3" fill="#e52521" clip-path="url(#pk-top)"/>'
    + '<rect x="0.7" y="10.4" width="22.6" height="3.2" fill="#111"/>'
    + '<circle cx="12" cy="12" r="4" fill="#fff" stroke="#111" stroke-width="1.4"/>'
    + '<circle cx="12" cy="12" r="1.7" fill="#111"/></svg>',
};
const FORMATS = [
  { key:'all', label:'Tous', tag:'ALL' },
  { key:'image', label:'Image', tag:'IMG' },
  { key:'sound', label:'Son', tag:'SND' },
  { key:'citation', label:'Citation', tag:'CIT' },
  { key:'anecdote', label:'Anecdote', tag:'ANE' },
  { key:'date', label:'Date', tag:'DATE' },
  { key:'riddle', label:'Devinette', tag:'DEV' },
];
const THEMES = [
  { key:'all', label:'Tous les univers' },
  { key:'general', label:'Général' },
  { key:'retro', label:'Rétro' },
  { key:'pokemon', label:'Pokémon' },
];
let activeTheme = 'all';
let activeFormats = new Set(FORMATS.map(f => f.key));

function renderFilters() {
  const th = document.getElementById('theme-filters');
  th.innerHTML = '';
  THEMES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'theme-btn' + (activeTheme === t.key ? ' on' : '');
    b.innerHTML = (ICONS[t.key] || '') + t.label;
    b.onclick = () => { activeTheme = t.key; renderFilters(); };
    th.appendChild(b);
  });
  const el = document.getElementById('mode-filters');
  el.innerHTML = '';
  FORMATS.forEach(f => {
    const d = document.createElement('div');
    d.className = 'mode' + (activeFormats.has(f.key) ? ' on' : '');
    d.innerHTML = '<b class="tagline">' + ICONS[f.key] + f.label + '</b>';
    d.onclick = () => {
      if (activeFormats.has(f.key)) activeFormats.delete(f.key); else activeFormats.add(f.key);
      if (activeFormats.size === 0) activeFormats.add('all');
      renderFilters();
    };
    el.appendChild(d);
  });
}

let pool = [], qi = 0, score = 0, combo = 0, bestCombo = 0, good = 0, total = 0, timerT = null, urgentT = null, countT = null, tickT1 = null, tickT2 = null, tickT3 = null;

function start(diff) {
  pool = QUESTIONS.filter(q => {
    const themeOk = activeTheme === 'all'
      || (activeTheme === 'general' ? (q.theme !== 'retro' && q.theme !== 'pokemon') : q.theme === activeTheme);
    const fmtOk = q.format === 'image' || q.format === 'sound'
      ? (activeFormats.has('all') || activeFormats.has(q.format))
      : (activeFormats.has('all') || activeFormats.has(q.format));
    const diffOk = diff === 'mix' || q.diff === diff;
    return fmtOk && themeOk && diffOk;
  });
  if (pool.length < 4) { alert('Choisis au moins un format compatible !'); return; }
  pool = shuffle(pool).slice(0, 10);
  qi = 0; score = 0; combo = 0; bestCombo = 0; good = 0; total = 0;
  go('quiz'); renderQ(); addLevel();
}
function shuffle(a) { a = a.slice(); for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

function renderQ() {
  const q = pool[qi];
  document.getElementById('q-round').textContent = 'QUESTION ' + (qi+1) + '/' + pool.length;
  document.getElementById('q-score').textContent = 'SCORE ' + score.toLocaleString('fr-FR');
  document.getElementById('q-streak').textContent = 'COMBO ×' + combo;
  const TYPE_COLORS = { image:'var(--neon)', sound:'var(--cyan)', citation:'var(--pink)', anecdote:'var(--gold)', date:'var(--cyan)', riddle:'var(--green)' };
  const qt = document.getElementById('q-type');
  qt.innerHTML = (ICONS[q.format] || '') + ' ' + q.format.toUpperCase();
  qt.style.color = TYPE_COLORS[q.format] || 'var(--neon)';
  const v = document.getElementById('q-visual');
  if (q.format === 'image' || (q.asset && q.format !== 'sound')) showImgOrScene(v, q);
  else if (q.format === 'sound') v.innerHTML = '<div class="scene"><div class="eq"><i></i><i></i><i></i><i></i><i></i></div></div><audio controls autoplay style="width:88%; margin-top:6px" src="' + encodeURI(q.asset) + '"></audio>';
  else v.innerHTML = sceneFor(q);
  document.getElementById('q-text').textContent = q.text;
  const opts = document.getElementById('q-opts'); opts.innerHTML = '';
  shuffle(q.opts.map((o,i)=>({o,i}))).forEach((x, idx) => {
    const b = document.createElement('button');
    b.innerHTML = '<span style="opacity:.4; font-size:11px; margin-right:8px">' + (idx+1) + '</span>' + x.o;
    b.onclick = () => { if (!b.disabled) sfxClick(); answer(b, x.i === q.ans); };
    opts.appendChild(b);
  });
  const timer = document.getElementById('q-timer'), fill = document.getElementById('q-fill');
  const card = document.querySelector('.qcard');
  let count = document.querySelector('.q-count');
  if (!count) { count = document.createElement('div'); count.className = 'q-count'; card.appendChild(count); }
  timer.classList.remove('urgent'); count.classList.remove('urgent');
  fill.style.transition = 'none'; fill.style.width = '100%';
  void fill.offsetWidth;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = 'width 12s linear'; fill.style.width = '0%';
  }));
  clearTimeout(timerT); clearTimeout(urgentT); clearInterval(countT); clearTimeout(tickT1); clearTimeout(tickT2); clearTimeout(tickT3);
  let left = 12;
  count.textContent = left + ' s';
  countT = setInterval(() => { left--; if (count) count.textContent = Math.max(left,0) + ' s'; }, 1000);
  urgentT = setTimeout(() => { timer.classList.add('urgent'); if (count) count.classList.add('urgent'); }, 9500);
  tickT1 = setTimeout(sfxTick, 9800); tickT2 = setTimeout(sfxTick, 10800); tickT3 = setTimeout(sfxTick, 11800);
  timerT = setTimeout(() => { sfxTimeout(); flash('bad'); card.classList.add('shake'); combo = 0; setTimeout(next, 900); }, 12500);
}
function sceneFor(q) {
  if (q.format === 'date') return '<div class="scene"><div class="cal"><div class="cal-h"></div><div class="cal-b"></div></div>' +
    '<span class="yr y1">1985</span><span class="yr y2">1998</span><span class="yr y3">2011</span><span class="yr y4">2026</span></div>';
  if (q.format === 'citation') return '<div class="scene"><div class="bubble">« ... »</div></div>';
  if (q.format === 'anecdote') return '<div class="scene"><div class="bulb"></div>' +
    '<span class="spark s1"></span><span class="spark s2"></span><span class="spark s3"></span></div>';
  if (q.format === 'riddle') return '<div class="scene"><div class="puzzle p1">?</div><div class="puzzle p2">?</div><div class="puzzle p3">?</div></div>';
  return '<div class="scene"><div class="mark">GQ</div></div>';
}
function showImgOrScene(v, q) {
  const im = document.createElement('img');
  im.className = 'reveal-img'; im.alt = 'illustration';
  im.src = encodeURI(q.asset);
  im.onerror = function() { v.innerHTML = sceneFor(q); };
  v.innerHTML = ''; v.appendChild(im);
}
/* --- Niveau plateformer qui tourne en boucle en bas de l'ecran de quiz --- */
function marioSVG() {
  const rows = [
    '....RRRR....',
    '...RRRRRRRR.',
    '...SSSKSKS..',
    '..SSSKSSKSS.',
    '..SSSSSSSS..',
    '....KKKK....',
    '...RRRRRR...',
    '..RRDDDDRR..',
    '..RDDYDDYDR.',
    '.SSDDDDDDSS.',
    '.SSDDDDDDSS.',
    '...DDDDDD...',
    '...DDD.DDD..',
    '..BBB..BBB..',
    '.BBBB..BBBB.',
  ];
  const C = { R:'#e52521', S:'#ffc7a0', K:'#111', D:'#2b53d6', Y:'#ffd800', B:'#7a3b00' };
  let rects = '';
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = C[row[x]]; if (c) rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>'; } });
  return '<svg class="lvl-mario" viewBox="0 0 12 15" width="36" height="45" shape-rendering="crispEdges">' + rects + '</svg>';
}
function koopaSVG() {
  return '<svg viewBox="0 0 26 30" width="26" height="30" shape-rendering="crispEdges" style="filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))">'
    + '<rect x="0" y="9" width="9" height="7" fill="#ffd23e"/><rect x="1" y="11" width="2" height="2" fill="#111"/>'
    + '<rect x="6" y="6" width="17" height="17" rx="4" fill="#2fbf4f"/>'
    + '<rect x="8" y="8" width="13" height="4" rx="2" fill="#7ee787"/>'
    + '<rect x="8" y="23" width="4" height="5" fill="#ffd23e"/><rect x="17" y="23" width="4" height="5" fill="#ffd23e"/>'
    + '</svg>';
}

/* --- Bande plateformer vivante : moteur mini-jeu en bas de l'ecran, toutes pages --- */
let LVL = null;
function addLevel() {
  if (LVL) return;
  const lane = document.createElement('div');
  lane.className = 'lvlband';
  lane.innerHTML = '<div class="lvl-ground"></div><div class="lvl-deco"></div><div class="lvl-world"></div>'
    + '<div class="lvl-runner">' + marioSVG() + '</div>'
    + '<div class="lvl-hud"><span class="coin-ic"></span><span id="lvl-coins">0</span></div>';
  document.body.appendChild(lane);

  const world = lane.querySelector('.lvl-world');
  const deco = lane.querySelector('.lvl-deco');
  const runner = lane.querySelector('.lvl-runner');
  const hud = lane.querySelector('#lvl-coins');
  const GY = 28, GRAV = 1500, JUMP = 430;
  const S = {
    W: window.innerWidth, mx: window.innerWidth * 0.12,
    speed: 70, target: 70, nextChange: 2.5, boost: 0,
    feet: GY, vy: 0, onGround: true,
    inv: 0, coins: 0, t: 0,
    nextObst: 300, nextDeco: 0, obs: [],
  };
  LVL = { excite() { S.boost = Math.max(S.boost, 1.1); } };

  const mk = (cls, x, bottom, w, h, solid) => {
    const d = document.createElement('div');
    d.className = cls; d.style.left = x + 'px'; d.style.bottom = bottom + 'px';
    world.appendChild(d);
    return { el: d, x, w, h, bottom, solid: !!solid, dead: false, extra: 0 };
  };
  const spawnPattern = () => {
    const x = S.W + 60;
    const roll = Math.random();
    if (roll < 0.22) mk('lv-pipe', x, GY, 34, 46, true);
    else if (roll < 0.42) { mk('lv-block', x, GY, 24, 24, true); mk('lv-block', x, GY + 24, 24, 24, true); }
    else if (roll < 0.60) mk('lv-block', x, GY, 24, 24, true);
    else if (roll < 0.78) {
      const o = mk('lv-koopa', x, GY, 26, 30, true); o.extra = 34; o.koopa = true;
      o.el.innerHTML = koopaSVG();
    } else { for (let i = 0; i < 3; i++) mk('lv-coin', x + i * 26, 54 + (i === 1 ? 10 : 0), 16, 16, false); }
    S.nextObst = 150 + Math.random() * 190 + S.speed * 0.45;
  };
  const spawnDeco = () => {
    const x = S.W + 40;
    const d = document.createElement('div');
    if (Math.random() < 0.55) { d.className = 'lv-cloud'; d.style.bottom = (38 + Math.random() * 26) + 'px'; d.px = 0.4; }
    else { d.className = 'lv-bush'; d.style.bottom = GY + 'px'; d.px = 0.92; }
    d.style.left = x + 'px'; deco.appendChild(d);
    S.nextDeco = 140 + Math.random() * 260;
  };
  const popAt = (x, bottom, txt) => {
    const p = document.createElement('div');
    p.className = 'lv-pop'; p.textContent = txt;
    p.style.left = x + 'px'; p.style.bottom = bottom + 'px';
    world.appendChild(p); setTimeout(() => p.remove(), 650);
  };
  const overlapX = (o) => o.x < S.mx + 26 && o.x + o.w > S.mx + 4;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { for (let i = 0; i < 6; i++) spawnDeco(); return; }

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt;
    // vitesse vivante : lerp vers une cible qui change, + boost quand tu reponds juste
    S.nextChange -= dt;
    if (S.nextChange <= 0) { S.target = 55 + Math.random() * 95; S.nextChange = 2 + Math.random() * 3.5; }
    S.boost = Math.max(0, S.boost - dt * 0.55);
    S.speed += ((S.target * (1 + S.boost)) - S.speed) * Math.min(1, dt * 1.6);

    // IA de saut : regarde devant, saute les obstacles ou vers les pieces
    if (S.onGround) {
      let jump = false;
      for (const o of S.obs) { if (!o.solid) continue;
        const d = o.x - (S.mx + 26);
        if (d > -14 && d < 34 + S.speed * 0.30) { jump = true; break; } }
      if (!jump) for (const o of S.obs) { if (o.solid) continue;
        const d = o.x - (S.mx + 26);
        if (d > -18 && d < 20 + S.speed * 0.22) { jump = true; break; } }
      if (jump) { S.vy = JUMP; S.onGround = false; }
    }

    // physique
    S.vy -= GRAV * dt; S.feet += S.vy * dt;
    let support = GY;
    for (const o of S.obs) if (o.solid && overlapX(o)) support = Math.max(support, o.bottom + o.h);
    if (S.feet <= support) { S.feet = support; S.vy = 0; S.onGround = true; }
    else S.onGround = false;
    runner.style.bottom = S.feet + 'px';

    // deplacement + collisions
    for (const o of S.obs) {
      if (o.dead) continue;
      o.x -= (S.speed + o.extra) * dt;
      o.el.style.left = o.x + 'px';
      if (o.koopa) { o.el.classList.toggle('k-step', Math.sin(S.t * 14) > 0); }
      if (!overlapX(o)) continue;
      const mTop = S.feet, mBot = S.feet + 42;
      if (!o.solid) { // piece ramassee
        if (mBot > o.bottom && mTop < o.bottom + o.h) {
          o.dead = true; o.el.remove(); S.coins++; hud.textContent = S.coins;
          popAt(o.x, o.bottom + 14, '+100');
        }
      } else if (o.koopa) { // ecrase si on tombe dessus, sinon coup recu
        if (S.vy < -40 && S.feet > o.bottom + o.h - 12) {
          o.dead = true; o.el.classList.add('stomped'); setTimeout(() => o.el.remove(), 500);
          S.vy = 300; S.coins += 2; hud.textContent = S.coins; popAt(o.x, o.bottom + 34, '+200');
        } else if (S.inv <= 0) {
          S.inv = 1.6; runner.classList.add('hit'); setTimeout(() => runner.classList.remove('hit'), 750);
          lane.classList.remove('hurt'); void lane.offsetWidth; lane.classList.add('hurt');
          o.dead = true; o.el.classList.add('kicked'); setTimeout(() => o.el.remove(), 500);
        }
      } else if (S.feet < o.bottom + o.h - 8 && S.feet + 40 > o.bottom) {
        // collision laterale bloc/tuyau : petit saut de repli
        if (S.onGround) { S.vy = JUMP * 0.8; S.onGround = false; }
      }
    }
    S.obs = S.obs.filter(o => !o.dead && o.x + o.w > -70 && document.body.contains(o.el));
    S.inv = Math.max(0, S.inv - dt);

    // decor en parallaxe
    Array.from(deco.children).forEach(d => {
      d._x = (d._x === undefined ? parseFloat(d.style.left) : d._x) - S.speed * (d.px || 0.5) * dt;
      d.style.left = d._x + 'px';
      if (d._x < -70) d.remove();
    });

    // spawns
    S.nextObst -= S.speed * dt; if (S.nextObst <= 0) spawnPattern();
    S.nextDeco -= S.speed * dt; if (S.nextDeco <= 0) spawnDeco();

    requestAnimationFrame(tick);
  };
  spawnPattern(); S.nextObst = 260;
  requestAnimationFrame(tick);
}
function flash(kind) {
  const f = document.getElementById('flash');
  f.className = 'flash'; void f.offsetWidth; f.classList.add(kind);
}
function comboPop(n) {
  const c = document.createElement('div');
  c.className = 'combo-pop'; c.textContent = 'COMBO ×' + n + ' !';
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 1150);
}
function answer(btn, ok) {
  clearTimeout(timerT); clearTimeout(urgentT);
  total++;
  document.querySelectorAll('#q-opts button').forEach(b => b.disabled = true);
  const card = document.querySelector('.qcard');
  const streak = document.getElementById('q-streak');
  clearTimeout(timerT); clearTimeout(urgentT); clearInterval(countT); clearTimeout(tickT1); clearTimeout(tickT2); clearTimeout(tickT3);
  if (ok) {
    btn.classList.add('right'); good++;
    combo++; bestCombo = Math.max(bestCombo, combo);
    const gained = 100 + combo * 50;
    score += gained;
    const p = document.getElementById('q-pts');
    p.textContent = '+' + gained + (combo > 1 ? ' ×' + combo : '');
    p.style.display = 'block'; p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
    flash('good'); card.classList.remove('bump'); void card.offsetWidth; card.classList.add('bump');
    if (LVL && LVL.excite) LVL.excite(); // Mario accelere quand tu reponds juste
    if (combo >= 2) { sfxCombo(combo); comboPop(combo); streak.classList.add('hot'); } else sfxGood();
    if (navigator.vibrate) navigator.vibrate(40);
  } else {
    btn.classList.add('wrong'); combo = 0;
    sfxBad(); flash('bad');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    streak.classList.remove('hot');
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
  }
  setTimeout(next, 1100);
}
function next() {
  qi++;
  if (qi >= pool.length) return results();
  renderQ();
}
function results() {
  sfxFinish();
  const acc = total ? Math.round(good/total*100) : 0;
  const rank = acc >= 90 ? 'S' : acc >= 70 ? 'A' : acc >= 50 ? 'B' : acc >= 30 ? 'C' : 'D';
  document.getElementById('r-score').textContent = score.toLocaleString('fr-FR') + ' pts';
  document.getElementById('r-good').textContent = good + '/' + total;
  document.getElementById('r-acc').textContent = acc + '%';
  document.getElementById('r-combo').textContent = '×' + bestCombo;
  document.getElementById('r-rank').textContent = rank;
  document.getElementById('r-title').textContent = acc >= 70 ? 'Bien joué, gamer !' : acc >= 40 ? 'Pas mal, continue !' : 'Faut réviser tes classiques';
  document.getElementById('r-sub').textContent = 'Rang ' + rank + ' — meilleur combo ×' + bestCombo;
  go('res');
}

function go(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('show'));
  document.getElementById('s-' + id).classList.add('show');
  window.scrollTo({top:0});
}
document.addEventListener('keydown', e => {
  if (!document.getElementById('s-quiz').classList.contains('show')) return;
  const n = parseInt(e.key);
  if (n >= 1 && n <= 4) { const b = document.querySelectorAll('#q-opts button')[n-1]; if (b && !b.disabled) b.click(); }
});
renderFilters();
addLevel();
