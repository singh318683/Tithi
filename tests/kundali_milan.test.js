// Kundali Milan tests. Run from the repo root:  node tests/kundali_milan.test.js
// Loads the real engine code (panchang engine P + Kundali engine K) out of every bundled
// index.html, so the web, iOS and Android copies are all checked.
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const FILES = ['index.html', 'ios/Tithi/Web/index.html', 'android/app/src/main/assets/web/index.html'];

function load(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const a = html.indexOf('/* ---------- Panchang engine'), b = html.indexOf('/* ---------- Observance rules');
  assert(a > 0 && b > a, `${file}: engine markers not found`);
  return new Function(html.slice(a, b) + '\nreturn { P, K };')();
}
const NAK = n => ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'].indexOf(n);
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
const pts = m => Object.fromEntries(m.kootas.map(k => [k.key, k.pts]));

for (const file of FILES) {
  console.log(`\n${file}`);
  const { P, K } = load(file);
  const T = K.tables;
  const star = (n, pada = 1) => K.fromNak(NAK(n), pada);

  /* ---- A. Tables against the standard published tables ----
     Sources: Muhurta Chintamani, Vivaha Prakarana 21-34, and Drik Panchang's Kundali Match
     tables as documented (with the groom by row) at sanatanbodh.in/en/kundli/milan (checked by
     them against Drik Panchang on five pairs); yoni table as published by Saravali
     (saravali.github.io/astrology/koota_yoni.html); nadi and gana lists as Saravali/Drik.   */
  t('Varna by rashi (Brahmin Karka/Vrishchika/Meena ... Shudra Mithuna/Tula/Kumbha)', () =>
    assert.deepStrictEqual(T.VARNA, [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3]));
  t('Vashya groups incl. Dhanu/Makara split at 15°', () => {
    assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 10, 11].map(r => T.vashyaGroup(r, 5)), [0, 0, 1, 2, 3, 1, 1, 4, 1, 2]);
    assert.deepStrictEqual([T.vashyaGroup(8, 10), T.vashyaGroup(8, 20), T.vashyaGroup(9, 10), T.vashyaGroup(9, 20)], [1, 0, 0, 2]);
  });
  t('Vashya score table = Drik Panchang (groom row)', () =>
    assert.deepStrictEqual(T.VASHYA_TABLE, [[2, 1, 1, 0.5, 1], [1, 2, 0.5, 0, 1], [1, 0.5, 2, 1, 1], [0, 0, 0, 2, 0], [1, 1, 1, 0, 2]]));
  t('Gana table = Drik Panchang (Deva boy + Manushya girl 6, Manushya boy + Deva girl 5, Rakshasa boy + Deva girl 1)', () =>
    assert.deepStrictEqual(T.GANA_TABLE, [[6, 6, 0], [5, 6, 0], [1, 0, 6]]));
  t('Gana lists (9 Deva, 9 Manushya, 9 Rakshasa)', () => {
    const deva = ['Ashwini','Mrigashira','Punarvasu','Pushya','Hasta','Swati','Anuradha','Shravana','Revati'].map(NAK);
    const rak = ['Krittika','Ashlesha','Magha','Chitra','Vishakha','Jyeshtha','Mula','Dhanishta','Shatabhisha'].map(NAK);
    T.GANA.forEach((g, i) => assert.strictEqual(g, deva.includes(i) ? 0 : rak.includes(i) ? 2 : 1, 'nak ' + i));
  });
  t('Nadi lists (Adi / Madhya / Antya)', () => {
    const adi = ['Ashwini','Ardra','Punarvasu','Uttara Phalguni','Hasta','Jyeshtha','Mula','Shatabhisha','Purva Bhadrapada'].map(NAK);
    const ant = ['Krittika','Rohini','Ashlesha','Magha','Swati','Vishakha','Uttara Ashadha','Shravana','Revati'].map(NAK);
    T.NADI.forEach((g, i) => assert.strictEqual(g, adi.includes(i) ? 0 : ant.includes(i) ? 2 : 1, 'nak ' + i));
  });
  t('Yoni: each animal on exactly two nakshatras except Mongoose (U.Ashadha)', () => {
    const c = Array(14).fill(0); T.YONI.forEach(y => c[y]++); assert.deepStrictEqual(c, [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2]);
  });
  t('Yoni table: symmetric, diagonal 4, the 7 sworn enemy pairs score 0 (MC 25-26)', () => {
    for (let i = 0; i < 14; i++) { assert.strictEqual(T.YONI_TABLE[i][i], 4); for (let j = 0; j < 14; j++) assert.strictEqual(T.YONI_TABLE[i][j], T.YONI_TABLE[j][i]); }
    const zeros = []; for (let i = 0; i < 14; i++) for (let j = i + 1; j < 14; j++) if (T.YONI_TABLE[i][j] === 0) zeros.push(i + '-' + j);
    // horse-buffalo, elephant-lion, sheep-monkey, serpent-mongoose, dog-deer, cat-rat, cow-tiger
    assert.deepStrictEqual(zeros.sort(), ['0-8', '1-13', '2-11', '3-12', '4-10', '5-6', '7-9'].sort());
  });
  t('Yoni table = Saravali table except its two asymmetric cells', () => {
    const SAR = [[4,2,2,3,2,2,2,1,0,1,3,3,2,1],[2,4,3,3,2,2,2,2,3,1,2,3,2,0],[2,3,4,2,1,2,1,3,3,1,2,0,3,1],[3,3,2,4,2,1,1,1,1,2,2,2,0,2],[2,2,1,2,4,2,1,2,2,1,0,2,1,1],[2,2,2,1,2,4,0,2,2,1,3,3,2,1],[2,2,1,1,1,0,4,2,2,2,2,2,1,2],[1,2,3,1,2,2,2,4,3,0,3,2,2,1],[0,3,3,1,2,2,2,3,4,1,2,2,2,1],[1,1,1,2,1,1,2,0,1,4,1,1,2,1],[1,2,2,2,0,3,2,3,2,1,4,2,2,1],[3,3,0,2,2,3,2,2,2,1,2,4,3,2],[2,2,3,0,1,2,1,2,2,2,2,3,4,2],[1,0,1,2,1,1,2,1,2,1,1,2,2,4]];
    const diff = []; for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) if (SAR[i][j] !== T.YONI_TABLE[i][j]) diff.push(`${i},${j}`);
    assert.deepStrictEqual(diff, ['10,0', '13,8']); // Saravali deer-horse 1 (horse-deer 3), lion-buffalo 2 (buffalo-lion 1)
  });
  t('Graha Maitri: Sun-Moon 5, Sun-Mercury 4, Mars-Venus 3, Moon-Mercury 1, Moon-Venus ½, Sun-Saturn 0', () => {
    const [Su, Mo, Ma, Me, Ju, Ve, Sa] = [0, 1, 2, 3, 4, 5, 6];
    assert.deepStrictEqual([T.maitriPts(Su, Mo), T.maitriPts(Su, Me), T.maitriPts(Ma, Ve), T.maitriPts(Mo, Me), T.maitriPts(Mo, Ve), T.maitriPts(Su, Sa), T.maitriPts(Ju, Ju)], [5, 4, 3, 1, 0.5, 0, 5]);
    for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) assert.strictEqual(T.maitriPts(a, b), T.maitriPts(b, a));
  });
  t('Tara: remainders 3, 5, 7 are inauspicious', () => {
    assert.strictEqual(T.taraCount(NAK('Bharani'), NAK('Ashwini')), 27);
    assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(T.taraGood), [true, true, false, true, false, true, false, true, true]);
  });

  /* ---- B. Worked examples (exact nakshatra pairs, expected totals) ----
     Expected values are the published per-pair tables at satmargastro.com/compatibility/nakshatra/ashwini
     ("Ashwini with each of the 27 nakshatras", groom/bride columns). Only pairs whose nakshatras lie
     in a single rashi and that avoid the one cell where that site's gana table differs from
     Drik Panchang (Deva-Rakshasa) are used.                                                       */
  const cases = [
    // groom, bride, expected total, expected kootas
    ['Ashwini', 'Bharani', 34, { varna: 1, vashya: 2, tara: 3, yoni: 2, maitri: 5, gana: 6, bhakoot: 7, nadi: 8 }],
    ['Bharani', 'Ashwini', 33, { gana: 5 }],
    ['Ashwini', 'Rohini', 24.5, { varna: 1, vashya: 2, tara: 1.5, yoni: 3, maitri: 3, gana: 6, bhakoot: 0, nadi: 8 }],
    ['Rohini', 'Ashwini', 22.5, { varna: 0, gana: 5 }],
    ['Ashwini', 'Pushya', 29.5, { varna: 0, vashya: 1, tara: 1.5, yoni: 2, maitri: 4, gana: 6, bhakoot: 7, nadi: 8 }],
    ['Pushya', 'Ashwini', 30.5, { varna: 1 }],
    ['Ashwini', 'Hasta', 10, { varna: 1, vashya: 1, tara: 1.5, yoni: 0, maitri: 0.5, gana: 6, bhakoot: 0, nadi: 0 }],
    ['Hasta', 'Ashwini', 9, { varna: 0 }],
    ['Ashwini', 'Ashwini', 28, { tara: 3, yoni: 4, nadi: 0 }],
    ['Ashwini', 'Swati', 27.5, { yoni: 0 }],
    ['Ashwini', 'Revati', 25, {}],
    ['Revati', 'Ashwini', 26, {}],
  ];
  for (const [g, b, total, k] of cases) t(`Groom ${g} + bride ${b} = ${total}`, () => {
    const m = K.match(star(g), star(b)), p = pts(m);
    for (const key in k) assert.strictEqual(p[key], k[key], `${key}: got ${p[key]}, expected ${k[key]}`);
    assert.strictEqual(m.total, total, `total ${m.total}, breakdown ${JSON.stringify(p)}`);
  });
  // Worked example from janamkundlijyotish.com/en/prashna/gun-milan-table (groom Rohini/Taurus, bride Ardra/Gemini).
  // That page restores Bhakoot to 7 because Venus and Mercury are friends and gives Vashya ½; Drik Panchang
  // counting (used here) gives Vashya 1 and keeps Bhakoot 0, so the plain total is 24.5 and the
  // cancellation is flagged instead. The six other kootas must match the page exactly.
  t('Groom Rohini + bride Ardra: worked example kootas, Bhakoot dosha flagged as cancelled', () => {
    const m = K.match(star('Rohini'), star('Ardra')), p = pts(m);
    assert.deepStrictEqual([p.varna, p.tara, p.yoni, p.maitri, p.gana, p.nadi], [1, 1.5, 2, 5, 6, 8]);
    assert.strictEqual(p.bhakoot, 0); assert.strictEqual(m.bhakoot.dosha, true); assert.strictEqual(m.bhakoot.cancelled, true);
    assert.strictEqual(m.total, 24.5);
  });

  /* ---- C. Dosha cancellation rules and bands ---- */
  t('Nadi dosha: same nakshatra, different pada = cancelled; same pada = not cancelled', () => {
    let m = K.match(star('Ashwini', 1), star('Ashwini', 2)); assert(m.nadi.dosha && m.nadi.cancelled);
    m = K.match(star('Ashwini', 3), star('Ashwini', 3)); assert(m.nadi.dosha && !m.nadi.cancelled);
  });
  t('Nadi dosha: same rashi, different nakshatra (Rohini & Krittika 2, both Vrishabha) = cancelled', () => {
    const m = K.match(star('Rohini'), star('Krittika', 2)); assert(m.nadi.dosha && m.nadi.cancelled);
  });
  t('Nadi dosha: same nakshatra, different rashi (Krittika 1 Mesha & Krittika 2 Vrishabha) = cancelled', () => {
    const m = K.match(star('Krittika', 1), star('Krittika', 2)); assert(m.nadi.dosha && m.nadi.cancelled);
  });
  t('Nadi dosha with no cancellation (Ashwini & Ardra)', () => {
    const m = K.match(star('Ashwini'), star('Ardra')); assert(m.nadi.dosha && !m.nadi.cancelled);
  });
  t('Bhakoot 6/8 Mesha-Vrishchika (both Mars) = dosha cancelled; Mesha-Kanya 6/8 (Mars-Mercury) not', () => {
    let m = K.match(star('Ashwini'), star('Anuradha')); assert.strictEqual(pts(m).bhakoot, 0); assert(m.bhakoot.dosha && m.bhakoot.cancelled);
    m = K.match(star('Ashwini'), star('Hasta')); assert(m.bhakoot.dosha && !m.bhakoot.cancelled);
  });
  t('Verdict bands: 17.5 / 18 / 24.5 / 25 / 32.5 / 33', () =>
    assert.deepStrictEqual([17.5, 18, 24.5, 25, 32.5, 33].map(x => K.band(x).key), ['low', 'avg', 'avg', 'good', 'good', 'best']));
  t('Totals always between 0 and 36 for all 108 x 108 padas', () => {
    for (let a = 0; a < 108; a++) for (let b = 0; b < 108; b++) { const m = K.match(K.fromNak(a >> 2, (a & 3) + 1), K.fromNak(b >> 2, (b & 3) + 1)); assert(m.total >= 0 && m.total <= 36 && m.kootas.length === 8); }
  });

  /* ---- D. Birth time -> Moon, with time zones ---- */
  t('Birth time converts with the right UTC offset (IST, London BST/GMT, New York EDT)', () => {
    assert.strictEqual(K.localToUTC(1990, 0, 15, 10, 30, 'Asia/Kolkata'), Date.UTC(1990, 0, 15, 5, 0));
    assert.strictEqual(K.localToUTC(1995, 6, 1, 9, 0, 'Europe/London'), Date.UTC(1995, 6, 1, 8, 0));
    assert.strictEqual(K.localToUTC(1995, 0, 1, 9, 0, 'Europe/London'), Date.UTC(1995, 0, 1, 9, 0));
    assert.strictEqual(K.localToUTC(2000, 6, 4, 18, 0, 'America/New_York'), Date.UTC(2000, 6, 4, 22, 0));
  });
  t('person() uses the app engine: nakshatra = P.nakIdx at the UTC birth moment', () => {
    for (const [date, time, tz] of [['1992-03-08', '06:15', 'Asia/Kolkata'], ['1988-11-20', '23:40', 'Europe/London'], ['2001-07-04', '14:05', 'America/Chicago']]) {
      const p = K.person({ mode: 'birth', date, time, tz }); const [y, m, d] = date.split('-').map(Number), [hh, mi] = time.split(':').map(Number);
      const ms = K.localToUTC(y, m - 1, d, hh, mi, tz);
      assert.strictEqual(p.nak, P.nakIdx(ms)); assert.strictEqual(p.rashi, Math.floor(P.sidMoon(ms) / 30));
      assert(p.pada >= 1 && p.pada <= 4); assert.strictEqual(Math.floor(p.nak * 4 + p.pada - 1), Math.floor(P.sidMoon(ms) / (360 / 108)));
    }
  });
  t('Full Moon of 2024-04-23 23:49 UTC: Moon sidereal ~ Chitra/Swati, Tula (sanity check of engine)', () => {
    const p = K.moonAt(Date.UTC(2024, 3, 23, 23, 49)); // Chaitra Purnima 2024: Moon in Chitra/Swati, Tula
    assert.strictEqual(p.rashi, 6); assert([13, 14].includes(p.nak));
  });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
