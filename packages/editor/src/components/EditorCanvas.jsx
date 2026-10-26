import { useEffect, useRef, useState } from 'react';
import { WIDTH, HEIGHT, renderEditor } from 'game-core';

export default function EditorCanvas({ levelData, setLevelData, selectedTool, selectedPlatformIndex, setSelectedPlatformIndex, snapEnabled }) {
  const canvasRef = useRef(null);
  
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const levelRef = useRef(levelData);
  const didDragRef = useRef(false);

  useEffect(() => {
    if (!isDragging) levelRef.current = levelData;
  }, [levelData, isDragging]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let rafId;
    const loop = () => {
      const renderState = { ...levelData, players: [], time: performance.now() / 1000 };
      renderEditor(ctx, renderState, drawStart, drawCurrent, snapEnabled);

      if (selectedPlatformIndex !== null && levelData.platforms[selectedPlatformIndex]) {
        const p = levelData.platforms[selectedPlatformIndex];
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
        ctx.setLineDash([]);
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [levelData, drawStart, drawCurrent, selectedPlatformIndex, snapEnabled]);

  const getGridCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    if (snapEnabled) {
      return { x: Math.floor(rawX / 20) * 20, y: Math.floor(rawY / 20) * 20 };
    }
    return { x: Math.round(rawX), y: Math.round(rawY) };
  };

  const onPointerDown = (e) => {
    const { x, y } = getGridCoords(e);

    if (selectedTool === 'select') {
      const index = levelData.platforms.findIndex(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
      if (index !== -1) {
        setSelectedPlatformIndex(index);
        setDragTarget({ type: 'platform', index });
        setDragOffset({ x: x - levelData.platforms[index].x, y: y - levelData.platforms[index].y });
        setIsDragging(true);
        didDragRef.current = false;
      } else {
        setSelectedPlatformIndex(null);
      }
      return;
    }

    if (selectedTool === 'spawn') {
      const b = levelData.blueSpawn;
      if (x >= b.x && x <= b.x + 40 && y >= b.y && y <= b.y + 40) {
        setDragTarget({ type: 'blueSpawn' });
        setDragOffset({ x: x - b.x, y: y - b.y });
        setIsDragging(true);
        didDragRef.current = false;
        return;
      }
      const p = levelData.pinkSpawn;
      if (x >= p.x && x <= p.x + 40 && y >= p.y && y <= p.y + 40) {
        setDragTarget({ type: 'pinkSpawn' });
        setDragOffset({ x: x - p.x, y: y - p.y });
        setIsDragging(true);
        didDragRef.current = false;
        return;
      }
      return;
    }

    if (selectedTool === 'delete') {
      const newPlatforms = levelData.platforms.filter(p => 
        !(x >= p.x - 10 && x <= p.x + p.w + 10 && y >= p.y - 10 && y <= p.y + p.h + 10)
      );
      setLevelData({ ...levelData, platforms: newPlatforms });
      setSelectedPlatformIndex(null);
      return;
    }

    if (selectedTool === 'goal') {
      const newPlatforms = levelData.platforms.filter(p => !p.isGoal);
      newPlatforms.push({ x, y, w: 100, h: 20, color: 'platformNeutral', isGoal: true, brackets: true });
      setLevelData({ ...levelData, platforms: newPlatforms });
      return;
    }

    const drawableTools = [
      'platform', 'wall', 'platformBlue', 'platformPink', 
      'platformTimer', 'platformRemote', 'buttonBlue', 'buttonPink'
    ];

    if (drawableTools.includes(selectedTool)) {
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    }
  };

  const onPointerMove = (e) => {
    const { x, y } = getGridCoords(e);

    if (isDragging && dragTarget) {
      let newLevel;
      if (dragTarget.type === 'platform') {
        const base = levelRef.current;
        const newPlatforms = [...base.platforms];
        const p = newPlatforms[dragTarget.index];
        newPlatforms[dragTarget.index] = { ...p, x: x - dragOffset.x, y: y - dragOffset.y };
        newLevel = { ...base, platforms: newPlatforms };
      } else if (dragTarget.type === 'blueSpawn') {
        newLevel = { ...levelRef.current, blueSpawn: { x: x - dragOffset.x, y: y - dragOffset.y } };
      } else if (dragTarget.type === 'pinkSpawn') {
        newLevel = { ...levelRef.current, pinkSpawn: { x: x - dragOffset.x, y: y - dragOffset.y } };
      }
      if (newLevel) {
        didDragRef.current = true;
        levelRef.current = newLevel;
        setLevelData(newLevel, { commit: false });
      }
      return;
    }

    if (drawStart) {
      setDrawCurrent({ x, y });
    }
  };

  const onPointerUp = () => {
    if (isDragging) {
      if (didDragRef.current) {
        setLevelData(levelRef.current, { commit: true });
      }
      didDragRef.current = false;
      setIsDragging(false);
      setDragTarget(null);
      return;
    }

    if (!drawStart || !drawCurrent) return;
    
    const isClick = drawStart.x === drawCurrent.x && drawStart.y === drawCurrent.y;

    if (isClick) {
      if (selectedTool === 'buttonBlue' || selectedTool === 'buttonPink') {
        setDrawCurrent({ x: drawStart.x + 40, y: drawStart.y + 20 });
      } else {
        setDrawStart(null);
        setDrawCurrent(null);
        return;
      }
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    
    let w = Math.abs(drawCurrent.x - drawStart.x);
    let h = Math.abs(drawCurrent.y - drawStart.y);
    
    if (isClick && (selectedTool === 'buttonBlue' || selectedTool === 'buttonPink')) {
      w = 40; h = 20;
    } else {
      w = Math.max(snapEnabled ? 20 : 4, w);
      h = Math.max(snapEnabled ? 20 : 4, h);
    }

    const newPlatform = { x, y, w, h, brackets: true };

    switch (selectedTool) {
      case 'platform': newPlatform.color = 'platformNeutral'; newPlatform.changeable = true; newPlatform.isWall = false; break;
      case 'wall': newPlatform.color = 'platformNeutral'; newPlatform.changeable = true; newPlatform.isWall = true; break;
      case 'platformBlue': newPlatform.color = 'platformBlue'; newPlatform.changeable = false; newPlatform.isWall = false; break;
      case 'platformPink': newPlatform.color = 'platformPink'; newPlatform.changeable = false; newPlatform.isWall = false; break;
      case 'platformTimer': newPlatform.color = 'platformBlue'; newPlatform.isTimer = true; newPlatform.changeable = false; newPlatform.isWall = false; break;
      case 'platformRemote': newPlatform.color = 'platformNeutral'; newPlatform.isRemote = true; newPlatform.changeable = false; newPlatform.isWall = false; break;
      case 'buttonBlue': newPlatform.color = 'platformBlue'; newPlatform.isButtonBlue = true; newPlatform.changeable = false; newPlatform.isWall = false; break;
      case 'buttonPink': newPlatform.color = 'platformPink'; newPlatform.isButtonPink = true; newPlatform.changeable = false; newPlatform.isWall = false; break;
    }

    const newPlatforms = [...levelData.platforms, newPlatform];
    setLevelData({ ...levelData, platforms: newPlatforms });
    setSelectedPlatformIndex(newPlatforms.length - 1);
    
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const cursorStyle = 
    selectedTool === 'select' ? (isDragging ? 'grabbing' : 'grab') :
    selectedTool === 'spawn' ? 'pointer' :
    selectedTool === 'delete' ? 'not-allowed' :
    'crosshair';

  return (
    <div style={{ 
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      backgroundImage: 'linear-gradient(#1a1a2e 1px, transparent 1px), linear-gradient(90deg, #1a1a2e 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      backgroundColor: '#0f0f1a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* ORTA ALAN (CANVAS) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', padding: 40 }}>
        
        {/* CANVAS ÜSTÜ MİNİ ARAÇ ÇUBUĞU */}
        <div style={{ 
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 5, background: '#13131f', padding: '6px 12px', borderRadius: 20, border: '1px solid #2a2a40', zIndex: 10
        }}>
          {['↖', '✏️', '🧽', '✋', '⛶'].map(i => (
            <div key={i} className="hover-scale" style={{ width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', cursor: 'pointer', color: '#888', fontSize: 14 }}>{i}</div>
          ))}
        </div>

        <canvas 
          ref={canvasRef} 
          width={WIDTH} 
          height={HEIGHT} 
          onMouseDown={onPointerDown} 
          onMouseMove={onPointerMove} 
          onMouseUp={onPointerUp} 
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} 
          onTouchMove={onPointerMove} 
          onTouchEnd={onPointerUp}
          style={{ 
            border: '2px solid #2a2a40', 
            borderRadius: 4, 
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)', 
            cursor: cursorStyle,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            aspectRatio: `${WIDTH}/${HEIGHT}`,
            width: 'auto',
            height: 'auto',
            zIndex: 5
          }} 
        />
      </div>

      {/* ALT BAR (Sahne / Zaman Tüneli / Varlıklar) */}
      <div style={{
        height: 50, background: '#13131f', borderTop: '1px solid #1a1a2e',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 30, color: '#888', fontSize: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Sahne / Zaman Tüneli / Varlıklar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Izgara (20px Snap)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Varyantlar (20px)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Katmanlar (Layers)</span>
          <div style={{ width: 32, height: 18, background: '#2a2a40', borderRadius: 10, position: 'relative' }}>
            <div style={{ width: 14, height: 14, background: '#888', borderRadius: '50%', position: 'absolute', top: 2, left: 2 }} />
          </div>
        </div>
      </div>

    </div>
  );
}