// Kutu (box) — denge platformu etkileşimi testleri (tarayıcısız).
import { createState, update } from '../src/engine.js';

const SEESAW = { x: 380, y: 300, w: 220, h: 16, color: 'platformNeutral', isSeesaw: true };
const PIVOT_X = SEESAW.x + SEESAW.w / 2;
const SURFACE_Y = 300;

function makeLevel(extra = []) {
  return {
    platforms: [
      { ...SEESAW },
      { x: 0, y: 520, w: 960, h: 20, color: 'platformNeutral' },
      ...extra,
    ],
    blueSpawn: { x: 80, y: 460 },
    pinkSpawn: { x: 140, y: 460 },
  };
}

const placePlayer = (state, i, centerX, feetY) => {
  const p = state.players[i];
  p.x = centerX - p.w / 2;
  p.y = feetY - p.h;
  p.vx = 0; p.vy = 0; p.grounded = true;
};

const run = (state, steps = 120, keys = {}) => {
  for (let i = 0; i < steps; i++) update(state, keys, 1 / 60, 'BOTH');
};

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!ok) failures++;
};

// 1) Kutu tahtanın üstüne iner ve orada durur
{
  const box = { x: PIVOT_X + 40, y: 220, w: 40, h: 40, isBox: true, color: 'platformNeutral' };
  const s = createState(makeLevel([box]));
  const b = s.platforms[2];
  run(s, 60);
  const plat = s.platforms[0];
  const surface = plat.y + plat.h / 2 + (b.x + b.w / 2 - PIVOT_X) * Math.tan(plat.angle) - (plat.h / 2) / Math.cos(plat.angle);
  check('kutu tahtaya iner', Math.abs((b.y + b.h) - surface) < 3, `feet=${(b.y + b.h).toFixed(1)} surf=${surface.toFixed(1)}`);
  check('kutu tahtada kalır (düşmez)', b.boxGrounded === true, `grounded=${b.boxGrounded}`);
}

// 2) Kutunun ağırlığı tahtayı kendi tarafına yatırır
{
  const box = { x: PIVOT_X + 70, y: SURFACE_Y - 40, w: 40, h: 40, isBox: true, color: 'platformNeutral' };
  const s = createState(makeLevel([box]));
  const plat = s.platforms[0];
  run(s, 120);
  check('kutunun tarafı aşağı iner', plat.angle > 0.1, `angle=${plat.angle.toFixed(3)}`);
}

// 3) Kutu bir uçta, oyuncu diğer uçta → denge
{
  const box = { x: PIVOT_X + 60 - 20, y: SURFACE_Y - 40, w: 40, h: 40, isBox: true, color: 'platformNeutral', boxMass: 1 };
  const s = createState(makeLevel([box]));
  const plat = s.platforms[0];
  placePlayer(s, 0, PIVOT_X - 60, SURFACE_Y);
  placePlayer(s, 1, 900, 460);
  run(s, 150);
  check('kutu + oyuncu dengede kalır', Math.abs(plat.angle) < 0.06, `angle=${plat.angle.toFixed(3)}`);
}

// 4) Yüksekten atılan kutu karşı uçtaki oyuncuyu fırlatır
{
  const box = { x: PIVOT_X + 60, y: 200, w: 40, h: 40, isBox: true, color: 'platformNeutral' };
  const s = createState(makeLevel([box]));
  const plat = s.platforms[0];
  placePlayer(s, 0, PIVOT_X - 80, SURFACE_Y);
  placePlayer(s, 1, 900, 460);

  const b = s.platforms[2];
  b.vy = 1200; // sert iniş
  b.y = SURFACE_Y - b.h - 20;

  const startY = s.players[0].y;
  let minVy = 0;
  for (let i = 0; i < 14; i++) {
    update(s, {}, 1 / 60, 'BOTH');
    minVy = Math.min(minVy, s.players[0].vy);
  }
  check('kutu şoku oyuncuyu fırlatır', minVy < -300, `minVy=${minVy.toFixed(0)}`);
  check('fırlayan oyuncu yükselir', s.players[0].y < startY - 10, `y ${startY.toFixed(0)} -> ${s.players[0].y.toFixed(0)}`);
}

// 5) Yumuşak bırakılan kutu fırlatmaz
{
  const box = { x: PIVOT_X + 60, y: SURFACE_Y - 60, w: 40, h: 40, isBox: true, color: 'platformNeutral' };
  const s = createState(makeLevel([box]));
  placePlayer(s, 0, PIVOT_X - 80, SURFACE_Y);
  placePlayer(s, 1, 900, 460);

  const b = s.platforms[2];
  b.vy = 150;

  let minVy = 0;
  for (let i = 0; i < 14; i++) {
    update(s, {}, 1 / 60, 'BOTH');
    minVy = Math.min(minVy, s.players[0].vy);
  }
  check('yumuşak kutu inişi fırlatmaz', minVy > -300, `minVy=${minVy.toFixed(0)}`);
}

// 6) Kutu fırlatılmaz (sadece oyuncular uçar)
{
  const box = { x: PIVOT_X + 60, y: 200, w: 40, h: 40, isBox: true, color: 'platformNeutral' };
  const s = createState(makeLevel([box]));
  placePlayer(s, 0, PIVOT_X - 80, SURFACE_Y);
  placePlayer(s, 1, 900, 460);

  const b = s.platforms[2];
  b.vy = 1200;
  b.y = SURFACE_Y - b.h - 20;

  let minBoxVy = 0;
  for (let i = 0; i < 14; i++) {
    update(s, {}, 1 / 60, 'BOTH');
    if (i > 0) minBoxVy = Math.min(minBoxVy, b.vy);
  }
  check('kutu kendisi fırlatılmaz', minBoxVy > -200, `minBoxVy=${minBoxVy.toFixed(0)}`);
}

// 7) Kutu tahtanın eğimiyle birlikte taşınır (yüzeyde kalır)
{
  const box = { x: PIVOT_X + 60 - 20, y: SURFACE_Y - 40, w: 40, h: 40, isBox: true, color: 'platformNeutral' };
  const s = createState(makeLevel([box]));
  const plat = s.platforms[0];
  placePlayer(s, 0, 120, 460);
  placePlayer(s, 1, 900, 460);
  run(s, 120);
  const b = s.platforms[2];
  const angle = plat.angle;
  const surface = plat.y + plat.h / 2 + (b.x + b.w / 2 - PIVOT_X) * Math.tan(angle) - (plat.h / 2) / Math.cos(angle);
  check('kutu eğik yüzeyde kalır', Math.abs(angle) > 0.1 && Math.abs((b.y + b.h) - surface) < 4, `feet=${(b.y + b.h).toFixed(1)} surf=${surface.toFixed(1)} angle=${angle.toFixed(2)}`);
}

// 8) Gerçek düşüş: farklı yüksekliklerden bırakılan kutu (faz kayması dahil)
{
  const trial = (dropAbove, phase) => {
    const box = { x: PIVOT_X + 40, y: 0, w: 40, h: 40, isBox: true, color: 'platformNeutral', boxMass: 4 };
    const s = createState(makeLevel([box]));
    const p0 = s.players[0];
    p0.x = PIVOT_X - 100; p0.y = SURFACE_Y - 40; p0.vx = 0; p0.vy = 0; p0.grounded = true;
    placePlayer(s, 1, 900, 460);
    const b = s.platforms[2];
    b.y = SURFACE_Y - b.h - dropAbove;
    let minVy = 0;
    for (let i = 0; i < 60 + phase; i++) {
      update(s, {}, 1 / 60, 'BOTH');
      minVy = Math.min(minVy, p0.vy);
    }
    return minVy;
  };

  let okHigh = true;
  let okLow = true;
  for (let phase = 0; phase < 10; phase++) {
    if (trial(200, phase) > -300) okHigh = false; // yüksekten → fırlatmalı
    if (trial(40, phase) < -200) okLow = false;   // alçaktan → fırlatmamalı
  }
  check('yüksekten düşen kutu her fazda fırlatır', okHigh);
  check('alçaktan bırakılan kutu fırlatmaz', okLow);
}

// 9) Ağır kutu daha güçlü fırlatır
{
  const runDrop = (boxMass) => {
    const box = { x: PIVOT_X + 40, y: 0, w: 40, h: 40, isBox: true, color: 'platformNeutral', boxMass };
    const s = createState(makeLevel([box]));
    const p0 = s.players[0];
    p0.x = PIVOT_X - 100; p0.y = SURFACE_Y - 40; p0.vx = 0; p0.vy = 0; p0.grounded = true;
    placePlayer(s, 1, 900, 460);
    const b = s.platforms[2];
    b.y = SURFACE_Y - b.h - 200;
    let minVy = 0;
    for (let i = 0; i < 70; i++) {
      update(s, {}, 1 / 60, 'BOTH');
      minVy = Math.min(minVy, p0.vy);
    }
    return minVy;
  };
  const light = runDrop(0.5);
  const heavy = runDrop(4);
  check('ağır kutu daha güçlü fırlatır', heavy < light - 100, `light=${light.toFixed(0)} heavy=${heavy.toFixed(0)}`);
}

console.log(failures === 0 ? '\nTÜM KUTU/SEESAW TESTLERİ GEÇTİ' : `\n${failures} TEST BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
