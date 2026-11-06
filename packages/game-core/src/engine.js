import { GRAVITY, WIDTH, HEIGHT } from './constants.js';
import { playSound } from './sound.js';
import { DEFAULT_SEESAW, isOverSeesaw, seesawSurfaceY, stepSeesaw, computeSeesawLaunch } from './surface.js';

export function createState(levelData, characters = { p1: 'platformBlue', p2: 'platformPink' }, forceP2Active = false) {
  return {
    time: 0, 
    levelComplete: false, 
    completedAt: 0, 
    restartRequested: false, 
    restartTime: 0,
    particles: [], 
    shakeTime: 0,      
    shakeIntensity: 0, 
    keysCollected: 0, // ✅ YENİ: Toplanan anahtar sayısı
    platforms: levelData.platforms.map(p => ({ 
      ...p, 
      isTouched: false,
      defaultColor: p.color || 'platformNeutral',
      isActive: false,
      initialX: p.x, 
      initialY: p.y,
      isBroken: false,
      isOpen: false,
      isCollected: false,
      // ✅ YENİ: Denge platformu (seesaw) — pivot her zaman tahtanın ortası
      isSeesaw: !!p.isSeesaw,
      angle: p.angle || DEFAULT_SEESAW.angle,
      angularVelocity: 0,
      maxAngle: p.maxAngle !== undefined ? p.maxAngle : DEFAULT_SEESAW.maxAngle,
      mass: p.mass !== undefined ? p.mass : DEFAULT_SEESAW.mass,
      damping: p.damping !== undefined ? p.damping : DEFAULT_SEESAW.damping,
      stiffness: p.stiffness || DEFAULT_SEESAW.stiffness,
      // ✅ YENİ: Çarklı engel (dönen testere)
      wheelAngle: p.wheelAngle || 0,
      wheelSpinDir: 1,
      spinSpeed: p.spinSpeed !== undefined ? p.spinSpeed : 2.5,
      sparkEnabled: p.sparkEnabled !== false,
      sparkRate: p.sparkRate !== undefined ? p.sparkRate : 1,
      // ✅ YENİ: Devriye (çark ve düşman için ortak)
      patrolOriginX: p.x,
      patrolOriginY: p.y,
      patrolDir: p.patrolDir === -1 ? -1 : 1,
      // ✅ YENİ: Kutu için fizik değişkenleri
      vx: 0, vy: 0, grounded: false, boxGrounded: false ,
      // ✅ YENİ: Kutunun denge platformundaki ağırlığı (oyuncu = 1)
      boxMass: p.boxMass !== undefined ? p.boxMass : 1.5,
	  leverTilt: 0, // ✅ YENİ: Kol eğim açısı (-1 ile +1 arası)
	  leverState: p.leverState !== undefined ? p.leverState : 0, // ✅ YENİ
    })),
    blueSpawn: { ...levelData.blueSpawn },
    pinkSpawn: { ...levelData.pinkSpawn },
    backgroundImage: levelData.backgroundImage || null,
    goal: levelData.platforms.find(p => p.isGoal) || null,
    players: [
      { 
        color: characters.p1, 
        x: characters.p1 === 'platformBlue' ? levelData.blueSpawn.x : levelData.pinkSpawn.x, 
        y: characters.p1 === 'platformBlue' ? levelData.blueSpawn.y : levelData.pinkSpawn.y, 
        w: 40, h: 40, vx: 0, vy: 0, speed: 260, jumpSpeed: 720, grounded: false, facing: 1, 
        controls: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS' }, landedAt: -1, isConnected: true,
        coyoteTimer: 0, jumpBufferTimer: 0, jumpKeyDown: false, isFastFalling: false
      },
      { 
        color: characters.p2, 
        x: characters.p2 === 'platformBlue' ? levelData.blueSpawn.x : levelData.pinkSpawn.x, 
        y: characters.p2 === 'platformBlue' ? levelData.blueSpawn.y : levelData.pinkSpawn.y, 
        w: 40, h: 40, vx: 0, vy: 0, speed: 260, jumpSpeed: 720, grounded: false, facing: 1, 
        controls: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown' }, landedAt: -1, isConnected: forceP2Active,
        coyoteTimer: 0, jumpBufferTimer: 0, jumpKeyDown: false, isFastFalling: false
      }
    ],
    platformChanged: null,
    buttonStateChanged: null,
  };
}

export function updateRemotePlayer(state, remoteData) {
  const remotePlayer = state.players[1]; 
  if (remotePlayer) {
    remotePlayer.isConnected = true;
    remotePlayer.x += (remoteData.x - remotePlayer.x) * 0.5;
    remotePlayer.y += (remoteData.y - remotePlayer.y) * 0.5;
    remotePlayer.vx = remoteData.vx;
    remotePlayer.vy = remoteData.vy;
    remotePlayer.facing = remoteData.facing;
    remotePlayer.grounded = remoteData.grounded;
    remotePlayer.color = remoteData.color;
  }
}

function checkCollision(p, plat) {
  return (
    p.x < plat.x + plat.w && p.x + p.w > plat.x &&
    p.y < plat.y + plat.h && p.y + p.h > plat.y
  );
}

// ✅ YENİ: Dairesel çarpışma (çarklı engel için)
function circleHitsRect(cx, cy, radius, p) {
  const nearestX = Math.max(p.x, Math.min(cx, p.x + p.w));
  const nearestY = Math.max(p.y, Math.min(cy, p.y + p.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

// ✅ YENİ: Ayarlanabilir mesafede ileri-geri devriye (çark ve düşman için ortak)
function stepPatrol(plat, dt) {
  const axis = plat.patrolAxis === 'y' ? 'y' : 'x';
  const range = Math.abs(plat.patrolRange || 0);
  if (range <= 0) return;

  const speed = Math.abs(plat.patrolSpeed || 80);
  const origin = axis === 'y'
    ? (plat.patrolOriginY ?? plat.initialY ?? plat.y)
    : (plat.patrolOriginX ?? plat.initialX ?? plat.x);
  const min = Math.min(origin, origin + range);
  const max = Math.max(origin, origin + range);

  let pos = axis === 'y' ? plat.y : plat.x;
  let dir = plat.patrolDir === -1 ? -1 : 1;

  pos += dir * speed * dt;
  if (pos >= max) { pos = max; dir = -1; }
  else if (pos <= min) { pos = min; dir = 1; }

  plat.patrolDir = dir;
  if (axis === 'y') plat.y = pos; else plat.x = pos;
}

function isSolid(playerColor, plat) {
  if (plat.isDoor && plat.isOpen) return false;
  
  // ✅ YENİ: Lazer içinden geçilebilir (sadece öldürür)
  if (plat.isLaser) return false;

  // ✅ YENİ: Çark ve düşman katı değildir; sadece temas hâlinde öldürür
  if (plat.isWheel || plat.isEnemy) return false;
  
  // ✅ YENİ: Kol ve hedefi her zaman katıdır (içinden geçilmez)
  if (plat.isLever || plat.isLeverTarget) return true;

  // ✅ YENİ: Denge platformu AABB katı değildir; eğik yüzey olarak ayrı ele alınır
  if (plat.isSeesaw) return false;
  if (plat.isRemote) {
    if (!plat.isActive) return false;
    if (plat.color === 'platformNeutral') return true; 
    return plat.color === playerColor; 
  }
  if (plat.color === 'platformNeutral') return true; 
  if (plat.color === playerColor) return true; 
  return false; 
}

function handleColorChange(plat, p, state) {
  if (plat.changeable && plat.color !== p.color) {
    plat.color = p.color;
    plat.customColor = null;
    plat.flashUntil = state.time + 0.25;
    state.platformChanged = { index: state.platforms.indexOf(plat), color: p.color };
  }
}

export function update(state, keys = {}, dt, controlledPlayer = 'P1', isTesting = false) {
  state.time += dt;
  if (state.levelComplete || state.restartRequested) return;
  
  if (state.shakeTime > 0) state.shakeTime -= dt;
  else state.shakeIntensity = 0;
  
  // Parçacıklar
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { state.particles.splice(i, 1); continue; }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += GRAVITY * 0.5 * dt; 
    pt.vx *= 0.95; 
  }

  for (const plat of state.platforms) plat.isTouched = false;
  
    // ✅ YENİ: KOL MEKANİZMASI (Tek Hareket - Switch Mantığı)
  const levers = state.platforms.filter(p => p.isLever && !p.isBroken);
  
  for (const lever of levers) {
    if (lever.leverState === undefined) lever.leverState = 0;
    const target = state.platforms.find(p => p.isLeverTarget && p.leverColor === lever.leverColor);
    
    if (target) {
      const targetX = target.initialX + (lever.leverState === 1 ? (target.moveRange || 100) : 0);
      
      const prevX = target.x;
      // Platformu pürüzsüzce hedefe doğru kaydır (Lerp)
      target.x += (targetX - target.x) * Math.min(1, 10 * dt);
      
      // ✅ YENİ: Platform üzerindeki oyuncuyu taşı
      const deltaX = target.x - prevX;
      if (deltaX !== 0) {
        for (const p of state.players) {
          const onTop = Math.abs((p.y + p.h) - target.y) < 10 && p.x + p.w > prevX && p.x < prevX + target.w;
          if (onTop) p.x += deltaX;
        }
      }

      // Sınırları aşmasını engelle (Güvenlik)
      const minX = target.initialX;
      const maxX = target.initialX + (target.moveRange || 100);
      if (target.x < minX) target.x = minX;
      if (target.x > maxX) target.x = maxX;
    }
  }

  // ✅ YENİ: KUTU FİZİĞİ VE İTME MANTIĞI
  for (const plat of state.platforms) {
    if (!plat.isBox || plat.isBroken) continue;

    const prevBoxY = plat.y;
    const wasBoxGrounded = plat.boxGrounded;

    // Kutuya yerçekimi uygula
    plat.vy += GRAVITY * dt;
    plat.y += plat.vy * dt;
    plat.boxGrounded = false;

    // Kutu ile zemin çarpışması
    for (const ground of state.platforms) {
      if (ground === plat || ground.isBox || ground.isKey || ground.isGoal || ground.isHazard || ground.isWheel || ground.isEnemy) continue;

      // ✅ YENİ: Kutu da denge platformuna biner ve sert inişte şok üretir.
      if (ground.isSeesaw) {
        if (ground.isBroken) continue;
        const boxCx = plat.x + plat.w / 2;
        if (!isOverSeesaw(ground, boxCx)) continue;

        const ySurf = seesawSurfaceY(ground, boxCx);
        const prevBottom = prevBoxY + plat.h;
        const bottom = plat.y + plat.h;

        // ✅ DÜZELTİLDİ: Süpürme (swept) testi — hızlı düşen kutu ince tahtayı
        // tek karede geçip "tünellemesin". Tolerans, karenin düşüş mesafesiyle büyür.
        const sweep = Math.max(10, Math.abs(plat.vy) * dt + 2);
        if (plat.vy >= 0 && prevBottom <= ySurf + sweep && bottom >= ySurf - 2) {
          const impactSpeed = plat.vy;
          plat.y = ySurf - plat.h;
          plat.vy = 0;
          plat.boxGrounded = true;

          const threshold = ground.impactThreshold ?? DEFAULT_SEESAW.impactThreshold;
          if (!wasBoxGrounded && impactSpeed >= threshold) {
            ground.seesawImpact = {
              offset: boxCx - (ground.x + ground.w / 2),
              speed: impactSpeed,
              weight: plat.boxMass ?? 1.5,
            };
          }

          // ✅ Kutu tahtada kaymaz (oyuncu gibi sürtünmeli durur), aksi halde
          // eğimde kendi kendine kayıp mekaniği güvenilmez hale getiriyordu.
        }
        continue;
      }

      if (isSolid('platformNeutral', ground) && checkCollision(plat, ground)) {
        if (plat.vy > 0) {
          plat.y = ground.y - plat.h;
          plat.vy = 0;
          plat.boxGrounded = true;
        } else if (plat.vy < 0) {
          plat.y = ground.y + ground.h;
          plat.vy = 0;
        }
      }
    }

    // Kutuya oyuncuların çarpması ve itmesi
    for (const p of state.players) {
      if (checkCollision(p, plat)) {
        // Oyuncu kutunun üstündeyse üstüne bas
        if (p.vy > 0 && p.y + p.h - plat.y < 20) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.landedAt = state.time;
        } else {
			          // Yandan itme
          if (p.vx > 0 && p.x + p.w - plat.x < 20) {
            plat.x = p.x + p.w;
            plat.vx = p.vx * 0.8; // Kutu oyuncunun hızıyla itilir
            
            // ✅ YENİ: Oyuncunun hızını azalt (Kutuyu iterken yavaşlasın)
            p.vx *= 0.6; 
            
            // ✅ YENİ: Kutu itilirken toz efekti
            if (Math.random() < 0.3) {
              state.particles.push({
                x: plat.x, // Kutunun ön yüzü
                y: plat.y + plat.h - 5,
                vx: (Math.random() - 0.5) * 50,
                vy: -Math.random() * 30,
                life: 0.3, maxLife: 0.3, size: 3, color: '#d97706' // Ahşap rengi toz
              });
            }
            
            if (!isTesting) playSound('push');
          } else if (p.vx < 0 && plat.x + plat.w - p.x < 20) {
            plat.x = p.x - plat.w;
            plat.vx = p.vx * 0.8;
            
            // ✅ YENİ: Oyuncunun hızını azalt
            p.vx *= 0.6;
            
            // ✅ YENİ: Kutu itilirken toz efekti
            if (Math.random() < 0.3) {
              state.particles.push({
                x: plat.x + plat.w, // Kutunun ön yüzü
                y: plat.y + plat.h - 5,
                vx: (Math.random() - 0.5) * 50,
                vy: -Math.random() * 30,
                life: 0.3, maxLife: 0.3, size: 3, color: '#d97706'
              });
            }
            
            if (!isTesting) playSound('push');
          }
        }
      }
    }

    // Kutunun yatay hareketi ve duvar çarpışması
    plat.x += plat.vx * dt;
    plat.vx *= 0.9; // Sürtünme
	
	    // ✅ YENİ: Kutu kayarken toz
    if (Math.abs(plat.vx) > 20 && Math.random() < 0.2) {
      state.particles.push({
        x: plat.x + plat.w / 2,
        y: plat.y + plat.h - 3,
        vx: (Math.random() - 0.5) * 30,
        vy: -Math.random() * 20,
        life: 0.2, maxLife: 0.2, size: 2, color: 'rgba(217, 119, 6, 0.5)' // Ahşap tozu
      });
    }

    for (const ground of state.platforms) {
      if (ground === plat || ground.isBox || ground.isKey || ground.isGoal || ground.isHazard || ground.isWheel || ground.isEnemy) continue;
      if (isSolid('platformNeutral', ground) && checkCollision(plat, ground)) {
        if (plat.vx > 0) plat.x = ground.x - plat.w;
        else if (plat.vx < 0) plat.x = ground.x + ground.w;
        plat.vx = 0;
      }
    }
  }

  // HAREKETLİ PLATFORMLAR
  for (const plat of state.platforms) {
    if (plat.isMoving) {
      const offset = Math.sin(state.time * (plat.moveSpeed || 2)) * (plat.moveRange || 100);
      const prevX = plat.x; const prevY = plat.y;
      if (plat.moveAxis === 'x') plat.x = plat.initialX + offset;
      else plat.y = plat.initialY + offset;
      const deltaX = plat.x - prevX; const deltaY = plat.y - prevY;
      for (const p of state.players) {
        const wasOnTop = Math.abs((p.y + p.h) - prevY) < 8 && p.x + p.w > prevX && p.x < prevX + plat.w;
        if (wasOnTop && !plat.isLaser) { p.x += deltaX; p.y += deltaY; } // ✅ Lazerse taşıma
      }
    }
  }

  // ✅ YENİ: ÇARKLI ENGELLER (dönen testere) VE DEVRİYE DÜŞMANLARI
  for (const plat of state.platforms) {
    if (plat.isBroken) continue;
    if (!plat.isWheel && !plat.isEnemy) continue;

    const prevX = plat.x;
    const prevY = plat.y;

    // Ayarlanabilir devriye mesafesi (0 ise olduğu yerde durur)
    stepPatrol(plat, dt);

    if (plat.isWheel) {
      const spin = Math.abs(plat.spinSpeed !== undefined ? plat.spinSpeed : 2.5);
      const dx = plat.x - prevX;
      const dy = plat.y - prevY;

      // ✅ DÜZELTİLDİ: Dönüş yönü gittiği yöne göre belirlenir.
      // Sağa giderken saat yönü (+), sola giderken saat yönünün tersi (-).
      // Uçta bir an durduğunda son yön korunur; hiç hareket etmemişse saat yönü.
      let spinDir = plat.wheelSpinDir === -1 ? -1 : 1;
      if (Math.abs(dx) > 0.0001) spinDir = Math.sign(dx);
      else if (Math.abs(dy) > 0.0001) spinDir = -Math.sign(dy); // yukarı → saat yönü tersi

      plat.wheelSpinDir = spinDir;
      plat.wheelAngle = (plat.wheelAngle || 0) + spin * spinDir * dt;

      // ✅ YENİ: Dönerken kıvılcım efekti
      if (plat.sparkEnabled !== false) {
        const moving = Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001;
        const rate = (plat.sparkRate !== undefined ? plat.sparkRate : 1) * (moving ? 0.85 : 0.3);
        if (spin > 0.05 && Math.random() < rate) {
          const r = Math.min(plat.w, plat.h) / 2;
          const cx = plat.x + plat.w / 2;
          const cy = plat.y + plat.h / 2;
          const a = Math.random() * Math.PI * 2;
          const tangential = a + (Math.PI / 2) * spinDir;
          const speed = 70 + Math.random() * 130;

          state.particles.push({
            x: cx + Math.cos(a) * r * 0.94,
            y: cy + Math.sin(a) * r * 0.94,
            vx: Math.cos(tangential) * speed - (spinDir * 40),
            vy: Math.sin(tangential) * speed - 55,
            life: 0.22 + Math.random() * 0.28,
            maxLife: 0.5,
            size: 1.5 + Math.random() * 2.5,
            color: Math.random() < 0.5 ? '#ffd166' : '#ff8c42',
          });
        }
      }
    }
  }

  // ✅ YENİ: DENGE PLATFORMU (SEESAW) — tork tabanlı tek serbestlik derecesi
  for (const plat of state.platforms) {
    if (!plat.isSeesaw || plat.isBroken) continue;

    plat.launchCooldown = Math.max(0, (plat.launchCooldown || 0) - dt);

    const riders = [];
    for (const p of state.players) {
      const cx = p.x + p.w / 2;
      if (!isOverSeesaw(plat, cx)) continue;
      const ySurf = seesawSurfaceY(plat, cx);
      // Ayakları yüzeye yakın olan oyuncu ağırlık uygular.
      // Zıplayan (yukarı çıkan) oyuncu tahtayı itmez; tahtanın altındaki oyuncu sayılmaz.
      if (p.vy >= 0 && Math.abs((p.y + p.h) - ySurf) < 18) {
        // ✅ YENİ: Yüzeye hızlı inen oyuncu, sabitleme sırasında "yutulmadan"
        // önce şok kaydedilir. Böylece sert iniş bilgisi kaybolmaz.
        const threshold = plat.impactThreshold ?? DEFAULT_SEESAW.impactThreshold;
        if (p.vy >= threshold) {
          const pivotX = plat.x + plat.w / 2;
          plat.seesawImpact = { offset: cx - pivotX, speed: p.vy };
        }
        riders.push({ body: p, x: cx, weight: 1, isBox: false });
      }
    }

    // ✅ YENİ: Kutular da tahtaya ağırlık uygular (oyuncular gibi).
    for (const box of state.platforms) {
      if (!box.isBox || box.isBroken) continue;
      const cx = box.x + box.w / 2;
      if (!isOverSeesaw(plat, cx)) continue;
      const ySurf = seesawSurfaceY(plat, cx);
      if (box.vy >= 0 && Math.abs((box.y + box.h) - ySurf) < 18) {
        // ✅ DÜZELTİLDİ: Kutu, çarpışma testinden önce burada yakalanabilir;
        // sert iniş şoku burada da kaydedilir. Aksi halde kutu "yumuşak" sayılıp
        // hızı sıfırlanıyor ve fırlatma hiç tetiklenmiyordu.
        const threshold = plat.impactThreshold ?? DEFAULT_SEESAW.impactThreshold;
        if (!box.boxGrounded && box.vy >= threshold) {
          plat.seesawImpact = {
            offset: cx - (plat.x + plat.w / 2),
            speed: box.vy,
            weight: box.boxMass ?? 1.5,
          };
        }
        riders.push({ body: box, x: cx, weight: box.boxMass ?? 1.5, isBox: true });
      }
    }

    stepSeesaw(plat, riders, dt, GRAVITY);

    // ✅ YENİ: Sert iniş şoku → karşı uçtaki oyuncu havaya fırlar.
    const impact = plat.seesawImpact;
    plat.seesawImpact = null;
    const launch = computeSeesawLaunch(plat, riders, impact);
    if (launch) {
      const p = launch.rider.body;
      p.vy = launch.vy;
      p.vx += launch.vx;
      p.grounded = false;
      p.jumpBufferTimer = 0;
      plat.launchCooldown = 0.25;

      // Fırlatılan oyuncuyu bu karedeki yüzey sabitlemesinden çıkar.
      const idx = riders.indexOf(launch.rider);
      if (idx !== -1) riders.splice(idx, 1);

      if (!isTesting) playSound('bounce');
      state.shakeTime = Math.max(state.shakeTime, 0.12);
      state.shakeIntensity = Math.max(state.shakeIntensity, 5);
      for (let i = 0; i < 12; i++) {
        state.particles.push({
          x: p.x + p.w / 2 + (Math.random() - 0.5) * 30,
          y: p.y + p.h,
          vx: (Math.random() - 0.5) * 260,
          vy: -Math.random() * 180,
          life: 0.35 + Math.random() * 0.2,
          maxLife: 0.55,
          size: 2 + Math.random() * 4,
          color: 'rgba(255, 220, 150, 0.9)',
        });
      }
    }

    // Dönen yüzeyle birlikte binicileri taşı (mutlak konumlandırma).
    for (const r of riders) {
      const body = r.body;
      const ySurf = seesawSurfaceY(plat, body.x + body.w / 2);
      body.y = ySurf - body.h;
      body.vy = 0;
      if (r.isBox) {
        body.boxGrounded = true;
      } else {
        body.grounded = true;
        body.landedAt = state.time;
      }
      plat.isTouched = true;
    }
  }

  // ZAMANLAYICI VE UZAKTAN KUMANDA VS (Aynı kalacak)
  let timerStateChanged = false;
  for (const plat of state.platforms) {
    if (plat.isTimer) {
      const cycle = Math.floor(state.time / 3) % 2; 
      const newColor = cycle === 0 ? 'platformBlue' : 'platformPink';
      if (plat.color !== newColor) { plat.color = newColor; plat.customColor = null; timerStateChanged = true; }
    }
  }
  if (timerStateChanged) state.buttonStateChanged = { type: 'timer' }; 

  let blueBtnPressed = false; let pinkBtnPressed = false;
  for (const p of state.players) {
    for (const plat of state.platforms) {
      if (checkCollision(p, plat)) {
        plat.isTouched = true;
        if (plat.isButtonBlue) blueBtnPressed = true;
        if (plat.isButtonPink) pinkBtnPressed = true;
      }
    }
  }

  let remoteChanged = false;
  for (const plat of state.platforms) {
    if (plat.isRemote) {
      const isNowActive = blueBtnPressed || pinkBtnPressed;
      let targetColor = isNowActive ? (blueBtnPressed ? 'platformBlue' : 'platformPink') : plat.defaultColor;
      if (plat.isActive !== isNowActive || plat.color !== targetColor) {
        plat.isActive = isNowActive; plat.color = targetColor;
        plat.customColor = isNowActive ? null : plat.defaultColor; remoteChanged = true;
      }
    }
  }
  if (remoteChanged) state.buttonStateChanged = { type: 'remote' };

  // TEST MODUNDA DİĞER OYUNCU
  const activePlayers = controlledPlayer === 'BOTH' ? state.players : [state.players[controlledPlayer === 'P2' ? 1 : 0]];
  const otherPlayers = controlledPlayer === 'BOTH' ? [] : [state.players[controlledPlayer === 'P2' ? 0 : 1]];

  if (isTesting) {
    otherPlayers.forEach(otherP => {
      // ✅ DÜZELTİLDİ: Her karede sıfırlanır. Aksi halde bir kez yere basan
      // oyuncu, zemini kalksa/kırılsa bile havada asılı kalıyordu.
      otherP.grounded = false;
      otherP.vy += GRAVITY * dt;
      const prevY = otherP.y;
      otherP.y += otherP.vy * dt;

      for (const plat of state.platforms) {
        if (plat.isSeesaw) {
          if (plat.isBroken) continue;
          const cx = otherP.x + otherP.w / 2;
          if (isOverSeesaw(plat, cx)) {
            const ySurf = seesawSurfaceY(plat, cx);
            if (otherP.vy >= 0 && prevY + otherP.h <= ySurf + 10 && otherP.y + otherP.h >= ySurf) {
              otherP.y = ySurf - otherP.h;
              otherP.vy = 0;
              otherP.grounded = true;
              otherP.landedAt = state.time;
            }
          }
          continue;
        }
        if (plat.isButtonBlue || plat.isButtonPink || plat.isBroken) continue;
        if (!isSolid(otherP.color, plat) || !checkCollision(otherP, plat)) continue;

        if (plat.isWall) {
          if (otherP.vy > 0 && prevY + otherP.h <= plat.y + 10) {
            otherP.y = plat.y - otherP.h; otherP.vy = 0; otherP.grounded = true; otherP.landedAt = state.time;
          }
        } else if (otherP.vy >= 0 && prevY + otherP.h <= plat.y + 5) {
          otherP.y = plat.y - otherP.h; otherP.vy = 0; otherP.grounded = true; otherP.landedAt = state.time;
        }
      }
    });
  }

  // AKTİF OYUNCU
  activePlayers.forEach(p => {
    let moveX = 0;
    if (keys[p.controls.left]) moveX -= 1;
    if (keys[p.controls.right]) moveX += 1;

    const targetVX = moveX * p.speed;
    p.vx += (targetVX - p.vx) * Math.min(1, 15 * dt);
    if (p.vx > 10) p.facing = 1; else if (p.vx < -10) p.facing = -1;
    p.x += p.vx * dt;
	
	    // ✅ YENİ: Karakter Koşarken Ayak Tozu Efekti
    if (p.grounded && Math.abs(p.vx) > 100) {
      // Rastgele aralıklarla toz çıkar (her karede çıkmasın)
      if (Math.random() < 0.2) {
        state.particles.push({
          x: p.x + p.w / 2 + (Math.random() - 0.5) * p.w,
          y: p.y + p.h - 5, // Ayak hizası
          vx: -p.vx * 0.2 + (Math.random() - 0.5) * 30, // Karakterin tersi yöne hafif savrulma
          vy: -Math.random() * 40, // Hafif yukarı
          life: 0.2 + Math.random() * 0.2,
          maxLife: 0.4,
          size: 2 + Math.random() * 3,
          color: 'rgba(255, 255, 255, 0.4)' // Hafif şeffaf beyaz/gri
        });
      }
    }

    for (const plat of state.platforms) {
	  
	  // ✅ YENİ: ELMAS (TOPLANABİLİR) ÇARPIŞMASI (Geri eklendi)
      if (plat.isCollectible && !plat.collected && checkCollision(p, plat)) {
        plat.collected = true;
        playSound('collect');
        for (let i = 0; i < 8; i++) {
          state.particles.push({ 
            x: plat.x + plat.w/2, 
            y: plat.y + plat.h/2, 
            vx: (Math.random()-0.5)*200, 
            vy: -Math.random()*150, 
            life: 0.5, maxLife: 0.5, size: 3, color: '#f1c40f' 
          });
        }
      }
	  	
      // ✅ DÜZELTİLDİ: Kapı da tıpkı duvar gibi davransın (kapalıyken geçilmesin)
        if ((plat.isWall || plat.isDoor || plat.isLever) && !plat.isButtonBlue && !plat.isButtonPink && !plat.isRemote && !plat.isBox && !plat.isKey && isSolid(p.color, plat) && checkCollision(p, plat)) {
        
			// ✅ YENİ: Kapıya yandan çarpınca aç
			if (plat.isDoor && !plat.isOpen && state.keysCollected > 0) {
			  state.keysCollected -= 1;
			  plat.isOpen = true;
			  playSound('door');
			  continue; // Bu karede çarpışmayı atla, karakter içinden geçebilsin
			}
			
			// ✅ YENİ: Kola çarpınca yönünü değiştir
			if (plat.isLever) {
			  if (p.vx > 0 && plat.leverState !== 1) {
				plat.leverState = 1; // Sağa it
				playSound('lever'); // ✅ Ses eklendi
			  } else if (p.vx < 0 && plat.leverState !== 0) {
				plat.leverState = 0; // Sola it
				playSound('lever'); // ✅ Ses eklendi
			  }
			}

        // ✅ DÜZELTİLDİ: Kapı / kol / duvar üstüne basma ve kafayı vurma.
        // Önceden sadece yatay itme vardı; oyuncu bu nesnelerin içinden düşüyordu.
        const feetOverlap = p.y + p.h - plat.y;
        const headOverlap = plat.y + plat.h - p.y;
        if (p.vy >= 0 && feetOverlap >= 0 && feetOverlap <= 18) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.landedAt = state.time;
        } else if (p.vy < 0 && headOverlap >= 0 && headOverlap <= 12) {
          p.y = plat.y + plat.h;
          p.vy = 0;
        } else {
          if (p.vx > 0) p.x = plat.x - p.w;
          else if (p.vx < 0) p.x = plat.x + plat.w;
          p.vx = 0;
        }
        handleColorChange(plat, p, state);
      }
    }

    // ZIPLAMA
    const isJumpKeyDown = !!keys[p.controls.jump];
    if (p.grounded) { p.coyoteTimer = 0.1; } else { p.coyoteTimer = Math.max(0, (p.coyoteTimer || 0) - dt); }
    const jumpPressed = isJumpKeyDown && !(p.jumpKeyDown || false);
    p.jumpKeyDown = isJumpKeyDown;
    if (jumpPressed) { p.jumpBufferTimer = 0.1; } else { p.jumpBufferTimer = Math.max(0, (p.jumpBufferTimer || 0) - dt); }

    if (state.time > 0.2 && (p.jumpBufferTimer || 0) > 0 && (p.coyoteTimer || 0) > 0) {
      p.vy = -p.jumpSpeed; p.grounded = false; p.coyoteTimer = 0; p.jumpBufferTimer = 0;
      if (keys[p.controls.jump]) keys[p.controls.jump] = false;
      playSound('jump');
      for (let i = 0; i < 8; i++) {
        state.particles.push({ x: p.x + p.w/2 + (Math.random()-0.5)*20, y: p.y+p.h, vx: (Math.random()-0.5)*200, vy: (Math.random()-0.5)*100-50, life: 0.3+Math.random()*0.2, maxLife: 0.5, size: 2+Math.random()*4, color: 'rgba(255,255,255,0.8)' });
      }
    }

    // HIZLI İNİŞ
    const isFastFalling = !p.grounded && keys[p.controls.down];
    p.isFastFalling = isFastFalling;
    if (isFastFalling) p.vy += GRAVITY * 4.0 * dt;

    p.vy += GRAVITY * dt;
    const prevY = p.y;
    const wasGrounded = p.grounded;
    p.y += p.vy * dt;
    p.grounded = false;

    for (const plat of state.platforms) {
      // ✅ YENİ: ANAHTAR TOPLAMA
      if (plat.isKey && !plat.isCollected && checkCollision(p, plat)) {
        plat.isCollected = true;
        state.keysCollected += 1;
        playSound('key');
        for (let i = 0; i < 10; i++) {
          state.particles.push({ x: plat.x + plat.w/2, y: plat.y + plat.h/2, vx: (Math.random()-0.5)*200, vy: -Math.random()*150, life: 0.5, maxLife: 0.5, size: 3, color: '#fbbf24' });
        }
      }

      // ✅ YENİ: KİLİTLİ KAPI
      if (plat.isDoor && !plat.isOpen && checkCollision(p, plat)) {
        if (state.keysCollected > 0) {
          state.keysCollected -= 1;
          plat.isOpen = true;
          playSound('door');
        }
      }

      // ✅ YENİ: Çark (dairesel), düşman/dehşet/lazer (dikdörtgen) teması öldürür
      let lethalHit = false;
      if (plat.isWheel) {
        const radius = Math.min(plat.w, plat.h) / 2;
        lethalHit = circleHitsRect(plat.x + plat.w / 2, plat.y + plat.h / 2, radius * 0.92, p);
      } else if (plat.isHazard || plat.isLaser || plat.isEnemy) {
        lethalHit = checkCollision(p, plat);
      }

      if (lethalHit) {
		
		if (!state.restartRequested) playSound('die');
        state.restartRequested = true;
		state.restartTime = state.time;
      }

      if (checkCollision(p, plat)) { plat.isTouched = true; }
	  
      if (plat.isBreakable && !plat.isBroken && isFastFalling && p.vy > 600 && checkCollision(p, plat)) {
        const feetPos = p.y + p.h; const prevFeetPos = prevY + p.h;
        if (prevFeetPos <= plat.y + 5 && feetPos >= plat.y) {
           plat.isBroken = true; playSound('break');
           state.shakeTime = 0.25; state.shakeIntensity = 15;
           for (let i = 0; i < 15; i++) {
             state.particles.push({ x: plat.x + Math.random()*plat.w, y: plat.y + Math.random()*plat.h, vx: (Math.random()-0.5)*400, vy: (Math.random()-0.8)*300, life: 0.6+Math.random()*0.4, maxLife: 1.0, size: 3+Math.random()*5, color: '#8c5b37' });
           }
           continue;
        }
      }
      
      // ✅ YENİ: DENGE PLATFORMU YÜZEYİNE İNİŞ (tek yönlü, eğik yüzey)
      if (plat.isSeesaw) {
        const cx = p.x + p.w / 2;
        const prevCx = cx - p.vx * dt;
        if (isOverSeesaw(plat, cx)) {
          const ySurfNow = seesawSurfaceY(plat, cx);
          const ySurfPrev = seesawSurfaceY(plat, prevCx);
          const prevBottom = prevY + p.h;
          const bottom = p.y + p.h;
          if (p.vy >= 0 && prevBottom <= ySurfPrev + 8 && bottom >= ySurfNow) {
            const impactSpeed = p.vy; // ✅ Sert iniş şoku için sıfırlamadan önce sakla
            p.y = ySurfNow - p.h;
            p.vy = 0;
            p.grounded = true;
            p.landedAt = state.time;
            plat.isTouched = true;

            // ✅ YENİ: Sadece gerçek bir inişte (önceki karede havadaysa) şok ilet.
            // Tahtada duran oyuncu her karede "iniş" sayılmamalı.
            if (!wasGrounded && impactSpeed > 0) {
              const pivotX = plat.x + plat.w / 2;
              plat.seesawImpact = { offset: cx - pivotX, speed: impactSpeed };
            }

            // Eğimde kayma (platform bazında kapatılabilir: slide: false)
            if (plat.slide !== false) {
              p.vx += Math.sin(plat.angle || 0) * GRAVITY * 0.2 * dt;
            }
          }
        }
        continue;
      }

      if (!plat.isButtonBlue && !plat.isButtonPink && !plat.isHazard && !plat.isKey && !plat.isBroken && isSolid(p.color, plat) && checkCollision(p, plat)) {
        // Trambolin
        if (plat.isTrampoline && p.vy > 0 && prevY + p.h <= plat.y + 10) {
          p.y = plat.y - p.h; p.vy = -(p.jumpSpeed * 1.6); p.grounded = false; p.isFastFalling = false;
          playSound('bounce'); plat.bounceAnim = state.time;
          for (let i = 0; i < 12; i++) {
            state.particles.push({ x: p.x + p.w/2 + (Math.random()-0.5)*30, y: p.y+p.h, vx: (Math.random()-0.5)*300, vy: -Math.random()*150, life: 0.4, maxLife: 0.4, size: 3, color: '#2ecc71' });
          }
          continue;
        }

        if (plat.isWall) {
          if (p.vy > 0 && prevY + p.h <= plat.y + 10) { 
            if (p.vy > 800) {
              playSound('slam'); state.shakeTime = 0.15; state.shakeIntensity = 6;
              for (let i = 0; i < 10; i++) {
                state.particles.push({ x: p.x+p.w/2+(Math.random()-0.5)*30, y: p.y+p.h, vx: (Math.random()-0.5)*250, vy: -Math.random()*100, life: 0.4+Math.random()*0.2, maxLife: 0.6, size: 2+Math.random()*4, color: 'rgba(255,255,255,0.6)' });
              }
            }
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true; p.landedAt = state.time; handleColorChange(plat, p, state);
          } else if (p.vy < 0 && prevY >= plat.y + plat.h - 10) { 
            p.y = plat.y + plat.h; p.vy = 0; handleColorChange(plat, p, state);
          }
        } else {
          if (p.vy >= 0 && prevY + p.h <= plat.y + 5) {
            if (p.vy > 800) {
              playSound('slam'); state.shakeTime = 0.15; state.shakeIntensity = 6;
              for (let i = 0; i < 10; i++) {
                state.particles.push({ x: p.x+p.w/2+(Math.random()-0.5)*30, y: p.y+p.h, vx: (Math.random()-0.5)*250, vy: -Math.random()*100, life: 0.4+Math.random()*0.2, maxLife: 0.6, size: 2+Math.random()*4, color: 'rgba(255,255,255,0.6)' });
              }
            }
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true; p.landedAt = state.time; handleColorChange(plat, p, state);
          }
        }
      }
    }

    if (p.x < 0) p.x = 0;
    if (p.x + p.w > WIDTH) p.x = WIDTH - p.w;

    if (p.y > HEIGHT + 100) {
	  if (!state.restartRequested) playSound('die');
      state.restartRequested = true; state.restartTime = state.time;
    }
  });

  const goal = state.goal;
  if (goal) {
    const bothOnGoal = state.players.every(p =>
      p.grounded && Math.abs((p.y + p.h) - goal.y) < 15 && p.x + p.w > goal.x && p.x < goal.x + goal.w
    );
    if (bothOnGoal) state.levelComplete = true;
  }
}