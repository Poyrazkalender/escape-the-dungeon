import { GRAVITY, WIDTH, HEIGHT } from './constants.js';
import { playSound } from './sound.js';

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
      // ✅ YENİ: Kutu için fizik değişkenleri
      vx: 0, vy: 0, grounded: false, boxGrounded: false ,
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

function isSolid(playerColor, plat) {
  if (plat.isDoor && plat.isOpen) return false;
  
  // ✅ YENİ: Lazer içinden geçilebilir (sadece öldürür)
  if (plat.isLaser) return false;
  
  // ✅ YENİ: Kol ve hedefi her zaman katıdır (içinden geçilmez)
  if (plat.isLever || plat.isLeverTarget) return true;
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

    // Kutuya yerçekimi uygula
    plat.vy += GRAVITY * dt;
    plat.y += plat.vy * dt;
    plat.boxGrounded = false;

    // Kutu ile zemin çarpışması
    for (const ground of state.platforms) {
      if (ground === plat || ground.isBox || ground.isKey || ground.isGoal || ground.isHazard) continue;
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
      if (ground === plat || ground.isBox || ground.isKey || ground.isGoal || ground.isHazard) continue;
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
      if (!otherP.grounded) {
        otherP.vy += GRAVITY * dt;
        const prevY = otherP.y;
        otherP.y += otherP.vy * dt;
        for (const plat of state.platforms) {
          if (!plat.isButtonBlue && !plat.isButtonPink && !plat.isBroken && isSolid(otherP.color, plat) && checkCollision(otherP, plat)) {
            if (plat.isWall) {
               if (otherP.vy > 0 && prevY + otherP.h <= plat.y + 10) { otherP.y = plat.y - otherP.h; otherP.vy = 0; otherP.grounded = true; }
            } else {
               if (otherP.vy >= 0 && prevY + otherP.h <= plat.y + 5) { otherP.y = plat.y - otherP.h; otherP.vy = 0; otherP.grounded = true; }
            }
          }
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

        if (p.vx > 0) p.x = plat.x - p.w; 
        else if (p.vx < 0) p.x = plat.x + plat.w; 
        p.vx = 0; 
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

      if ((plat.isHazard || plat.isLaser) && checkCollision(p, plat)) {
        
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
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true; handleColorChange(plat, p, state);
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
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true; handleColorChange(plat, p, state);
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