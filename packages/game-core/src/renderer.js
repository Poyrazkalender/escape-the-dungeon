import { COLORS, WIDTH, HEIGHT } from './constants.js';

const blueImg = new Image(); blueImg.src = '/assets/player-blue.png';
const pinkImg = new Image(); pinkImg.src = '/assets/player-pink.png';
const bgImg = new Image();

const imageCache = {};

export function clearImageCache() {
  Object.keys(imageCache).forEach(k => delete imageCache[k]);
}

let brickWallCanvas = null;
function getBrickWallCanvas() {
  if (brickWallCanvas) return brickWallCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.bgDark; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const bw = 80, bh = 30;
  ctx.fillStyle = COLORS.brickLight; ctx.strokeStyle = COLORS.bgDark; ctx.lineWidth = 4;
  for (let y = 0; y < HEIGHT; y += bh) {
    const offset = (Math.floor(y / bh) % 2) * (bw / 2);
    for (let x = -bw; x < WIDTH + bw; x += bw) {
      ctx.fillRect(x + offset, y, bw, bh); ctx.strokeRect(x + offset, y, bw, bh);
      ctx.fillStyle = COLORS.brickDark; ctx.fillRect(x + offset + 4, y + 4, bw - 8, bh - 8);
      ctx.fillStyle = COLORS.brickLight;
    }
  }
  ctx.lineWidth = 16; ctx.strokeStyle = '#8c5b37'; ctx.strokeRect(0, 0, WIDTH, HEIGHT);
  ctx.lineWidth = 4; ctx.strokeStyle = '#c8955b'; ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16);

  brickWallCanvas = canvas;
  return brickWallCanvas;
}

let vignetteCanvas = null;
function getVignetteCanvas() {
  if (vignetteCanvas) return vignetteCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const vg = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, HEIGHT*0.4, WIDTH/2, HEIGHT/2, HEIGHT*0.9);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  vignetteCanvas = canvas;
  return vignetteCanvas;
}

export function drawBackground(ctx, state) {
  if (state.backgroundImage) {
    if (bgImg.src !== state.backgroundImage) bgImg.src = state.backgroundImage;
    if (bgImg.complete) {
      ctx.drawImage(bgImg, 0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  } else {
    ctx.drawImage(getBrickWallCanvas(), 0, 0);
  }
}

export function drawPlatforms(ctx, state) { 
  for (const plat of state.platforms) {
    if (plat.isGoal) continue;
    
    let color = plat.customColor || COLORS[plat.color] || plat.color;
    const isFlashing = plat.flashUntil && state.time < plat.flashUntil;

    if (plat.isButtonBlue || plat.isButtonPink) {
      color = plat.isButtonBlue ? '#00a7f8' : '#e84393';
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 20;
      ctx.fillStyle = color; 
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 10);
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (plat.isTimer) {
      ctx.save();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      ctx.restore();
    }

    let activeSprite = (plat.isTouched && plat.spriteTouched) ? plat.spriteTouched : plat.sprite;

    if (activeSprite && !isFlashing) {
      if (!imageCache[activeSprite]) {
        const img = new Image(); img.src = activeSprite; imageCache[activeSprite] = img;
      }
      const img = imageCache[activeSprite];
      if (img.complete) {
        ctx.drawImage(img, plat.x, plat.y, plat.w, plat.h);
        continue; 
      }
    }

    ctx.save();
    ctx.shadowColor = isFlashing ? '#ffffff' : color;
    ctx.shadowBlur = isFlashing ? 30 : 10;
    ctx.fillStyle = isFlashing ? '#ffffff' : color;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.restore();
    
    if (!isFlashing) { 
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; 
      ctx.fillRect(plat.x, plat.y, plat.w, 3); 
    }
  }
}

export function drawGoal(ctx, state) { 
  const goal = state.goal || state.platforms.find(p => p.isGoal);
  if (!goal) return;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
  const cx = goal.x + goal.w / 2; const cy = goal.y + goal.h / 2;
  const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 + pulse * 30);
  rad.addColorStop(0, `rgba(255, 71, 87, ${0.4 + pulse * 0.2})`);
  rad.addColorStop(1, 'rgba(255, 71, 87, 0)');
  ctx.fillStyle = rad; ctx.fillRect(cx - 200, cy - 200, 400, 400);
  ctx.fillStyle = state.levelComplete ? '#4caf50' : COLORS.goalGlow;
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.fillStyle = '#333';
  ctx.fillRect(goal.x + 20, goal.y + goal.h, 4, 8);
  ctx.fillRect(goal.x + goal.w - 24, goal.y + goal.h, 4, 8);
}

export function drawPlayers(ctx, state) {
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    
    if (i === 1 && !p.isConnected) continue; 

    const img = p.color === 'platformBlue' ? blueImg : pinkImg;
    const sinceLand = state.time - p.landedAt;
    const squash = sinceLand >= 0 && sinceLand < 0.15 ? Math.sin((sinceLand / 0.15) * Math.PI) * 0.2 : 0;
    let sx = 1 + squash;
    let sy = 1 - squash;
    const isJumping = !p.grounded && p.vy < -50;
    if (isJumping) { sy = 1.18; sx = 0.88; }
    const isIdle = p.grounded && Math.abs(p.vx) < 10 && !isJumping && squash === 0;
    if (isIdle) {
      const breath = Math.sin(state.time * 4) * 0.035;
      sy = 1 + breath; sx = 1 - breath * 0.5;
    }
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.save(); ctx.translate(cx, cy);
    if (p.facing === -1) ctx.scale(-1, 1);
    ctx.scale(sx, sy);
    if (img.complete && img.naturalHeight !== 0) {
      ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.fillStyle = COLORS[p.color]; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  }
}

export function drawEditorOverlays(ctx, state, drawStart, drawCurrent, showGrid = true) { 
  // ✅ YENİ: Grid sadece showGrid true ise çizilsin
  if (showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
    for (let y = 0; y < HEIGHT; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  }

  if (state.blueSpawn) {
    if (blueImg.complete && blueImg.naturalHeight !== 0) ctx.drawImage(blueImg, state.blueSpawn.x, state.blueSpawn.y, 40, 40);
    else { ctx.fillStyle = COLORS.platformBlue; ctx.fillRect(state.blueSpawn.x, state.blueSpawn.y, 40, 40); }
    ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText('P1', state.blueSpawn.x + 4, state.blueSpawn.y - 4);
  }
  if (state.pinkSpawn) {
    if (pinkImg.complete && pinkImg.naturalHeight !== 0) ctx.drawImage(pinkImg, state.pinkSpawn.x, state.pinkSpawn.y, 40, 40);
    else { ctx.fillStyle = COLORS.platformPink; ctx.fillRect(state.pinkSpawn.x, state.pinkSpawn.y, 40, 40); }
    ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText('P2', state.pinkSpawn.x + 4, state.pinkSpawn.y - 4);
  }
  if (drawStart && drawCurrent) {
    const x = Math.min(drawStart.x, drawCurrent.x); const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.max(20, Math.abs(drawCurrent.x - drawStart.x)); const h = Math.max(20, Math.abs(drawCurrent.y - drawStart.y));
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(x, y, w, h);
  }
}

// ✅ OYUN İÇİN CONVENIENCE
export function renderWorld(ctx, state) {
  drawBackground(ctx, state);
  drawPlatforms(ctx, state);
  drawGoal(ctx, state);
  drawPlayers(ctx, state);
  ctx.drawImage(getVignetteCanvas(), 0, 0);
}

// ✅ YENİ: showGrid parametresi eklendi
export function renderEditor(ctx, state, drawStart, drawCurrent, showGrid = true) {
  drawBackground(ctx, state);
  drawPlatforms(ctx, state);
  drawGoal(ctx, state);
  drawEditorOverlays(ctx, state, drawStart, drawCurrent, showGrid);
  ctx.drawImage(getVignetteCanvas(), 0, 0);
}