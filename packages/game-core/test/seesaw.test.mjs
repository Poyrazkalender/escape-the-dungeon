// Geçici doğrulama betiği: denge platformu motor davranışı (tarayıcısız).
import { createState, update } from '../src/engine.js';

const SEESAW = { x: 380, y: 300, w: 220, h: 16, color: 'platformNeutral', isSeesaw: true };
const PIVOT_X = SEESAW.x + SEESAW.w / 2;
const SURFACE_Y = SEESAW.y + SEESAW.h / 2 - SEESAW.h / 2; // 300 (angle 0)

function makeLevel(extraPlatforms = []) {
  return {
    platforms: [
      { ...SEESAW },
      { x: 0, y: 500, w: 960, h: 20, color: 'platformNeutral' },
      ...extraPlatforms,
    ],
    blueSpawn: { x: 80, y: 440 },
    pinkSpawn: { x: 140, y: 440 },
  };
}

function place(state, index, centerX, feetY) {
  const p = state.players[index];
  p.x = centerX - p.w / 2;
  p.y = feetY - p.h;
  p.vx = 0; p.vy = 0; p.grounded = true;
}

function run(state, steps = 180, keys = {}) {
  for (let i = 0; i < steps; i++) update(state, keys, 1 / 60, 'BOTH');
}

function surfaceAt(plat, x) {
  const pivotY = plat.y + plat.h / 2;
  return pivotY + (x - (plat.x + plat.w / 2)) * Math.tan(plat.angle) - (plat.h / 2) / Math.cos(plat.angle);
}

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  → ' + extra : ''}`);
  if (!ok) failures++;
}

// 1) Sağdaki oyuncu sağ ucu aşağı indirir ve tahtada kalır
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  place(s, 0, PIVOT_X + 75, SURFACE_Y);
  place(s, 1, 120, 480); // solda, tahtanın dışında
  run(s);
  const feet = s.players[0].y + s.players[0].h;
  check('sağ binici açıyı pozitif yapar', plat.angle > 0.25, `angle=${plat.angle.toFixed(3)}`);
  check('sağ binici tahtada kalır', Math.abs(feet - surfaceAt(plat, s.players[0].x + 20)) < 3 && s.players[0].grounded,
    `feet=${feet.toFixed(1)} surf=${surfaceAt(plat, s.players[0].x + 20).toFixed(1)}`);
}

// 2) Soldaki oyuncu negatif açı
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  place(s, 0, PIVOT_X - 75, SURFACE_Y);
  place(s, 1, 840, 480);
  run(s);
  check('sol binici açıyı negatif yapar', plat.angle < -0.25, `angle=${plat.angle.toFixed(3)}`);
}

// 3) Simetrik iki oyuncu dengede
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  place(s, 0, PIVOT_X - 70, SURFACE_Y);
  place(s, 1, PIVOT_X + 70, SURFACE_Y);
  run(s);
  check('simetrik biniciler dengede', Math.abs(plat.angle) < 0.02, `angle=${plat.angle.toFixed(4)}`);
}

// 4) İkisi de sağda → sağa yatar
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  place(s, 0, PIVOT_X + 30, SURFACE_Y);
  place(s, 1, PIVOT_X + 80, SURFACE_Y);
  run(s);
  check('iki binici sağda → sağa yatar', plat.angle > 0.25, `angle=${plat.angle.toFixed(3)}`);
}

// 5) Tahtanın altındaki oyuncu yukarı ışınlanmaz ve tork üretmez
{
  const s = createState(makeLevel([{ x: 300, y: 420, w: 400, h: 20, color: 'platformNeutral' }]));
  const plat = s.platforms[0];
  const p = s.players[0];
  p.x = PIVOT_X - 20; p.y = 360; p.vx = 0; p.vy = 0; p.grounded = true; // zemin üstünde (420)
  run(s);
  check('altındaki oyuncu tork üretmez', Math.abs(plat.angle) < 0.01, `angle=${plat.angle.toFixed(4)}`);
  check('altındaki oyuncu tahtaya ışınlanmaz', Math.abs((p.y + p.h) - 420) < 2, `feet=${(p.y + p.h).toFixed(1)}`);
}

// 6) Sönümleme: tek binici ayrıldıktan sonra açı sabit kalır (salınım yok)
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  place(s, 0, PIVOT_X + 75, SURFACE_Y);
  run(s, 120);
  const a1 = plat.angle;
  s.players[0].x = 60; s.players[0].y = 440; // tahtadan ayrıl
  run(s, 60);
  check('binici ayrılınca açı korunur', Math.abs(plat.angle - a1) < 0.01, `${a1.toFixed(3)} → ${plat.angle.toFixed(3)}`);
}

// 7) maxAngle sınırı
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  plat.maxAngle = 0.2;
  place(s, 0, PIVOT_X + 100, SURFACE_Y);
  run(s);
  check('maxAngle sınırı aşılmaz', plat.angle <= 0.2001, `angle=${plat.angle.toFixed(3)}`);
}

// 8) Sert iniş → karşı uçtaki oyuncu havaya fırlar
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  place(s, 0, PIVOT_X - 80, SURFACE_Y); // sol uçta duran oyuncu

  const p2 = s.players[1];
  p2.x = PIVOT_X + 60;                       // merkezi sağ uçta
  p2.y = SURFACE_Y - p2.h - 20;              // tahtanın 20px üstünde
  p2.vx = 0; p2.vy = 900; p2.grounded = false; // sert iniş

  const startY = s.players[0].y;
  let minVy = 0;
  for (let i = 0; i < 12; i++) {
    update(s, {}, 1 / 60, 'BOTH');
    minVy = Math.min(minVy, s.players[0].vy);
  }

  check('sert iniş karşı uçtaki oyuncuyu fırlatır', minVy < -300, `minVy=${minVy.toFixed(0)}`);
  check('fırlayan oyuncu yükselir', s.players[0].y < startY - 10, `y ${startY.toFixed(0)} → ${s.players[0].y.toFixed(0)}`);
}

// 9) Yumuşak iniş fırlatma yapmaz
{
  const s = createState(makeLevel());
  place(s, 0, PIVOT_X - 80, SURFACE_Y);

  const p2 = s.players[1];
  p2.x = PIVOT_X + 60;
  p2.y = SURFACE_Y - p2.h - 20;
  p2.vx = 0; p2.vy = 150; p2.grounded = false; // yavaş iniş

  let minVy = 0;
  for (let i = 0; i < 12; i++) {
    update(s, {}, 1 / 60, 'BOTH');
    minVy = Math.min(minVy, s.players[0].vy);
  }

  check('yumuşak iniş fırlatma yapmaz', minVy > -300, `minVy=${minVy.toFixed(0)}`);
}

// 10) launchEnabled = false fırlatmayı kapatır
{
  const s = createState(makeLevel());
  const plat = s.platforms[0];
  plat.launchEnabled = false;
  place(s, 0, PIVOT_X - 80, SURFACE_Y);

  const p2 = s.players[1];
  p2.x = PIVOT_X + 60;
  p2.y = SURFACE_Y - p2.h - 20;
  p2.vx = 0; p2.vy = 900; p2.grounded = false;

  let minVy = 0;
  for (let i = 0; i < 12; i++) {
    update(s, {}, 1 / 60, 'BOTH');
    minVy = Math.min(minVy, s.players[0].vy);
  }

  check('launchEnabled=false fırlatmayı engeller', minVy > -300, `minVy=${minVy.toFixed(0)}`);
}

console.log(failures === 0 ? '\nTÜM TESTLER GEÇTİ' : `\n${failures} TEST BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
