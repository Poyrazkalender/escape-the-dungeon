import { GRAVITY, WIDTH, HEIGHT } from './constants.js';

export function createState(levelData, characters = { p1: 'platformBlue', p2: 'platformPink' }, forceP2Active = false) {
  return {
    time: 0, 
    levelComplete: false, 
    completedAt: 0, 
    restartRequested: false, 
    restartTime: 0,
    platforms: levelData.platforms.map(p => ({ 
      ...p, 
      isTouched: false,
      defaultColor: p.color || 'platformNeutral',
      isActive: false
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
        controls: { left: 'KeyA', right: 'KeyD', jump: 'KeyW' }, landedAt: -1, isConnected: true,
        coyoteTimer: 0, jumpBufferTimer: 0, jumpKeyDown: false
      },
      { 
        color: characters.p2, 
        x: characters.p2 === 'platformBlue' ? levelData.blueSpawn.x : levelData.pinkSpawn.x, 
        y: characters.p2 === 'platformBlue' ? levelData.blueSpawn.y : levelData.pinkSpawn.y, 
        w: 40, h: 40, vx: 0, vy: 0, speed: 260, jumpSpeed: 720, grounded: false, facing: 1, 
        controls: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' }, landedAt: -1, isConnected: forceP2Active,
        coyoteTimer: 0, jumpBufferTimer: 0, jumpKeyDown: false
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

  for (const plat of state.platforms) plat.isTouched = false;

  // ZAMANLAYICI PLATFORMLAR
  let timerStateChanged = false;
  for (const plat of state.platforms) {
    if (plat.isTimer) {
      const cycle = Math.floor(state.time / 3) % 2; 
      const newColor = cycle === 0 ? 'platformBlue' : 'platformPink';
      if (plat.color !== newColor) { 
        plat.color = newColor; 
        plat.customColor = null;
        timerStateChanged = true; 
      }
    }
  }
  if (timerStateChanged) state.buttonStateChanged = { type: 'timer' }; 

  // BUTONLAR
  let blueBtnPressed = false; 
  let pinkBtnPressed = false;
  for (const p of state.players) {
    for (const plat of state.platforms) {
      if (checkCollision(p, plat)) {
        plat.isTouched = true;
        if (plat.isButtonBlue) blueBtnPressed = true;
        if (plat.isButtonPink) pinkBtnPressed = true;
      }
    }
  }

  // UZAKTAN KUMANDALI PLATFORMLAR
  let remoteChanged = false;
  for (const plat of state.platforms) {
    if (plat.isRemote) {
      const isNowActive = blueBtnPressed || pinkBtnPressed;
      let targetColor = isNowActive ? (blueBtnPressed ? 'platformBlue' : 'platformPink') : plat.defaultColor;
      
      if (plat.isActive !== isNowActive || plat.color !== targetColor) {
        plat.isActive = isNowActive;
        plat.color = targetColor;
        plat.customColor = isNowActive ? null : plat.defaultColor; 
        remoteChanged = true;
      }
    }
  }
  if (remoteChanged) state.buttonStateChanged = { type: 'remote' };

  // TEST MODUNDA DİĞER OYUNCUYA YERÇEKİMİ
  const activePlayers = controlledPlayer === 'BOTH' ? state.players : [state.players[controlledPlayer === 'P2' ? 1 : 0]];
  const otherPlayers = controlledPlayer === 'BOTH' ? [] : [state.players[controlledPlayer === 'P2' ? 0 : 1]];

  if (isTesting) {
    otherPlayers.forEach(otherP => {
      if (!otherP.grounded) {
        otherP.vy += GRAVITY * dt;
        const prevY = otherP.y;
        otherP.y += otherP.vy * dt;
        for (const plat of state.platforms) {
          if (!plat.isButtonBlue && !plat.isButtonPink && isSolid(otherP.color, plat) && checkCollision(otherP, plat)) {
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

  // AKTİF OYUNCU HAREKETİ
  activePlayers.forEach(p => {
    let moveX = 0;
    if (keys[p.controls.left]) moveX -= 1;
    if (keys[p.controls.right]) moveX += 1;

    const targetVX = moveX * p.speed;
    p.vx += (targetVX - p.vx) * Math.min(1, 15 * dt);

    if (p.vx > 10) p.facing = 1;
    else if (p.vx < -10) p.facing = -1;

    p.x += p.vx * dt;

    for (const plat of state.platforms) {
      if (plat.isWall && !plat.isButtonBlue && !plat.isButtonPink && !plat.isRemote && isSolid(p.color, plat) && checkCollision(p, plat)) {
        if (p.vx > 0) p.x = plat.x - p.w; 
        else if (p.vx < 0) p.x = plat.x + plat.w; 
        p.vx = 0;
        handleColorChange(plat, p, state);
      }
    }

    // ✅ GÜVENLİ ZIPLAMA MANTIĞI (Coyote Time & Jump Buffer)
    const isJumpKeyDown = !!keys[p.controls.jump];

    // 1. Coyote Time
    if (p.grounded) {
      p.coyoteTimer = 0.1;
    } else {
      p.coyoteTimer = Math.max(0, (p.coyoteTimer || 0) - dt);
    }

    // 2. Jump Buffer (Sadece tuşa basıldığı ilk kareyi yakalar)
    const jumpPressed = isJumpKeyDown && !(p.jumpKeyDown || false);
    p.jumpKeyDown = isJumpKeyDown;

    if (jumpPressed) {
      p.jumpBufferTimer = 0.1;
    } else {
      p.jumpBufferTimer = Math.max(0, (p.jumpBufferTimer || 0) - dt);
    }

    // 3. Zıplama Kontrolü
    if ((p.jumpBufferTimer || 0) > 0 && (p.coyoteTimer || 0) > 0) {
      p.vy = -p.jumpSpeed;
      p.grounded = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      if (keys[p.controls.jump]) keys[p.controls.jump] = false;
    }

    // Yerçekimi ve Dikey Hareket
    p.vy += GRAVITY * dt;
    const prevY = p.y;
    p.y += p.vy * dt;
    p.grounded = false;

    for (const plat of state.platforms) {
      if (checkCollision(p, plat)) {
        plat.isTouched = true;
      }
      
      if (!plat.isButtonBlue && !plat.isButtonPink && isSolid(p.color, plat) && checkCollision(p, plat)) {
        if (plat.isWall) {
          if (p.vy > 0 && prevY + p.h <= plat.y + 10) { 
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
            handleColorChange(plat, p, state);
          } else if (p.vy < 0 && prevY >= plat.y + plat.h - 10) { 
            p.y = plat.y + plat.h; p.vy = 0;
            handleColorChange(plat, p, state);
          }
        } else {
          if (p.vy >= 0 && prevY + p.h <= plat.y + 5) {
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
            handleColorChange(plat, p, state);
          }
        }
      }
    }

    if (p.x < 0) p.x = 0;
    if (p.x + p.w > WIDTH) p.x = WIDTH - p.w;

    if (p.y > HEIGHT + 100) {
      state.restartRequested = true;
      state.restartTime = state.time;
    }
  });

  const goal = state.goal;
  if (goal) {
    const bothOnGoal = state.players.every(p =>
      p.grounded &&
      Math.abs((p.y + p.h) - goal.y) < 15 &&
      p.x + p.w > goal.x && p.x < goal.x + goal.w
    );
    if (bothOnGoal) state.levelComplete = true;
  }
}