// Çarklı engel ve devriye düşman davranış testleri (tarayıcısız).
import { createState, update } from '../src/engine.js';

const GROUND = { x: 0, y: 480, w: 960, h: 20, color: 'platformNeutral' };

function makeLevel(extra) {
  return {
    platforms: [GROUND, ...extra],
    blueSpawn: { x: 20, y: 440 },
    pinkSpawn: { x: 60, y: 440 },
  };
}

function run(state, steps = 60, keys = {}) {
  for (let i = 0; i < steps; i++) update(state, keys, 1 / 60, 'P1');
}

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!ok) failures++;
}

// 1) Çark döner
{
  const wheel = { x: 400, y: 200, w: 80, h: 80, isWheel: true, spinSpeed: 2.5 };
  const s = createState(makeLevel([wheel]));
  const plat = s.platforms[1];
  run(s, 60);
  check('çark döner', plat.wheelAngle > 1, `angle=${plat.wheelAngle.toFixed(2)}`);
}

// 2) Çark mesafe 0 ise yerinde durur
{
  const wheel = { x: 400, y: 200, w: 80, h: 80, isWheel: true, patrolRange: 0, patrolSpeed: 100 };
  const s = createState(makeLevel([wheel]));
  const plat = s.platforms[1];
  const startX = plat.x;
  run(s, 120);
  check('mesafe 0 iken çark yerinde durur', Math.abs(plat.x - startX) < 0.001, `x=${plat.x.toFixed(1)}`);
}

// 3) Çark ayarlanan mesafede gidip döner
{
  const wheel = { x: 300, y: 200, w: 80, h: 80, isWheel: true, patrolRange: 100, patrolSpeed: 100, patrolAxis: 'x' };
  const s = createState(makeLevel([wheel]));
  const plat = s.platforms[1];
  let maxX = plat.x;
  let minX = plat.x;
  for (let i = 0; i < 240; i++) {
    update(s, {}, 1 / 60, 'P1');
    maxX = Math.max(maxX, plat.x);
    minX = Math.min(minX, plat.x);
  }
  check('çark sağa doğru mesafeye ulaşır', Math.abs(maxX - 400) < 2, `maxX=${maxX.toFixed(1)}`);
  check('çark başlangıca geri döner', Math.abs(minX - 300) < 2, `minX=${minX.toFixed(1)}`);
}

// 4) Çark merkezine temas öldürür
{
  const wheel = { x: 200, y: 200, w: 200, h: 200, isWheel: true };
  const s = createState(makeLevel([wheel]));
  s.players[0].x = 280; s.players[0].y = 280; s.players[0].vx = 0; s.players[0].vy = 0;
  update(s, {}, 1 / 60, 'P1');
  check('çark merkezi öldürür', s.restartRequested === true);
}

// 5) Çarkın kutu köşesi (daire dışı) öldürmez
{
  const wheel = { x: 100, y: 100, w: 200, h: 200, isWheel: true };
  const s = createState(makeLevel([wheel]));
  const p = s.players[0];
  p.w = 16; p.h = 16;
  p.x = 100; p.y = 100; p.vx = 0; p.vy = 0;
  update(s, {}, 1 / 60, 'P1');
  check('çarkın kutu köşesi öldürmez', s.restartRequested === false);
}

// 6) Devriye düşmanı ayarlanan mesafede gidip döner
{
  const enemy = { x: 100, y: 300, w: 40, h: 40, isEnemy: true, patrolRange: 100, patrolSpeed: 100, patrolAxis: 'x' };
  const s = createState(makeLevel([enemy]));
  const plat = s.platforms[1];
  let maxX = plat.x;
  let minX = plat.x;
  for (let i = 0; i < 240; i++) {
    update(s, {}, 1 / 60, 'P1');
    maxX = Math.max(maxX, plat.x);
    minX = Math.min(minX, plat.x);
  }
  check('düşman mesafeye ulaşır', Math.abs(maxX - 200) < 2, `maxX=${maxX.toFixed(1)}`);
  check('düşman başlangıca döner', Math.abs(minX - 100) < 2, `minX=${minX.toFixed(1)}`);
  check('düşman yön değiştirir', plat.patrolDir === 1 || plat.patrolDir === -1);
}

// 7) Devriye düşmanı dikey eksende çalışır
{
  const enemy = { x: 500, y: 200, w: 40, h: 40, isEnemy: true, patrolRange: 80, patrolSpeed: 100, patrolAxis: 'y' };
  const s = createState(makeLevel([enemy]));
  const plat = s.platforms[1];
  const startX = plat.x;
  let maxY = plat.y;
  for (let i = 0; i < 60; i++) {
    update(s, {}, 1 / 60, 'P1');
    maxY = Math.max(maxY, plat.y);
  }
  check('düşman dikey devriye yapar', maxY > 210 && Math.abs(plat.x - startX) < 0.001, `maxY=${maxY.toFixed(1)}`);
}

// 8) Düşmana temas öldürür
{
  const enemy = { x: 200, y: 440, w: 40, h: 40, isEnemy: true, patrolRange: 0 };
  const s = createState(makeLevel([enemy]));
  s.players[0].x = 200; s.players[0].y = 440; s.players[0].vx = 0; s.players[0].vy = 0;
  update(s, {}, 1 / 60, 'P1');
  check('düşmana temas öldürür', s.restartRequested === true);
}

// 9) Çark gittiği yöne döner: sağa giderken saat yönü (+)
{
  const wheel = { x: 300, y: 200, w: 80, h: 80, isWheel: true, patrolRange: 100, patrolSpeed: 100, patrolAxis: 'x' };
  const s = createState(makeLevel([wheel]));
  const plat = s.platforms[1];
  for (let i = 0; i < 20; i++) update(s, {}, 1 / 60, 'P1');
  check('sağa giderken saat yönünde döner', plat.wheelAngle > 0 && plat.wheelSpinDir === 1, `angle=${plat.wheelAngle.toFixed(3)} dir=${plat.wheelSpinDir}`);
}

// 10) Çark sola giderken saat yönünün tersine döner (-)
{
  const wheel = { x: 400, y: 200, w: 80, h: 80, isWheel: true, patrolRange: 100, patrolSpeed: 100, patrolAxis: 'x' };
  const s = createState(makeLevel([wheel]));
  const plat = s.platforms[1];
  plat.x = 480;          // sağ uca yakın başlat
  plat.patrolDir = -1;   // sola doğru hareket
  const beforeX = plat.x;
  for (let i = 0; i < 20; i++) update(s, {}, 1 / 60, 'P1');
  check('sola giderken saat yönünün tersine döner', plat.wheelAngle < 0 && plat.wheelSpinDir === -1, `angle=${plat.wheelAngle.toFixed(3)} dir=${plat.wheelSpinDir} dx=${(plat.x - beforeX).toFixed(1)}`);
}

// 11) Yön değişince dönüş yönü de değişir
{
  const wheel = { x: 400, y: 200, w: 80, h: 80, isWheel: true, patrolRange: 100, patrolSpeed: 300, patrolAxis: 'x' };
  const s = createState(makeLevel([wheel]));
  const plat = s.platforms[1];
  let sawRight = false;
  let sawLeftAfterRight = false;
  for (let i = 0; i < 240; i++) {
    update(s, {}, 1 / 60, 'P1');
    if (plat.wheelSpinDir === 1) sawRight = true;
    if (sawRight && plat.wheelSpinDir === -1) sawLeftAfterRight = true;
  }
  check('uçta dönünce dönüş yönü değişir', sawRight && sawLeftAfterRight);
}

// 12) Dönerken kıvılcım parçacığı üretir
{
  const wheel = { x: 300, y: 200, w: 80, h: 80, isWheel: true, spinSpeed: 5, patrolRange: 100, patrolSpeed: 100, sparkRate: 3 };
  const s = createState(makeLevel([wheel]));
  for (let i = 0; i < 30; i++) update(s, {}, 1 / 60, 'P1');
  check('çark kıvılcım üretir', s.particles.length > 0, `particles=${s.particles.length}`);
}

// 13) sparkEnabled=false kıvılcım üretmez
{
  const wheel = { x: 300, y: 200, w: 80, h: 80, isWheel: true, spinSpeed: 5, patrolRange: 100, patrolSpeed: 100, sparkEnabled: false, sparkRate: 3 };
  const s = createState(makeLevel([wheel]));
  for (let i = 0; i < 30; i++) update(s, {}, 1 / 60, 'P1');
  check('sparkEnabled=false kıvılcım üretmez', s.particles.length === 0, `particles=${s.particles.length}`);
}

console.log(failures === 0 ? '\nTÜM ENGELLER TESTLERİ GEÇTİ' : `\n${failures} TEST BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
