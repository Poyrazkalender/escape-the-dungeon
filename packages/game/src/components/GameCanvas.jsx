import { useEffect, useRef, useState } from 'react';
import { WIDTH, HEIGHT, createState, update, updateRemotePlayer, renderWorld, renderEditor, clearImageCache } from 'game-core';
import TouchControls from './TouchControls';
import { joinRoom } from '@trystero-p2p/mqtt'; 
import { LEVELS } from '../game/levels';

export default function GameCanvas({ isEditing, isTesting, controlledPlayer = 'P1', selectedTool, customColor, customSprite, customSpriteTouched, levelData, onLevelChange, isMobile, characters, roomId, currentLevelIndex, setCurrentLevelIndex, onExit }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const keysRef = useRef({});
  const lastPublishedTime = useRef(0);
  const hasPublishedComplete = useRef(false);
  const hasPublishedRestart = useRef(false); 
  const isRemoteLevelChange = useRef(false);

  const joinTime = useRef(Date.now());
  const hasResolvedColor = useRef(false); 

  const [localCharacters, setLocalCharacters] = useState(characters);
  const localCharactersRef = useRef(localCharacters);

  const levelDataRef = useRef(levelData);
  const isTestingRef = useRef(isTesting);
  const controlledPlayerRef = useRef(controlledPlayer);
  const isCompleteRef = useRef(false);

  useEffect(() => { localCharactersRef.current = localCharacters; }, [localCharacters]);
  useEffect(() => { levelDataRef.current = levelData; }, [levelData]);
  useEffect(() => { isTestingRef.current = isTesting; }, [isTesting]);
  useEffect(() => { controlledPlayerRef.current = controlledPlayer; }, [controlledPlayer]);

  const roomRef = useRef(null);
  const playerStateActionRef = useRef(null);
  const gameEventActionRef = useRef(null);
  const levelActionRef = useRef(null);
  const syncActionRef = useRef(null); 

  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);

  useEffect(() => {
    setLocalCharacters(characters);
  }, [characters]);

  useEffect(() => {
    if (isEditing) return;
    stateRef.current = createState(levelData, localCharacters, isTesting);
    hasPublishedComplete.current = false;
    hasPublishedRestart.current = false;
    keysRef.current = {}; 
    setIsComplete(false);
  }, [levelData, localCharacters, isTesting, isEditing]);

  useEffect(() => {
    return () => clearImageCache();
  }, []);

  useEffect(() => {
    if (!roomId || isEditing) return;

    const room = joinRoom({ appId: 'love-game' }, roomId);
    roomRef.current = room;

    const playerStateAction = room.makeAction('player-state');
    const gameEventAction = room.makeAction('game-event');
    const levelAction = room.makeAction('change-level'); 
    const syncAction = room.makeAction('sync-state'); 

    playerStateActionRef.current = playerStateAction;
    gameEventActionRef.current = gameEventAction;
    levelActionRef.current = levelAction;
    syncActionRef.current = syncAction;

    const syncInterval = setInterval(() => {
      if (syncAction) {
        syncAction.send({ type: 'request', myColor: localCharactersRef.current.p1, joinTime: joinTime.current });
      }
    }, 1500);

    syncAction.onMessage = (data) => {
      if (data.type === 'request') {
        if (stateRef.current) {
          syncAction.send({ type: 'response', platforms: stateRef.current.platforms, myColor: localCharactersRef.current.p1, joinTime: joinTime.current });
        }
      } else if (data.type === 'response') {
        if (data.platforms && stateRef.current) {
          stateRef.current.platforms = data.platforms;
        }
      }

      if (data.myColor && !hasResolvedColor.current) {
        if (data.myColor === localCharactersRef.current.p1) {
          if (data.joinTime && joinTime.current > data.joinTime) {
            const newColor = localCharactersRef.current.p1 === 'platformBlue' ? 'platformPink' : 'platformBlue';
            setLocalCharacters({ p1: newColor, p2: data.myColor });
            hasResolvedColor.current = true;
            clearInterval(syncInterval);
          }
        }
      }
    };

    playerStateAction.onMessage = (data) => {
      if (!stateRef.current) return;
      updateRemotePlayer(stateRef.current, data);
    };

    gameEventAction.onMessage = (data) => {
      if (!stateRef.current) return;
      if (data.type === 'level-complete') {
        stateRef.current.levelComplete = true;
        setIsComplete(true);
      } else if (data.type === 'restart') {
        if (!stateRef.current.restartRequested) {
          stateRef.current.restartRequested = true;
          stateRef.current.restartTime = stateRef.current.time;
          setIsComplete(false);
        }
      } else if (data.type === 'manual-restart') {
        stateRef.current = createState(levelDataRef.current, localCharactersRef.current, isTestingRef.current);
        hasPublishedComplete.current = false;
        hasPublishedRestart.current = false;
        keysRef.current = {};
        setIsComplete(false);
      } else if (data.type === 'exit') {
        onExit();
      } else if (data.type === 'platform-change') {
        stateRef.current.platforms[data.index].color = data.color;
        stateRef.current.platforms[data.index].customColor = null;
      } else if (data.type === 'button-state-change') {
        if (data.platforms) {
          stateRef.current.platforms = data.platforms;
        }
      }
    };

    levelAction.onMessage = (index) => {
      if (setCurrentLevelIndex) {
        isRemoteLevelChange.current = true;
        setCurrentLevelIndex(index);
        setIsComplete(false);
      }
    };

    return () => {
      clearInterval(syncInterval); 
      room.leave();
      roomRef.current = null;
      hasResolvedColor.current = false; 
    };
  }, [roomId, isEditing, onExit, setCurrentLevelIndex]);

  useEffect(() => {
    if (isRemoteLevelChange.current) {
      isRemoteLevelChange.current = false;
      return;
    }
    if (levelActionRef.current && roomId && !isEditing) {
      levelActionRef.current.send(currentLevelIndex);
    }
  }, [currentLevelIndex, roomId, isEditing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; 
    
    let rafId;
    let lastTime = performance.now();

    const onKeyDown = e => {
      if (isEditing || isCompleteRef.current) return;
      keysRef.current[e.code] = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = e => { keysRef.current[e.code] = false; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = time => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      
      const state = stateRef.current;

      if (!isEditing && state) {
        update(state, keysRef.current, dt, controlledPlayerRef.current, isTestingRef.current);

        if (state.levelComplete && !isCompleteRef.current) {
          setIsComplete(true);
        }

        if (state.restartRequested) {
          if (!hasPublishedRestart.current) {
            hasPublishedRestart.current = true;
            if (gameEventActionRef.current) gameEventActionRef.current.send({ type: 'restart' });
          }

          if (state.time - state.restartTime > 0.6) {
            stateRef.current = createState(levelDataRef.current, localCharactersRef.current, isTestingRef.current);
            hasPublishedComplete.current = false;
            hasPublishedRestart.current = false; 
            keysRef.current = {}; 
          }
        } else {
          if (!state.levelComplete) {
            if (gameEventActionRef.current && roomId && state.platformChanged) {
              gameEventActionRef.current.send({ type: 'platform-change', index: state.platformChanged.index, color: state.platformChanged.color });
              state.platformChanged = null;
            }

            if (gameEventActionRef.current && roomId && state.buttonStateChanged) {
              gameEventActionRef.current.send({ type: 'button-state-change', platforms: state.platforms });
              state.buttonStateChanged = null;
            }

            if (playerStateActionRef.current && roomId && time - lastPublishedTime.current > 50) {
              const myPlayer = state.players[0];
              playerStateActionRef.current.send({
                color: myPlayer.color,
                x: myPlayer.x,
                y: myPlayer.y,
                vx: myPlayer.vx,
                vy: myPlayer.vy,
                facing: myPlayer.facing,
                grounded: myPlayer.grounded,
              });
              lastPublishedTime.current = time;
            }
          }

          if (gameEventActionRef.current && roomId && state.levelComplete && !hasPublishedComplete.current) {
            gameEventActionRef.current.send({ type: 'level-complete' });
            hasPublishedComplete.current = true;
          }
        }
      }
      
      const renderData = isEditing 
        ? { ...levelData, players: [], time: performance.now() / 1000, levelComplete: false } 
        : stateRef.current;
      
      // ✅ YENİ: game-core'dan gelen render fonksiyonları
      if (renderData) {
        if (isEditing) {
          renderEditor(ctx, renderData, drawStart, drawCurrent);
        } else {
          renderWorld(ctx, renderData);
        }
      }

      if (!isEditing && state && state.restartRequested) {
        const progress = Math.min(1, (state.time - state.restartTime) / 0.6);
        ctx.fillStyle = `rgba(0, 0, 0, ${progress * 0.8})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = `rgba(255, 80, 80, ${progress})`;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DÜŞTÜNÜZ!', WIDTH / 2, HEIGHT / 2 - 10);
        ctx.font = '16px monospace';
        ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.fillText('yeniden başlıyor...', WIDTH / 2, HEIGHT / 2 + 30);
        ctx.textAlign = 'left';
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isEditing, levelData, drawStart, drawCurrent, roomId]);

  const handleNextLevel = () => {
    if (!roomId) return;
    const nextIndex = currentLevelIndex + 1;
    if (nextIndex < LEVELS.length) {
      if (levelActionRef.current) levelActionRef.current.send(nextIndex);
      setCurrentLevelIndex(nextIndex);
    } else {
      handleExit();
    }
  };

  const handleRestartLevel = () => {
    if (!stateRef.current) return;
    if (gameEventActionRef.current) gameEventActionRef.current.send({ type: 'manual-restart' });
    stateRef.current = createState(levelDataRef.current, localCharactersRef.current, isTestingRef.current);
    hasPublishedComplete.current = false;
    hasPublishedRestart.current = false;
    lastPublishedTime.current = 0;
    keysRef.current = {};
    setIsComplete(false);
  };

  const handleExit = () => {
    if (gameEventActionRef.current) gameEventActionRef.current.send({ type: 'exit' });
    onExit();
  };

  const getGridCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.floor(((clientX - rect.left) * scaleX) / 20) * 20;
    const y = Math.floor(((clientY - rect.top) * scaleY) / 20) * 20;
    return { x, y };
  };

  const onPointerDown = (e) => {
    if (!isEditing) return;
    const { x, y } = getGridCoords(e);
    if (selectedTool === 'delete') {
      const newPlatforms = levelData.platforms.filter(p => 
        !(x >= p.x - 10 && x <= p.x + p.w + 10 && y >= p.y - 10 && y <= p.y + p.h + 10)
      );
      onLevelChange({ ...levelData, platforms: newPlatforms });
      return;
    }
    if (selectedTool === 'spawnBlue' || selectedTool === 'spawnPink' || selectedTool === 'goal') {
      if (selectedTool === 'spawnBlue') onLevelChange({ ...levelData, blueSpawn: { x, y } });
      if (selectedTool === 'spawnPink') onLevelChange({ ...levelData, pinkSpawn: { x, y } });
      if (selectedTool === 'goal') {
        const newPlatforms = levelData.platforms.filter(p => !p.isGoal);
        newPlatforms.push({ x, y, w: 100, h: 20, color: 'platformNeutral', isGoal: true, brackets: true });
        onLevelChange({ ...levelData, platforms: newPlatforms });
      }
      return;
    }
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const onPointerMove = (e) => {
    if (!isEditing || !drawStart) return;
    setDrawCurrent(getGridCoords(e));
  };

  const onPointerUp = () => {
    if (!isEditing || !drawStart || !drawCurrent) return;
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.max(20, Math.abs(drawCurrent.x - drawStart.x));
    const h = Math.max(20, Math.abs(drawCurrent.y - drawStart.y));
    const newPlatform = { x, y, w, h, brackets: true };
    
    if (selectedTool === 'changeable') {
      newPlatform.color = 'platformNeutral'; newPlatform.changeable = true; newPlatform.isWall = false;
    } else if (selectedTool === 'wallChangeable') {
      newPlatform.color = 'platformNeutral'; newPlatform.changeable = true; newPlatform.isWall = true;
    } else if (selectedTool === 'platformNeutral') {
      newPlatform.color = 'platformNeutral'; newPlatform.changeable = false; newPlatform.isWall = false;
    } else if (selectedTool === 'wallNeutral') {
      newPlatform.color = 'platformNeutral'; newPlatform.changeable = false; newPlatform.isWall = true;
    } else if (selectedTool === 'platformBlue' || selectedTool === 'platformPink') {
      newPlatform.color = selectedTool; newPlatform.changeable = false; newPlatform.isWall = false;
    } else if (selectedTool === 'platformTimer') {
      newPlatform.isTimer = true; newPlatform.color = 'platformBlue'; newPlatform.isWall = false;
    } else if (selectedTool === 'platformRemote') {
      newPlatform.isRemote = true; newPlatform.color = 'platformNeutral'; newPlatform.isWall = false;
    } else if (selectedTool === 'buttonBlue') {
      newPlatform.isButtonBlue = true; newPlatform.color = 'platformBlue'; newPlatform.isWall = false;
    } else if (selectedTool === 'buttonPink') {
      newPlatform.isButtonPink = true; newPlatform.color = 'platformPink'; newPlatform.isWall = false;
    }

    if (newPlatform.color === 'platformNeutral') {
      newPlatform.customColor = customColor; 
    }
    if (customSprite) newPlatform.sprite = customSprite;
    if (customSpriteTouched) newPlatform.spriteTouched = customSpriteTouched;

    onLevelChange({ ...levelData, platforms: [...levelData.platforms, newPlatform] });
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const handleTouchKey = (key, isPressed) => {
    keysRef.current[key] = isPressed;
  };

  const activeControls = controlledPlayer === 'P2' 
    ? { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' } 
    : { left: 'KeyA', right: 'KeyD', jump: 'KeyW' };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: WIDTH, display: 'flex', justifyContent: 'center' }}>
      <canvas 
        ref={canvasRef} width={WIDTH} height={HEIGHT} 
        onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        style={{ border: '4px solid #111', borderRadius: 8, boxShadow: '0 0 30px rgba(0,0,0,0.8)', imageRendering: 'pixelated', cursor: isEditing ? 'crosshair' : 'default', width: '100%', height: 'auto', touchAction: 'none' }} 
      />
      
      {!isEditing && isMobile && <TouchControls onKeyChange={handleTouchKey} keys={activeControls} />}

      {isComplete && !isEditing && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 20, 0.85)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', 
          zIndex: 999, pointerEvents: 'auto', borderRadius: 8
        }}>
          <h1 style={{ color: '#4caf50', fontSize: 48, margin: 0, textShadow: '0 0 20px #4caf50' }}>TEBRİKLER!</h1>
          <p style={{ color: '#fff', fontSize: 20, marginTop: 10, marginBottom: 30 }}>Seviyeyi başarıyla tamamladınız.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, width: 250 }}>
            {roomId ? (
              <>
                <button onClick={handleNextLevel} style={{ padding: 15, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
                  ⏭ SONRAKİ SEVİYE
                </button>
                <button onClick={handleRestartLevel} style={{ padding: 15, background: '#f39c12', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
                  🔄 YENİDEN OYNA
                </button>
                <button onClick={handleExit} style={{ padding: 15, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
                  🚪 ANA MENÜ
                </button>
              </>
            ) : (
              <>
                <button onClick={handleExit} style={{ padding: 15, background: '#3498db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
                  ✏️ DÜZENLEMEYE DÖN
                </button>
                <button onClick={handleRestartLevel} style={{ padding: 15, background: '#f39c12', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
                  🔄 YENİDEN TEST ET
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}