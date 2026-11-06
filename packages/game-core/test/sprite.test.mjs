// Sprite (görsel) desteği testi — tarayıcısız, sahte canvas/Image ile.
globalThis.Image = class {
  constructor() {
    this.complete = true;
    this.naturalWidth = 32;
    this.naturalHeight = 32;
    this._src = '';
  }
  set src(v) { this._src = v; }
  get src() { return this._src; }
};

const calls = [];
function makeCtx() {
  const noop = () => {};
  return new Proxy({
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    drawImage: (img, ...args) => calls.push({ src: img.src, args }),
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    ellipse: noop, roundRect: noop, fill: noop, stroke: noop, fillRect: noop,
    strokeRect: noop, fillText: noop, setLineDash: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 10 }),
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return noop;
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

const { drawPlatforms } = await import('../src/renderer.js');

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!ok) failures++;
};

const SPRITE = 'data:image/png;base64,AAAA';

// 1) Normal platform sprite'ı çizilir
{
  calls.length = 0;
  drawPlatforms(makeCtx(), { time: 1, platforms: [{ x: 10, y: 10, w: 100, h: 20, color: 'platformNeutral', sprite: SPRITE }] });
  check('normal platform sprite çizilir', calls.length === 1 && calls[0].src === SPRITE, `calls=${calls.length}`);
}

// 2) Çark sprite'ı çizilir (döndürülerek)
{
  calls.length = 0;
  drawPlatforms(makeCtx(), { time: 1, platforms: [{ x: 10, y: 10, w: 80, h: 80, isWheel: true, sprite: SPRITE, wheelAngle: 1.2 }] });
  check('çark sprite çizilir', calls.length === 1 && calls[0].src === SPRITE, `calls=${calls.length}`);
}

// 3) Düşman sprite'ı çizilir
{
  calls.length = 0;
  drawPlatforms(makeCtx(), { time: 1, platforms: [{ x: 10, y: 10, w: 40, h: 40, isEnemy: true, sprite: SPRITE, patrolDir: -1 }] });
  check('düşman sprite çizilir', calls.length === 1 && calls[0].src === SPRITE, `calls=${calls.length}`);
}

// 4) Sprite yoksa prosedürel çizim yapılır (drawImage çağrılmaz)
{
  calls.length = 0;
  drawPlatforms(makeCtx(), { time: 1, platforms: [{ x: 10, y: 10, w: 100, h: 20, color: 'platformNeutral' }] });
  check('sprite yoksa prosedürel çizim', calls.length === 0, `calls=${calls.length}`);
}

// 5) spriteTouched dokunulunca kullanılır
{
  calls.length = 0;
  drawPlatforms(makeCtx(), { time: 1, platforms: [{ x: 10, y: 10, w: 100, h: 20, color: 'platformNeutral', sprite: SPRITE, spriteTouched: 'data:image/png;base64,BBBB', isTouched: true }] });
  check('dokunulunca spriteTouched kullanılır', calls.length === 1 && calls[0].src.endsWith('BBBB'), `src=${calls[0]?.src?.slice(-6)}`);
}

// 6) Hedef (goal) sprite'ı çizilir
{
  calls.length = 0;
  const { drawGoal } = await import('../src/renderer.js');
  drawGoal(makeCtx(), { time: 1, levelComplete: false, goal: { x: 10, y: 10, w: 100, h: 20, isGoal: true, sprite: SPRITE } });
  check('goal sprite çizilir', calls.length === 1 && calls[0].src === SPRITE, `calls=${calls.length}`);
}

console.log(failures === 0 ? '\nTÜM SPRITE TESTLERİ GEÇTİ' : `\n${failures} TEST BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
