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
  b.textContent = muted ? '🔇 Muet' : '🔊 Son';
  b.classList.toggle('off', muted);
}
const FORMATS = [
  { key:'all', label:'Tous', ic:'🎲' },
  { key:'image', label:'Image', ic:'📸' },
  { key:'sound', label:'Son', ic:'🎵' },
  { key:'citation', label:'Citation', ic:'💬' },
  { key:'anecdote', label:'Anecdote', ic:'🤯' },
  { key:'date', label:'Date', ic:'📅' },
  { key:'riddle', label:'Devinette', ic:'🧩' },
];
let activeFormats = new Set(FORMATS.map(f => f.key));

function renderFilters() {
  const el = document.getElementById('mode-filters');
  el.innerHTML = '';
  FORMATS.forEach(f => {
    const d = document.createElement('div');
    d.className = 'mode' + (activeFormats.has(f.key) ? ' on' : '');
    d.innerHTML = '<b>' + f.ic + '</b>' + f.label;
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
    const fmtOk = q.format === 'image' || q.format === 'sound'
      ? (activeFormats.has('all') || activeFormats.has(q.format))
      : (activeFormats.has('all') || activeFormats.has(q.format));
    const diffOk = diff === 'mix' || q.diff === diff;
    return fmtOk && diffOk;
  });
  if (pool.length < 4) { alert('Choisis au moins un format compatible !'); return; }
  pool = shuffle(pool).slice(0, 10);
  qi = 0; score = 0; combo = 0; bestCombo = 0; good = 0; total = 0;
  go('quiz'); renderQ();
}
function shuffle(a) { a = a.slice(); for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

function renderQ() {
  const q = pool[qi];
  document.getElementById('q-round').textContent = 'QUESTION ' + (qi+1) + '/' + pool.length;
  document.getElementById('q-score').textContent = 'SCORE ' + score.toLocaleString('fr-FR');
  document.getElementById('q-streak').textContent = '🔥 COMBO ×' + combo;
  document.getElementById('q-type').textContent = q.ic + ' ' + q.format.toUpperCase();
  const v = document.getElementById('q-visual');
  if (q.format === 'image') v.innerHTML = '<img class="reveal-img" src="' + encodeURI(q.asset) + '" alt="capture mystère" ' +
    'onerror="this.outerHTML='<div class=big>📸</div><div style=font-size:11px;color:var(--dim)>Image manquante : dépose-la dans ' + q.asset + '</div>'">';
  else if (q.format === 'sound') v.innerHTML = '<div class="big">' + q.ic + '</div><audio controls autoplay style="width:90%" src="' + encodeURI(q.asset) + '"></audio>';
  else v.innerHTML = '<div class="big">' + q.ic + '</div>';
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
  requestAnimationFrame(() => { fill.style.transition = 'width 12s linear'; fill.style.width = '0%'; });
  clearTimeout(timerT); clearTimeout(urgentT); clearInterval(countT); clearTimeout(tickT1); clearTimeout(tickT2); clearTimeout(tickT3);
  let left = 12;
  count.textContent = left + ' s';
  countT = setInterval(() => { left--; if (count) count.textContent = Math.max(left,0) + ' s'; }, 1000);
  urgentT = setTimeout(() => { timer.classList.add('urgent'); if (count) count.classList.add('urgent'); }, 9500);
  tickT1 = setTimeout(sfxTick, 9800); tickT2 = setTimeout(sfxTick, 10800); tickT3 = setTimeout(sfxTick, 11800);
  timerT = setTimeout(() => { sfxTimeout(); flash('bad'); card.classList.add('shake'); combo = 0; setTimeout(next, 900); }, 12500);
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
  const rank = acc >= 90 ? 'S 🏅' : acc >= 70 ? 'A 🥇' : acc >= 50 ? 'B 🥈' : acc >= 30 ? 'C 🥉' : 'D 💀';
  document.getElementById('r-score').textContent = score.toLocaleString('fr-FR') + ' pts';
  document.getElementById('r-good').textContent = good + '/' + total;
  document.getElementById('r-acc').textContent = acc + '%';
  document.getElementById('r-combo').textContent = '×' + bestCombo;
  document.getElementById('r-rank').textContent = rank;
  document.getElementById('r-title').textContent = acc >= 70 ? 'Bien joué, gamer !' : acc >= 40 ? 'Pas mal, continue !' : 'Faut réviser tes classiques 😅';
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