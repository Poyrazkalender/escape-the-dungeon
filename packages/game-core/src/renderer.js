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
    if (plat.isCollectible && plat.collected) continue; // Toplananları çizme	
	// ✅ YENİ: Kırılan platformu çizme
    if (plat.isBroken) continue; 
	
	    // ✅ YENİ: KOL ÇİZİMİ (Switch Mantığı)
    if (plat.isLever) {
      ctx.save();
      
      const leverColors = { green: '#22c55e', red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', purple: '#a855f7' };
      const color = leverColors[plat.leverColor] || '#22c55e';
      
      const cx = plat.x + plat.w / 2;
      const baseY = plat.y + plat.h;
      
      // Kolun açısı (Sağa yatıksa +45, sola yatıksa -45 derece)
      const isRight = plat.leverState === 1;
      const angle = isRight ? (Math.PI / 4) : -(Math.PI / 4);
      const armLength = plat.h * 0.85;
      
      // Topuz pozisyonu
      const topX = cx + Math.sin(angle) * armLength;
      const topY = baseY - Math.cos(angle) * armLength;
      
      // Taban
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(plat.x, baseY - 10, plat.w, 15, 4);
      ctx.fill();
      
      // Renkli taban şeridi
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(plat.x + 2, baseY - 8, plat.w - 4, 4, 2);
      ctx.fill();
      
      // Kol çubuğu (koyu)
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 5);
      ctx.lineTo(topX, topY);
      ctx.stroke();
      
      // Kol çubuğu (renkli)
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 5);
      ctx.lineTo(topX, topY);
      ctx.stroke();
      
      // Topuz
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(topX, topY, 9, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(topX - 2, topY - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Yön oku göstergesi (Küçük)
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(isRight ? '→' : '←', cx, baseY + 5);
      
      ctx.restore();
      continue;
    }

    // ✅ YENİ: KOL HEDEF PLATFORM ÇİZİMİ (normal platform + renkli kenar)
    if (plat.isLeverTarget) {
      ctx.save();
      const leverColors = {
        green: '#22c55e', red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', purple: '#a855f7'
      };
      const color = leverColors[plat.leverColor] || '#22c55e';
      
      // Normal platform gövdesi (koyu gri)
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 4);
      ctx.fill();
      
      // Renkli kenar parlaması
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 4);
      ctx.stroke();
      
      // Üstte renkli şerit
      ctx.fillStyle = color;
      ctx.fillRect(plat.x + 4, plat.y + 2, plat.w - 8, 3);
      
      ctx.restore();
      continue;
    }
	
	// ✅ YENİ: Kutu Çizimi
    if (plat.isBox) {
      ctx.save();
      // Kutu gövdesi (Ahşap renk)
      const boxGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
      boxGrad.addColorStop(0, '#d97706');
      boxGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = boxGrad;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      
      // Kutu kenarlıkları ve çapraz tahtaları
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      
      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y); ctx.lineTo(plat.x + plat.w, plat.y + plat.h);
      ctx.moveTo(plat.x + plat.w, plat.y); ctx.lineTo(plat.x, plat.y + plat.h);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // ✅ YENİ: Anahtar Çizimi
    if (plat.isKey && !plat.isCollected) {
      ctx.save();
      const bobY = Math.sin(state.time * 4) * 5;
      ctx.translate(plat.x + plat.w/2, plat.y + plat.h/2 + bobY);
      
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 15;
      ctx.strokeStyle = '#fbbf24';
      ctx.fillStyle = '#fbbf24';
      ctx.lineWidth = 4;
      
      // Anahtarın halkası
      ctx.beginPath(); ctx.arc(-8, 0, 8, 0, Math.PI * 2); ctx.stroke();
      // Anahtarın gövdesi
      ctx.fillRect(-2, -2, 20, 4);
      // Anahtarın dişleri
      ctx.fillRect(12, 2, 4, 8);
      ctx.fillRect(16, 2, 4, 6);
      
      ctx.restore();
      continue;
    }

    // ✅ YENİ: Kapı Çizimi
    if (plat.isDoor) {
      ctx.save();
      if (!plat.isOpen) {
        // Kapalı kapı (kilitli)
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 4;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        
        // Kilit İkonu
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(plat.x + plat.w/2, plat.y + plat.h/2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(plat.x + plat.w/2 - 2, plat.y + plat.h/2, 4, 6);
      } else {
        // Açık kapı (sadece çerçeve)
        ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      }
      ctx.restore();
      continue;
    }

    // ✅ YENİ: Toplanabilir Objeler (Yıldız/Anahtar)
    if (plat.isCollectible) {
      ctx.save();
      ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 15;
      ctx.fillStyle = '#f1c40f';
      // Basit bir eşkenar dörtgen (elmas) çizimi
      ctx.beginPath();
      ctx.moveTo(plat.x + plat.w / 2, plat.y);
      ctx.lineTo(plat.x + plat.w, plat.y + plat.h / 2);
      ctx.lineTo(plat.x + plat.w / 2, plat.y + plat.h);
      ctx.lineTo(plat.x, plat.y + plat.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }

        // ✅ YENİ: Lazer Çizimi (Hareketli, Kırmızı, Parlayan)
    if (plat.isLaser) {
      ctx.save();
      const isHorizontal = plat.w > plat.h;
      
      if (isHorizontal) {
        const cy = plat.y + plat.h / 2;
        // Dış parlama
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 25;
        // Ana ışın
        ctx.fillStyle = 'rgba(255, 30, 30, 0.85)';
        ctx.fillRect(plat.x, cy - 8, plat.w, 16);
        // İç parlak çekirdek
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 220, 220, 1)';
        ctx.fillRect(plat.x, cy - 2, plat.w, 4);
        // Uç emitörleri
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(plat.x - 10, cy - 14, 14, 28);
        ctx.fillRect(plat.x + plat.w - 4, cy - 14, 14, 28);
        // Emitör içi kırmızı ışık
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
        ctx.fillRect(plat.x - 6, cy - 4, 6, 8);
        ctx.fillRect(plat.x + plat.w, cy - 4, 6, 8);
      } else {
        const cx = plat.x + plat.w / 2;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 25;
        ctx.fillStyle = 'rgba(255, 30, 30, 0.85)';
        ctx.fillRect(cx - 8, plat.y, 16, plat.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 220, 220, 1)';
        ctx.fillRect(cx - 2, plat.y, 4, plat.h);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(cx - 14, plat.y - 10, 28, 14);
        ctx.fillRect(cx - 14, plat.y + plat.h - 4, 28, 14);
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
        ctx.fillRect(cx - 4, plat.y - 6, 8, 6);
        ctx.fillRect(cx - 4, plat.y + plat.h, 8, 6);
      }
      
      ctx.restore();
      continue;
    }
	
	// ✅ YENİ: Tehlikeler (Diken / Lava)
    if (plat.isHazard) {
      ctx.save();
      ctx.fillStyle = '#e74c3c';
      ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 10;
      // Basit diken çizimi
      ctx.beginPath();
      const spikes = Math.max(1, Math.floor(plat.w / 20));
      const spikeWidth = plat.w / spikes;
      for (let i = 0; i < spikes; i++) {
        ctx.moveTo(plat.x + i * spikeWidth, plat.y + plat.h);
        ctx.lineTo(plat.x + i * spikeWidth + spikeWidth / 2, plat.y);
        ctx.lineTo(plat.x + (i + 1) * spikeWidth, plat.y + plat.h);
      }
      ctx.fill();
      ctx.restore();
      continue;
    }

    let color = plat.customColor || COLORS[plat.color] || plat.color;
    const isFlashing = plat.flashUntil && state.time < plat.flashUntil;

    // Hareketli platformlara özel renk/parlama
    if (plat.isMoving) {
      ctx.save();
      ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 15;
    }

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

        // ✅ YENİ: Animasyonlu, Profesyonel 3D Trambolin Çizimi
    if (plat.isTrampoline) {
      ctx.save();
      
      // Animasyon hesabı: Zıplandıktan sonraki 0.3 saniye boyunca esne
      let squash = 0;
      if (plat.bounceAnim) {
        const elapsed = state.time - plat.bounceAnim;
        if (elapsed < 0.3) {
          // Sinüs dalgası ile yumuşak bir esneme (en fazla 15px aşağı iner)
          squash = Math.sin((elapsed / 0.3) * Math.PI) * 15; 
        }
      }

      const springHeight = 45 - squash; // Yay boyu kısalır
      const capY = plat.y + squash;     // Tabla aşağı iner
      
      const capH = Math.min(plat.h, 20); // Tabla yüksekliği
      const centerX = plat.x + plat.w / 2;
      
      // 1. DİKEY METAL BORU
      const poleWidth = 8;
      const poleGradient = ctx.createLinearGradient(centerX - poleWidth/2, 0, centerX + poleWidth/2, 0);
      poleGradient.addColorStop(0, '#94a3b8');
      poleGradient.addColorStop(0.5, '#f1f5f9');
      poleGradient.addColorStop(1, '#64748b');
      
      ctx.fillStyle = poleGradient;
      ctx.fillRect(centerX - poleWidth/2, capY + capH - 5, poleWidth, springHeight + 10); // Boru biraz daha uzun

      // 2. MAVİ YAY
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      const coils = 4;
      const coilH = Math.max(5, springHeight / coils); // Yay çok kısalırsa hata vermesini engelle
      const startY = capY + capH - 2;
      
      ctx.moveTo(centerX, startY);
      
      for (let i = 0; i < coils; i++) {
        const y1 = startY + i * coilH + coilH / 2;
        const y2 = startY + (i + 1) * coilH;
        const ctrlX = (i % 2 === 0) ? plat.x + plat.w - 8 : plat.x + 8;
        ctx.bezierCurveTo(ctrlX, y1, ctrlX, y1, centerX, y2);
      }
      ctx.stroke();
      
      // Yay üzerine hafif parlama
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 3. KIRMIZI TABLA (Konumu capY'ye göre ayarlanıyor)
      ctx.fillStyle = '#991b1b'; 
      ctx.beginPath();
      ctx.roundRect(plat.x, capY, plat.w, capH, [6, 6, 2, 2]);
      ctx.fill();

      const capGradient = ctx.createLinearGradient(0, capY, 0, capY + capH);
      capGradient.addColorStop(0, '#f87171');
      capGradient.addColorStop(1, '#dc2626');
      
      ctx.fillStyle = capGradient;
      ctx.beginPath();
      ctx.roundRect(plat.x + 2, capY + 2, plat.w - 4, capH - 2, [4, 4, 1, 1]);
      ctx.fill();

      // Tabla üstü parlama
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.roundRect(plat.x + 4, capY + 3, plat.w - 8, 3, 2);
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
        if (plat.isMoving) ctx.restore();
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

    // Hareketli platformun üzerine yön oku çiz
    if (plat.isMoving) {
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(plat.moveAxis === 'x' ? '↔' : '↕', plat.x + plat.w/2, plat.y + plat.h/2 + 5);
      ctx.restore();
    }
	if (plat.isBreakable) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      // Basit çatlak çizgileri
      ctx.beginPath();
      ctx.moveTo(plat.x + plat.w * 0.3, plat.y);
      ctx.lineTo(plat.x + plat.w * 0.4, plat.y + plat.h * 0.5);
      ctx.lineTo(plat.x + plat.w * 0.2, plat.y + plat.h);
      
      ctx.moveTo(plat.x + plat.w * 0.7, plat.y);
      ctx.lineTo(plat.x + plat.w * 0.6, plat.y + plat.h * 0.6);
      ctx.lineTo(plat.x + plat.w * 0.8, plat.y + plat.h);
      ctx.stroke();
      ctx.restore();
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
	
	// ✅ YENİ: Hızlı İniş Hız Çizgileri (Speed Lines)
    if (p.isFastFalling && p.vy > 500) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      for (let j = 0; j < 4; j++) {
        const lineX = p.x + (Math.random() * p.w);
        const lineY = p.y - Math.random() * 40; // Karakterin üstünde başlasın
        const lineLength = 20 + Math.random() * 30;
        
        ctx.beginPath();
        ctx.moveTo(lineX, lineY);
        ctx.lineTo(lineX, lineY - lineLength);
        ctx.stroke();
      }
      ctx.restore();
    }

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

// ✅ YENİ: Parçacıkları çizen fonksiyon
export function drawParticles(ctx, state) {
  if (!state.particles || state.particles.length === 0) return;
  
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife); // Yaşam süresi azaldıkça saydamlaş
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); // Yuvarlak parçacık çiz
    ctx.fill();
  }
  ctx.globalAlpha = 1; // Saydamlığı eski haline getir
}

export function drawEditorOverlays(ctx, state, drawStart, drawCurrent, showGrid = true, gridSize = 20) { 
  // ✅ YENİ: Grid sadece showGrid true ise çizilsin
  if (showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    // ✅ YENİ: 20 yerine gridSize kullan
    for (let x = 0; x < WIDTH; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
    for (let y = 0; y < HEIGHT; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
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
  ctx.save(); // ✅ Çizimden önce state'i kaydet
  
  // ✅ YENİ: Ekran sarsıntısı varsa Canvas'ı rastgele kaydır
  if (state.shakeTime > 0 && state.shakeIntensity > 0) {
    const dx = (Math.random() - 0.5) * state.shakeIntensity;
    const dy = (Math.random() - 0.5) * state.shakeIntensity;
    ctx.translate(dx, dy);
  }
  drawBackground(ctx, state);
  drawPlatforms(ctx, state);
  drawGoal(ctx, state);
  drawPlayers(ctx, state);
  drawParticles(ctx, state); // ✅ YENİ: Oyuncuların üzerine parçacıkları çiz
  
  // ✅ YENİ: Anahtar Sayacı (UI)
  if (state.keysCollected > 0) {
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 24px monospace';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillText(`🔑 ${state.keysCollected}`, 30, 50);
    ctx.restore();
  }
  
  ctx.drawImage(getVignetteCanvas(), 0, 0);
  ctx.restore(); // ✅ Kaydırma işlemini sıfırla
}

// ✅ YENİ: showGrid parametresi eklendi
export function renderEditor(ctx, state, drawStart, drawCurrent, showGrid = true, gridSize = 20) {
  drawBackground(ctx, state);
  drawPlatforms(ctx, state);
  drawGoal(ctx, state);
  drawEditorOverlays(ctx, state, drawStart, drawCurrent, showGrid, gridSize);
  ctx.drawImage(getVignetteCanvas(), 0, 0);
}