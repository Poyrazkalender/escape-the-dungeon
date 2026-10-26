import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, ArrowLeftRight, Brush, ChevronDown, ChevronUp, Copy, Eraser,
  File, ImagePlus, MousePointer2, Move, Paintbrush, Pencil, Play,
  Redo2, ScanSearch, Search, Settings, Square, Trash2, Undo2, X, SquareDashed,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { WIDTH, HEIGHT, renderEditor, renderWorld, createState, update, validateLevel } from 'game-core';

const LIBRARY = [
  { section: 'TEMEL', items: [
    { id: 'select', label: 'Seç / Taşı', icon: '↖', tool: 'select' },
    { id: 'delete', label: 'Sil', icon: '🗑', tool: 'delete' },
  ]},
  { section: 'ZEMİNLER', items: [
    { id: 'platform', label: 'Değişken Zemin', icon: '🧱', tool: 'platform', isBrick: true },
    { id: 'wall', label: 'Değişken Duvar', icon: '🧱', tool: 'wall', isBrick: true },
    { id: 'platformBlue', label: 'Sabit Mavi', icon: '🟦', tool: 'platformBlue' },
    { id: 'platformPink', label: 'Sabit Pembe', icon: '🟪', tool: 'platformPink' },
  ]},
  { section: 'MANTIK & ÖZEL', items: [
    { id: 'platformTimer', label: 'Zamanlayıcı', icon: '⏱️', tool: 'platformTimer' },
    { id: 'platformRemote', label: 'Uzaktan Kum.', icon: '📟', tool: 'platformRemote' },
    { id: 'buttonBlue', label: 'Mavi Buton', icon: '🔵', tool: 'buttonBlue' },
    { id: 'buttonPink', label: 'Pembe Buton', icon: '🩷', tool: 'buttonPink' },
  ]},
  { section: 'OBJELER', items: [
    { id: 'goal', label: 'Hedef Koy', icon: '🎯', tool: 'goal' },
  ]},
];

const SWATCHES = ['#171f36', '#414554', '#b42d68', '#873fa6', '#4059c8', '#209ee7', '#1d8196', '#2da56e', '#75bd4e', '#ffc536', '#f18b0a', '#aa6046', '#818994', '#fbfbfb'];
const DEFAULT_LEVEL = {
  platforms: [
    { x: 60, y: 440, w: 160, h: 20, color: 'platformNeutral', brackets: true, changeable: true },
    { x: 680, y: 60, w: 100, h: 20, color: 'platformNeutral', isGoal: true, brackets: true }
  ],
  blueSpawn: { x: 100, y: 360 },
  pinkSpawn: { x: 160, y: 360 },
  backgroundImage: null
};

function IconButton({ children, title, className = '', onClick, disabled = false }) {
  return <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className={`icon-button ${className}`}>{children}</button>;
}

function Toggle({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button>;
}

export default function App() {
  const [editorState, setEditorState] = useState({ history: [DEFAULT_LEVEL], index: 0, live: DEFAULT_LEVEL });
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [gridSnap, setGridSnap] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  
  const clipboardRef = useRef([]);

  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [activeColor, setActiveColor] = useState(SWATCHES[0]);
  
  const canvasRef = useRef(null);
  const levelRef = useRef(editorState.live);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  const dragStartPositionsRef = useRef({});

  const [testState, setTestState] = useState(null);
  const testKeysRef = useRef({});

  const levelData = editorState.live;
  const selectedPlatform = selectedIndices.length === 1 ? levelData.platforms[selectedIndices[0]] : null;

  useEffect(() => { if (!isDragging) levelRef.current = levelData; }, [levelData, isDragging]);

  const catalog = LIBRARY.map(group => ({
    ...group,
    items: group.items.filter(item => item.label.toLocaleLowerCase('tr').includes(searchText.toLocaleLowerCase('tr'))),
  })).filter(group => group.items.length);

  const setLevelData = useCallback((newLevel, { commit = true } = {}) => {
    setEditorState(prev => {
      const newState = { ...prev, live: newLevel };
      if (commit) {
        const newHistory = prev.history.slice(0, prev.index + 1);
        newHistory.push(newLevel);
        if (newHistory.length > 50) newHistory.shift();
        newState.history = newHistory;
        newState.index = newHistory.length - 1;
      }
      return newState;
    });
  }, []);

  const undo = useCallback(() => {
    setEditorState(prev => {
      if (prev.index === 0) return prev;
      return { ...prev, index: prev.index - 1, live: prev.history[prev.index - 1] };
    });
    setSelectedIndices([]);
  }, []);

  const redo = useCallback(() => {
    setEditorState(prev => {
      if (prev.index >= prev.history.length - 1) return prev;
      return { ...prev, index: prev.index + 1, live: prev.history[prev.index + 1] };
    });
    setSelectedIndices([]);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isTesting) return;
      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isMod && key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } 
      else if (isMod && ((key === 'z' && e.shiftKey) || key === 'y')) { e.preventDefault(); redo(); }
      else if (isMod && key === 'c') {
        if (selectedIndices.length > 0) {
          clipboardRef.current = selectedIndices.map(i => ({ ...levelData.platforms[i] }));
        }
      }
      else if (isMod && key === 'v') {
        if (clipboardRef.current.length > 0) {
          const newPlatforms = clipboardRef.current.map(p => ({ ...p, x: p.x + 20, y: p.y + 20 }));
          const newLevel = { ...levelData, platforms: [...levelData.platforms, ...newPlatforms] };
          setLevelData(newLevel);
          const newIndices = [];
          for (let i = 0; i < newPlatforms.length; i++) newIndices.push(levelData.platforms.length + i);
          setSelectedIndices(newIndices);
          clipboardRef.current = clipboardRef.current.map(p => ({ ...p, x: p.x + 20, y: p.y + 20 }));
        }
      }
      else if (key === 'delete' || key === 'backspace') {
        if (selectedIndices.length > 0) {
          e.preventDefault();
          const newPlatforms = levelData.platforms.filter((_, i) => !selectedIndices.includes(i));
          setLevelData({ ...levelData, platforms: newPlatforms });
          setSelectedIndices([]);
        }
      }
      
      if (e.code === 'Space') { e.preventDefault(); setIsPanning(true); }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space') { setIsPanning(false); }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [isTesting, selectedIndices, levelData, undo, redo, setLevelData]);

  // RENDER LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let rafId;
    let lastTime = performance.now();
    
    const loop = (time) => {
      if (lastTime === 0) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;

      if (isTesting && testState) {
        update(testState, testKeysRef.current, dt, 'BOTH', true); 
        renderWorld(ctx, testState);
      } else {
        const renderState = { ...levelData, players: [], time: performance.now() / 1000 };
        renderEditor(ctx, renderState, drawStart, drawCurrent, gridSnap);
        
        selectedIndices.forEach(idx => {
          const p = levelData.platforms[idx];
          if (p) {
            ctx.strokeStyle = '#72dcff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
            ctx.setLineDash([]);
          }
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [levelData, drawStart, drawCurrent, selectedIndices, gridSnap, isTesting, testState]);

  useEffect(() => {
    const down = (e) => { if (isTesting) testKeysRef.current[e.code] = true; };
    const up = (e) => { if (isTesting) testKeysRef.current[e.code] = false; };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      testKeysRef.current = {};
    };
  }, [isTesting]);

  const handleWheel = (e) => {
    if (isTesting) return;
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.001;
    setZoom(z => Math.min(Math.max(0.2, z + zoomFactor), 3));
  };

  const getGridCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    if (gridSnap) return { x: Math.floor(rawX / 20) * 20, y: Math.floor(rawY / 20) * 20 };
    return { x: Math.round(rawX), y: Math.round(rawY) };
  };

  const onPointerDown = (e) => {
    if (isTesting) return;

    if (isPanning || e.button === 1) {
      e.preventDefault();
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setIsPanning(true);
      return;
    }

    const { x, y } = getGridCoords(e);

    if (selectedTool === 'select') {
      const index = levelData.platforms.findIndex(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
      const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
      
      if (index !== -1) {
        let newIndices;
        if (isMultiSelect) {
          newIndices = selectedIndices.includes(index) ? selectedIndices.filter(i => i !== index) : [...selectedIndices, index];
        } else {
          newIndices = [index];
        }
        setSelectedIndices(newIndices);

        if (newIndices.length > 0) {
          setDragTarget({ type: 'platforms', indices: newIndices });
          setDragOffset({ x, y });
          setIsDragging(true);
          didDragRef.current = false;
          const positions = {};
          newIndices.forEach(i => { positions[i] = { x: levelData.platforms[i].x, y: levelData.platforms[i].y }; });
          dragStartPositionsRef.current = positions;
        }
        return;
      } 
      
      setSelectedIndices([]); 
      
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

      if (!isMultiSelect) setSelectedIndices([]);
      return;
    }

    if (selectedTool === 'delete') {
      const newPlatforms = levelData.platforms.filter(p => !(x >= p.x - 10 && x <= p.x + p.w + 10 && y >= p.y - 10 && y <= p.y + p.h + 10));
      setLevelData({ ...levelData, platforms: newPlatforms }); setSelectedIndices([]); return;
    }

    if (selectedTool === 'goal') {
      const newPlatforms = levelData.platforms.filter(p => !p.isGoal);
      newPlatforms.push({ x, y, w: 100, h: 20, color: 'platformNeutral', isGoal: true, brackets: true });
      setLevelData({ ...levelData, platforms: newPlatforms }); return;
    }

    if (['platform', 'wall', 'platformBlue', 'platformPink', 'platformTimer', 'platformRemote', 'buttonBlue', 'buttonPink'].includes(selectedTool)) {
      setDrawStart({ x, y }); setDrawCurrent({ x, y });
    }
  };

  const onPointerMove = (e) => {
    if (isTesting) return;

    if (isPanning && e.buttons === 4 || (isPanning && e.type === 'touchmove') || (isPanning && e.buttons === 1)) {
      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
      return;
    }

    const { x, y } = getGridCoords(e);

    if (isDragging && dragTarget) {
      didDragRef.current = true;
      let newLevel = { ...levelRef.current };

      if (dragTarget.type === 'platforms') {
        const dx = x - dragOffset.x;
        const dy = y - dragOffset.y;
        const newPlatforms = [...newLevel.platforms];
        dragTarget.indices.forEach(idx => {
          const startPos = dragStartPositionsRef.current[idx];
          if (startPos) {
            let newX = startPos.x + dx;
            let newY = startPos.y + dy;
            if (gridSnap) {
              newX = Math.round(newX / 20) * 20;
              newY = Math.round(newY / 20) * 20;
            }
            newPlatforms[idx] = { ...newPlatforms[idx], x: newX, y: newY };
          }
        });
        newLevel.platforms = newPlatforms;
      } 
      else if (dragTarget.type === 'blueSpawn') {
        let newX = x - dragOffset.x;
        let newY = y - dragOffset.y;
        if (gridSnap) {
          newX = Math.round(newX / 20) * 20;
          newY = Math.round(newY / 20) * 20;
        }
        newLevel.blueSpawn = { x: newX, y: newY };
      } else if (dragTarget.type === 'pinkSpawn') {
        let newX = x - dragOffset.x;
        let newY = y - dragOffset.y;
        if (gridSnap) {
          newX = Math.round(newX / 20) * 20;
          newY = Math.round(newY / 20) * 20;
        }
        newLevel.pinkSpawn = { x: newX, y: newY };
      }
      
      levelRef.current = newLevel;
      setLevelData(newLevel, { commit: false });
      return;
    }
    if (drawStart) setDrawCurrent({ x, y });
  };

  const onPointerUp = (e) => {
    if (isTesting) return;
    
    if (isPanning) {
      if (!e.code || e.code !== 'Space') setIsPanning(false);
      return;
    }

    if (isDragging) {
      if (didDragRef.current) setLevelData(levelRef.current, { commit: true });
      didDragRef.current = false; setIsDragging(false); setDragTarget(null); return;
    }

    if (!drawStart || !drawCurrent) return;
    const isClick = drawStart.x === drawCurrent.x && drawStart.y === drawCurrent.y;

    if (isClick) {
      if (selectedTool === 'buttonBlue' || selectedTool === 'buttonPink') setDrawCurrent({ x: drawStart.x + 40, y: drawStart.y + 20 });
      else { setDrawStart(null); setDrawCurrent(null); return; }
    }

    const x = Math.min(drawStart.x, drawCurrent.x); const y = Math.min(drawStart.y, drawCurrent.y);
    let w = Math.abs(drawCurrent.x - drawStart.x); let h = Math.abs(drawCurrent.y - drawStart.y);
    
    if (isClick && (selectedTool === 'buttonBlue' || selectedTool === 'buttonPink')) { w = 40; h = 20; } 
    else { w = Math.max(gridSnap ? 20 : 4, w); h = Math.max(gridSnap ? 20 : 4, h); }

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
    setSelectedIndices([newPlatforms.length - 1]);
    setDrawStart(null); setDrawCurrent(null);
  };

  const updateSelectedPlatform = (key, value) => {
    if (selectedIndices.length !== 1) return;
    const idx = selectedIndices[0];
    const newPlatforms = [...levelData.platforms];
    newPlatforms[idx] = { ...newPlatforms[idx], [key]: value };
    const newLevel = { ...levelData, platforms: newPlatforms };
    
    if (['sprite', 'spriteTouched', 'customColor'].includes(key)) {
      setLevelData(newLevel, { commit: true });
    } else {
      setLevelData(newLevel, { commit: false });
      clearTimeout(window._propCommitRef);
      window._propCommitRef = setTimeout(() => setLevelData(newLevel, { commit: true }), 600);
    }
  };

  const copyJSON = async () => {
    const errors = validateLevel(levelData);
    if (errors.length > 0) { alert("Hatalar var!\n" + errors.join("\n")); return; }
    try {
      await navigator.clipboard.writeText(JSON.stringify(levelData, null, 2));
      alert('Sahne JSON olarak panoya kopyalandı.');
    } catch {
      prompt('JSON çıktısı:', JSON.stringify(levelData, null, 2));
    }
  };

  const readImage = (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (kind === 'texture') updateSelectedPlatform('sprite', String(reader.result));
      else setLevelData({ ...levelData, backgroundImage: String(reader.result) }, { commit: true });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleTestToggle = () => {
    if (isTesting) { 
      setIsTesting(false); 
      setTestState(null); 
      testKeysRef.current = {};
    } else { 
      testKeysRef.current = {}; 
      setIsPanning(false);
      
      const newTestState = createState(levelData, { p1: 'platformBlue', p2: 'platformPink' }, true);
      setTestState(newTestState); 
      setIsTesting(true); 
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar panel">
        <div className="brand-area">
          <div className="avatar"><span>👨🏻‍💻</span></div>
          <div className="brand-mark"><span className="crossed-tools">⚒</span><strong>LEVEL EDITOR</strong><span className="version">v0.8.1</span></div>
        </div>
        <div className="header-actions">
          <button className={`test-button ${isTesting ? 'is-testing' : ''}`} onClick={handleTestToggle}><Play size={19} fill="currentColor" /> {isTesting ? 'TESTİ DURDUR' : 'TEST ET'}</button>
          <button className="top-action" onClick={undo} disabled={editorState.index === 0}><Undo2 size={20} /> Geri Al</button>
          <button className="top-action muted" onClick={redo} disabled={editorState.index >= editorState.history.length - 1}><Redo2 size={20} /> İleri Al</button>
          <button className="json-button" onClick={copyJSON}><Copy size={18} /> JSON Kopyala</button>
        </div>
        <div className="top-tools">
          {searchOpen && <div className="quick-search"><Search size={15}/><input autoFocus value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Nesne ara..." /></div>}
          <IconButton title="Ayarlar"><Settings size={22}/></IconButton>
          <IconButton title="Akıllı seçim" onClick={() => setSelectedTool('select')}><ScanSearch size={22}/></IconButton>
          <IconButton title="Ara" onClick={() => setSearchOpen(v => !v)}><Search size={24}/></IconButton>
          <IconButton title="Dışa aktar" onClick={copyJSON}><ArrowLeftRight size={23}/></IconButton>
        </div>
      </header>

      <main className="editor-layout">
        <nav className="tool-rail panel" aria-label="Araçlar">
          <div className="rail-tools">
            <IconButton title="Seç / Taşı" className={selectedTool === 'select' ? 'active' : ''} onClick={() => setSelectedTool('select')}><MousePointer2 size={23}/></IconButton>
            <IconButton title="Hedef Koy" className={selectedTool === 'goal' ? 'active' : ''} onClick={() => setSelectedTool('goal')}><SquareDashed size={22}/></IconButton>
            <IconButton title="Sil" className={selectedTool === 'delete' ? 'active' : ''} onClick={() => setSelectedTool('delete')}><Move size={22}/></IconButton>
          </div>
          <div className="rail-bottom"><IconButton title="Araç ayarları"><Settings size={21}/></IconButton></div>
        </nav>

        <aside className="asset-panel panel">
          <div className="asset-header-actions">
            <button className={`select-move ${selectedTool === 'select' ? 'selected' : ''}`} onClick={() => setSelectedTool('select')}><MousePointer2 size={17} fill="currentColor"/> Seç / Taşı</button>
            <button className="delete-button" onClick={() => { if(selectedIndices.length > 0){ const np=levelData.platforms.filter((_,i)=>!selectedIndices.includes(i)); setLevelData({...levelData, platforms:np}); setSelectedIndices([]);} }}><Trash2 size={18} fill="currentColor"/> Sil</button>
          </div>
          <div className="asset-scroll">
            {catalog.map(group => <section className="asset-section" key={group.section}>
              <div className="section-heading">{group.section}<span /></div>
              <div className="asset-grid">
                {group.items.map(asset => <button key={asset.id} className={`asset-card ${selectedTool === asset.tool ? 'chosen' : ''}`} onClick={() => { setSelectedTool(asset.tool); setSelectedIndices([]); }}>
                  <span className={`asset-art`}>{asset.isBrick ? <span className={asset.id==='wall' ? 'wall-art' : 'brick-art'}><i/><i/><i/><i/><i/><i/></span> : <span>{asset.icon}</span>}</span>
                  <span className="asset-label">{asset.label}</span>
                </button>)}
              </div>
            </section>)}
          </div>
          <div className="asset-footer"><button className="json-button footer-json" onClick={copyJSON}><File size={19}/> JSON Kopyala</button></div>
        </aside>

        <section className={`stage-panel panel ${isTesting ? 'testing' : ''}`} aria-label="Sahne çalışma alanı">
          <div className="ruler ruler-top"><div /></div>
          <div className="ruler ruler-left"><div /></div>
          
          <div 
            className={`stage-grid ${gridSnap ? '' : 'no-snap'} ${isPanning ? 'panning' : ''}`}
            onWheel={handleWheel}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          >
            <div style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              width: WIDTH, height: HEIGHT
            }}>
              <canvas 
                ref={canvasRef}
                width={WIDTH} height={HEIGHT}
                onMouseDown={onPointerDown} 
                onMouseMove={onPointerMove} 
                onMouseUp={onPointerUp} 
                onMouseLeave={onPointerUp}
                onTouchStart={onPointerDown} 
                onTouchMove={onPointerMove} 
                onTouchEnd={onPointerUp}
                style={{ 
                  border: '2px solid #2a2a40', borderRadius: 4, boxShadow: '0 10px 40px rgba(0,0,0,0.8)', 
                  cursor: isPanning ? 'grabbing' : (['platform','wall','platformBlue','platformPink','platformTimer','platformRemote','buttonBlue','buttonPink'].includes(selectedTool) ? 'crosshair' : (selectedTool === 'delete' ? 'not-allowed' : 'grab')),
                  width: WIDTH, height: HEIGHT
                }} 
              />
            </div>

            <div className="canvas-toolbar" onClick={e => e.stopPropagation()}>
              <IconButton title="Seç" className={selectedTool === 'select' ? 'active' : ''} onClick={() => setSelectedTool('select')}><MousePointer2 size={23}/></IconButton>
              <IconButton title="Fırça" className={['platform','wall'].includes(selectedTool) ? 'active' : ''} onClick={() => setSelectedTool('platform')}><Brush size={23} fill="currentColor"/></IconButton>
              <IconButton title="Silgi" className={selectedTool === 'delete' ? 'active' : ''} onClick={() => setSelectedTool('delete')}><Eraser size={23}/></IconButton>
              <div style={{ width: 1, height: 30, background: '#333', margin: '0 5px' }} />
              <IconButton title="Yakınlaştır" onClick={() => setZoom(z => Math.min(3, z + 0.2))}><ZoomIn size={22}/></IconButton>
              <IconButton title="Uzaklaştır" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut size={22}/></IconButton>
            </div>
          </div>
        </section>

        <section className={`timeline-panel panel ${timelineOpen ? '' : 'collapsed'}`}>
          <div className="timeline-title">
            Sahne / Zaman Çizelgesi / Varlıklar
            <IconButton title={timelineOpen ? 'Daralt' : 'Genişlet'} onClick={() => setTimelineOpen(!timelineOpen)}>
              {timelineOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
            </IconButton>
          </div>
          {timelineOpen && <div className="timeline-controls">
            <div className="timeline-setting">Izgara (20px Snap)</div>
            <button className="dropdown-setting" onClick={() => setGridSnap(!gridSnap)}> {gridSnap ? 'Yontanlar (20px)' : 'Serbest hareket'} <ChevronDown size={17}/></button>
            <div className="timeline-divider"/>
            <div className="layer-label">Katmanlar (Layers)</div><Toggle checked={showLayers} onChange={setShowLayers} label="Katmanları göster"/>
            {showLayers && <div className="layer-popover"><b>Platformlar</b><span>{levelData.platforms.length} nesne</span>{levelData.platforms.map((obj, i) => <button key={i} onClick={() => setSelectedIndices([i])}>{obj.isGoal ? '🚩 Hedef' : obj.isTimer ? '⏱ Zaman' : '🧱 Zemin'} ({i})</button>)}</div>}
          </div>}
        </section>

        <aside className="inspector-panel panel">
          <div className="inspector-heading">MÜFETTİŞ</div>
          <div className="inspector-scroll">
            <section className="inspector-section">
              <h3>Platform Özellikleri</h3>
              <div className="xy-row">
                <label>X <input type="number" disabled={selectedIndices.length !== 1} value={selectedPlatform ? Math.round(selectedPlatform.x) : 0} onChange={e => updateSelectedPlatform('x', Number(e.target.value))}/></label>
                <label>Y <input type="number" disabled={selectedIndices.length !== 1} value={selectedPlatform ? Math.round(selectedPlatform.y) : 0} onChange={e => updateSelectedPlatform('y', Number(e.target.value))}/></label>
              </div>
              <div className="xy-row dimensions">
                <label>Genişlik<input type="number" disabled={selectedIndices.length !== 1} value={selectedPlatform ? Math.round(selectedPlatform.w) : 0} onChange={e => updateSelectedPlatform('w', Number(e.target.value))}/></label>
                <label>Yükseklik<input type="number" disabled={selectedIndices.length !== 1} value={selectedPlatform ? Math.round(selectedPlatform.h) : 0} onChange={e => updateSelectedPlatform('h', Number(e.target.value))}/></label>
              </div>
              <div className="toggle-row"><span>Renk Değiştirsin mi?</span><Toggle checked={selectedPlatform?.changeable || false} onChange={v => updateSelectedPlatform('changeable', v)} label="Renk değiştirme"/></div>
              <div className="toggle-row"><span>Duvar (Yanlardan Çarpılır)</span><Toggle checked={selectedPlatform?.isWall || false} onChange={v => updateSelectedPlatform('isWall', v)} label="Duvar modu"/></div>
            </section>
            
            <section className="upload-section">
              <h3>PLATFORM DOKUSU (SPRITE)</h3>
              <button className="upload-zone" disabled={selectedIndices.length !== 1} onClick={() => document.getElementById('tex-input').click()}>
                {selectedPlatform?.sprite ? <img src={selectedPlatform.sprite} alt="Platform dokusu"/> : <span className="upload-button"><ImagePlus size={17}/> Görsel Yükle</span>}
              </button>
              <input id="tex-input" className="hidden-input" type="file" accept="image/*" onChange={e => readImage(e, 'texture')} disabled={selectedIndices.length !== 1}/>
            </section>

            <section className="upload-section background-section">
              <h3>ARKA PLAN RESMİ</h3>
              <button className="upload-zone" onClick={() => document.getElementById('bg-input').click()}>
                {levelData.backgroundImage ? <img src={levelData.backgroundImage} alt="Arka plan"/> : <span className="upload-button"><ImagePlus size={17}/> Görsel Yükle</span>}
              </button>
              <input id="bg-input" className="hidden-input" type="file" accept="image/*" onChange={e => readImage(e, 'background')}/>
            </section>

            <section className="inspector-section scene-settings">
              <h3>Sahne Ayarları</h3>
              <div className="toggle-row"><span>Izgara (20px Snap)</span><Toggle checked={gridSnap} onChange={setGridSnap} label="Izgaraya yasla"/></div>
              <div className="swatch-grid">
                {SWATCHES.map(color => (
                  <button key={color} title={color} className={activeColor === color ? 'current' : ''} style={{ background: color }} onClick={() => { setActiveColor(color); if (selectedPlatform) updateSelectedPlatform('customColor', color); }}/>
                ))}
              </div>
            </section>

            <section className="inspector-section object-actions">
              <h3>Seçili Varlık</h3>
              <div className="object-summary">
                {selectedIndices.length === 1 ? (
                  <><span className="summary-icon">🧱</span><span><b>Platform</b><small>{Math.round(selectedPlatform.w)} × {Math.round(selectedPlatform.h)} px</small></span></>
                ) : selectedIndices.length > 1 ? (
                  <><span className="summary-icon">📚</span><span><b>{selectedIndices.length} Nesne</b><small>Toplu seçim yapıldı</small></span></>
                ) : (
                  <span className="empty-selection">Bir nesne seçin veya soldan sahneye ekleyin.</span>
                )}
              </div>
              {selectedIndices.length > 0 && <button className="remove-object" onClick={() => { const np=levelData.platforms.filter((_,i)=>!selectedIndices.includes(i)); setLevelData({...levelData, platforms:np}); setSelectedIndices([]); }}><Trash2 size={16}/> Seçili varlıkları sil</button>}
            </section>
          </div>
        </aside>
      </main>
      
      {isTesting && <div className="test-banner"><span><Play size={13} fill="currentColor"/> Test modu açık. (P1: WASD, P2: Yön Tuşları)</span><button onClick={handleTestToggle}><X size={15}/></button></div>}
    </div>
  );
}