import React, { useCallback, useEffect, useRef, useState } from 'react';
import MobileTestControls from './components/MobileTestControls';
import {
  Activity, ArrowLeftRight, Brush, ChevronDown, ChevronUp, Copy, Eraser,
  File, ImagePlus, MousePointer2, Move, Paintbrush, Pencil, Play,
  Redo2, ScanSearch, Search, Settings, Square, Trash2, Undo2, X, SquareDashed,
  ZoomIn, ZoomOut, Save, Download, Upload
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
    { id: 'laser', label: 'Lazer', icon: '⚡', tool: 'laser' }, // ✅ YENİ
	{ id: 'lever', label: 'Kol', icon: '🎚️', tool: 'lever' }, // ✅ YENİ
    { id: 'leverTarget', label: 'Kol Hedefi', icon: '🎯', tool: 'leverTarget' }, // ✅ YENİ
	{ id: 'box', label: 'İtilir Kutu', icon: '📦', tool: 'box' }, // ✅ YENİ
    { id: 'key', label: 'Anahtar', icon: '🔑', tool: 'key' }, // ✅ YENİ
    { id: 'door', label: 'Kilitli Kapı', icon: '🚪', tool: 'door' }, // ✅ YENİ
	{ id: 'trampoline', label: 'Trambolin', icon: '🌀', tool: 'trampoline' },
    { id: 'platformMoving', label: 'Hareketli Zemin', icon: '↔️', tool: 'platformMoving' },
    { id: 'hazard', label: 'Tehlike (Diken)', icon: '🔺', tool: 'hazard' },
    { id: 'collectible', label: 'Toplanabilir', icon: '💎', tool: 'collectible' },
    { id: 'platformTimer', label: 'Zamanlayıcı', icon: '⏱️', tool: 'platformTimer' },
    { id: 'platformRemote', label: 'Uzaktan Kum.', icon: '📟', tool: 'platformRemote' },
    { id: 'buttonBlue', label: 'Mavi Buton', icon: '🔵', tool: 'buttonBlue' },
    { id: 'buttonPink', label: 'Pembe Buton', icon: '🩷', tool: 'buttonPink' },
  ]},
  { section: 'OBJELER', items: [
    { id: 'goal', label: 'Hedef Koy', icon: '🎯', tool: 'goal' },
  ]},
];

const getResizeHandles = (p) => [
  { id: 'nw', x: p.x, y: p.y },
  { id: 'n', x: p.x + p.w / 2, y: p.y },
  { id: 'ne', x: p.x + p.w, y: p.y },
  { id: 'w', x: p.x, y: p.y + p.h / 2 },
  { id: 'e', x: p.x + p.w, y: p.y + p.h / 2 },
  { id: 'sw', x: p.x, y: p.y + p.h },
  { id: 's', x: p.x + p.w / 2, y: p.y + p.h },
  { id: 'se', x: p.x + p.w, y: p.y + p.h },
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
	
  const [leverColor, setLeverColor] = useState('green'); // ✅ YENİ
  const LEVER_COLORS = [
	  { id: 'green', color: '#22c55e', label: '🟢 Yeşil' },
	  { id: 'red', color: '#ef4444', label: '🔴 Kırmızı' },
	  { id: 'blue', color: '#3b82f6', label: '🔵 Mavi' },
	  { id: 'yellow', color: '#eab308', label: '🟡 Sarı' },
	  { id: 'purple', color: '#a855f7', label: '🟣 Mor' },
];

  const [resizeTarget, setResizeTarget] = useState(null); // ✅ YENİ: Boyutlandırma
	
  const [levels, setLevels] = useState(() => {
    const saved = localStorage.getItem('love-game-levels');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [{ name: 'Seviye 1', data: DEFAULT_LEVEL }];
  });
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  const [editorState, setEditorState] = useState({ history: [levels[0].data], index: 0, live: levels[0].data });
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedIndices, setSelectedIndices] = useState([]);
  
  // ✅ YENİ: Grid Size State (20 yerine değiştirilebilir)
  const [gridSize, setGridSize] = useState(20);
  const [gridSnap, setGridSnap] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  // ✅ YENİ: Smart Guides (Hizalama Çizgileri) State
  const [guides, setGuides] = useState({ v: [], h: [] });

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
  const lastTimeRef = useRef(performance.now());

  const [testState, setTestState] = useState(null);
  const testKeysRef = useRef({});

  const levelData = editorState.live;
  const selectedPlatform = selectedIndices.length === 1 ? levelData.platforms[selectedIndices[0]] : null;

  useEffect(() => {
    const newLevels = [...levels];
    newLevels[currentLevelIndex].data = levelData;
    setLevels(newLevels);
    localStorage.setItem('love-game-levels', JSON.stringify(newLevels));
  }, [levelData, currentLevelIndex]);

  useEffect(() => { if (!isDragging) levelRef.current = levelData; }, [levelData, isDragging]);
  
    // ✅ YENİ: İki parmakla yakınlaştırma/uzaklaştırma (Pinch Zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let initialDist = 0;
    let initialZoom = 1;
    let initialPan = { x: 0, y: 0 };
    let initialCenter = { x: 0, y: 0 };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        isPinchingRef.current = true;
        const [t1, t2] = e.touches;
        initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialZoom = zoomRef.current;
        initialPan = { ...panRef.current };
        initialCenter = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        e.preventDefault();
      }
    };

    const onTouchMove = (e) => {
      if (isPinchingRef.current && e.touches.length === 2) {
        e.preventDefault();
        const [t1, t2] = e.touches;
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        
        const zoomFactor = dist / initialDist;
        const newZoom = Math.min(Math.max(0.2, initialZoom * zoomFactor), 3);
        setZoom(newZoom);
        
        const panDeltaX = center.x - initialCenter.x;
        const panDeltaY = center.y - initialCenter.y;
        setPan({ x: initialPan.x + panDeltaX, y: initialPan.y + panDeltaY });
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

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
        if (selectedIndices.length > 0) clipboardRef.current = selectedIndices.map(i => ({ ...levelData.platforms[i] }));
      }
      else if (isMod && key === 'v') {
        if (clipboardRef.current.length > 0) {
          const newPlatforms = clipboardRef.current.map(p => ({ ...p, x: p.x + gridSize, y: p.y + gridSize }));
          const newLevel = { ...levelData, platforms: [...levelData.platforms, ...newPlatforms] };
          setLevelData(newLevel);
          const newIndices = [];
          for (let i = 0; i < newPlatforms.length; i++) newIndices.push(levelData.platforms.length + i);
          setSelectedIndices(newIndices);
          clipboardRef.current = clipboardRef.current.map(p => ({ ...p, x: p.x + gridSize, y: p.y + gridSize }));
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
  }, [isTesting, selectedIndices, levelData, undo, redo, setLevelData, gridSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let rafId;
    const loop = (time) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = time;

      if (isTesting && testState) {
        update(testState, testKeysRef.current, dt, testControlledPlayerRef.current, true);
        renderWorld(ctx, testState);
      } else {
        const renderState = { ...levelData, players: [], time: performance.now() / 1000 };
        renderEditor(ctx, renderState, drawStart, drawCurrent, gridSnap, gridSize);
        
        selectedIndices.forEach(idx => {
          const p = levelData.platforms[idx];
          if (p) {
            ctx.strokeStyle = '#72dcff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
            ctx.setLineDash([]);

            if (selectedIndices.length === 1) {
              const handles = getResizeHandles(p);
              handles.forEach(h => {
                ctx.fillStyle = '#72dcff';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.fillRect(h.x - 5, h.y - 5, 10, 10);
                ctx.strokeRect(h.x - 5, h.y - 5, 10, 10);
              });
            }
          }
        });

        if (guides.v.length > 0 || guides.h.length > 0) {
          ctx.strokeStyle = '#ff4757';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          
          guides.v.forEach(x => {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
          });
          guides.h.forEach(y => {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
          });
          ctx.setLineDash([]);
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [levelData, drawStart, drawCurrent, selectedIndices, gridSnap, gridSize, isTesting, testState, guides]);

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
    setZoom(z => Math.min(Math.max(0.2, z + -e.deltaY * 0.001), 3));
  };

  const getGridCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    if (gridSnap) return { x: Math.floor(rawX / gridSize) * gridSize, y: Math.floor(rawY / gridSize) * gridSize };
    return { x: Math.round(rawX), y: Math.round(rawY) };
  };

  const onPointerDown = (e) => {
    if (isPinchingRef.current) return;
	if (isTesting) return;
    if (isPanning || e.button === 1) {
      e.preventDefault();
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setIsPanning(true);
      return;
    }

    const { x, y } = getGridCoords(e);
	
    if (selectedTool === 'select' && selectedIndices.length === 1) {
      const p = levelData.platforms[selectedIndices[0]];
      if (p) {
        const handles = getResizeHandles(p);
        const hitSize = 12;
        for (const h of handles) {
          if (Math.abs(x - h.x) <= hitSize && Math.abs(y - h.y) <= hitSize) {
            setResizeTarget({
              index: selectedIndices[0],
              handle: h.id,
              startX: x, startY: y,
              origX: p.x, origY: p.y, origW: p.w, origH: p.h
            });
            return;
          }
        }
      }
    }

    if (selectedTool === 'select') {
      const index = levelData.platforms.findIndex(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
      const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
      
      if (index !== -1) {
        let newIndices;
        if (isMultiSelect) {
          newIndices = selectedIndices.includes(index) ? selectedIndices.filter(i => i !== index) : [...selectedIndices, index];
        } else {
          newIndices = selectedIndices.includes(index) ? selectedIndices : [index];
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
        setDragTarget({ type: 'blueSpawn' }); setDragOffset({ x: x - b.x, y: y - b.y }); setIsDragging(true); didDragRef.current = false; return;
      }
      const p = levelData.pinkSpawn;
      if (x >= p.x && x <= p.x + 40 && y >= p.y && y <= p.y + 40) {
        setDragTarget({ type: 'pinkSpawn' }); setDragOffset({ x: x - p.x, y: y - p.y }); setIsDragging(true); didDragRef.current = false; return;
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
	
    if (selectedTool === 'box' || selectedTool === 'key' || selectedTool === 'door') {
       let w = 40, h = 40;
       if (selectedTool === 'door') h = 80;
       if (selectedTool === 'key') { w = 20; h = 20; }
       
       const newPlatform = { x, y, w, h, brackets: false };
       if (selectedTool === 'box') { newPlatform.isBox = true; newPlatform.color = 'platformNeutral'; }
       if (selectedTool === 'key') { newPlatform.isKey = true; }
       if (selectedTool === 'door') { newPlatform.isDoor = true; newPlatform.color = 'platformNeutral'; }
       
       const newPlatforms = [...levelData.platforms, newPlatform];
       setLevelData({ ...levelData, platforms: newPlatforms });
       return;
    }
	
    if (selectedTool === 'lever' || selectedTool === 'leverTarget') {
      const w = selectedTool === 'lever' ? 30 : 100;
      const h = selectedTool === 'lever' ? 60 : 20;
      const newPlatform = { 
        x, y, w, h, brackets: false,
        leverColor: leverColor,
		color: 'platformNeutral'
      };
      if (selectedTool === 'lever') newPlatform.isLever = true;
      if (selectedTool === 'leverTarget') {
        newPlatform.isLeverTarget = true;
        newPlatform.moveRange = 100;
      }
      const newPlatforms = [...levelData.platforms, newPlatform];
      setLevelData({ ...levelData, platforms: newPlatforms });
      return;
    }

    if (['platform', 'wall', 'platformBlue', 'platformPink', 'platformTimer', 'platformRemote', 'buttonBlue', 'buttonPink', 'platformMoving', 'hazard', 'collectible', 'trampoline', 'laser'].includes(selectedTool)) {
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
	
    if (resizeTarget) {
      const { handle, startX, startY, origX, origY, origW, origH, index } = resizeTarget;
      const dx = x - startX;
      const dy = y - startY;
      let newX = origX, newY = origY, newW = origW, newH = origH;
      const minSize = gridSnap ? gridSize : 10;

      if (handle.includes('e')) newW = Math.max(minSize, origW + dx);
      if (handle.includes('s')) newH = Math.max(minSize, origH + dy);
      if (handle.includes('w')) { newW = Math.max(minSize, origW - dx); newX = origX + origW - newW; }
      if (handle.includes('n')) { newH = Math.max(minSize, origH - dy); newY = origY + origH - newH; }

      if (gridSnap) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
        newW = Math.max(gridSize, Math.round(newW / gridSize) * gridSize);
        newH = Math.max(gridSize, Math.round(newH / gridSize) * gridSize);
      }

      const newPlatforms = [...levelRef.current.platforms];
      newPlatforms[index] = { ...newPlatforms[index], x: newX, y: newY, w: newW, h: newH };
      const newLevel = { ...levelRef.current, platforms: newPlatforms };
      levelRef.current = newLevel;
      setLevelData(newLevel, { commit: false });
      return;
    }

    if (isDragging && dragTarget) {
      didDragRef.current = true;
      let newLevel = { ...levelRef.current };
      setGuides({ v: [], h: [] });

      if (dragTarget.type === 'platforms') {
        const dx = x - dragOffset.x;
        const dy = y - dragOffset.y;
        const newPlatforms = [...newLevel.platforms];
        let primaryIndex = dragTarget.indices[0];

        dragTarget.indices.forEach(idx => {
          const startPos = dragStartPositionsRef.current[idx];
          if (startPos) {
            let newX = startPos.x + dx;
            let newY = startPos.y + dy;
            if (gridSnap) {
              newX = Math.round(newX / gridSize) * gridSize;
              newY = Math.round(newY / gridSize) * gridSize;
            }
            newPlatforms[idx] = { ...newPlatforms[idx], x: newX, y: newY };
          }
        });

        const primaryP = newPlatforms[primaryIndex];
        const threshold = 5;
        let vGuides = [];
        let hGuides = [];

        if (Math.abs((primaryP.x + primaryP.w / 2) - WIDTH / 2) < threshold) vGuides.push(WIDTH / 2);
        if (Math.abs((primaryP.y + primaryP.h / 2) - HEIGHT / 2) < threshold) hGuides.push(HEIGHT / 2);

        newLevel.platforms.forEach((plat, i) => {
          if (dragTarget.indices.includes(i)) return;

          if (Math.abs(primaryP.x - plat.x) < threshold) vGuides.push(plat.x);
          if (Math.abs((primaryP.x + primaryP.w) - (plat.x + plat.w)) < threshold) vGuides.push(plat.x + plat.w);
          if (Math.abs((primaryP.x + primaryP.w / 2) - (plat.x + plat.w / 2)) < threshold) vGuides.push(plat.x + plat.w / 2);

          if (Math.abs(primaryP.y - plat.y) < threshold) hGuides.push(plat.y);
          if (Math.abs((primaryP.y + primaryP.h) - (plat.y + plat.h)) < threshold) hGuides.push(plat.y + plat.h);
          if (Math.abs((primaryP.y + primaryP.h / 2) - (plat.y + plat.h / 2)) < threshold) hGuides.push(plat.y + plat.h / 2);
        });

        setGuides({ v: [...new Set(vGuides)], h: [...new Set(hGuides)] });
        newLevel.platforms = newPlatforms;
      } else if (dragTarget.type === 'blueSpawn') {
        let newX = x - dragOffset.x, newY = y - dragOffset.y;
        if (gridSnap) { newX = Math.round(newX / gridSize) * gridSize; newY = Math.round(newY / gridSize) * gridSize; }
        newLevel.blueSpawn = { x: newX, y: newY };
      } else if (dragTarget.type === 'pinkSpawn') {
        let newX = x - dragOffset.x, newY = y - dragOffset.y;
        if (gridSnap) { newX = Math.round(newX / gridSize) * gridSize; newY = Math.round(newY / gridSize) * gridSize; }
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
    setGuides({ v: [], h: [] });
	
    if (resizeTarget) {
      setLevelData(levelRef.current, { commit: true });
      setResizeTarget(null);
      return;
    }
    
    if (isPanning) { if (!e.code || e.code !== 'Space') setIsPanning(false); return; }
    if (isDragging) {
      if (didDragRef.current) setLevelData(levelRef.current, { commit: true });
      didDragRef.current = false; setIsDragging(false); setDragTarget(null); return;
    }

    if (!drawStart || !drawCurrent) return;
    const isClick = drawStart.x === drawCurrent.x && drawStart.y === drawCurrent.y;

    if (isClick) {
      if (['buttonBlue', 'buttonPink', 'hazard', 'collectible', 'key'].includes(selectedTool)) {
        setDrawCurrent({ x: drawStart.x + 20, y: drawStart.y + 20 });
      } else if (selectedTool === 'door') {
        setDrawCurrent({ x: drawStart.x + 40, y: drawStart.y + 80 });
      } else if (selectedTool === 'box') {
        setDrawCurrent({ x: drawStart.x + 40, y: drawStart.y + 40 });
      } else if (selectedTool === 'laser') {
        setDrawCurrent({ x: drawStart.x + 100, y: drawStart.y + 20 });
      } else { setDrawStart(null); setDrawCurrent(null); return; }
    }

    const x = Math.min(drawStart.x, drawCurrent.x); const y = Math.min(drawStart.y, drawCurrent.y);
    let w = Math.abs(drawCurrent.x - drawStart.x); let h = Math.abs(drawCurrent.y - drawStart.y);
    
    if (isClick && ['buttonBlue', 'buttonPink'].includes(selectedTool)) { w = 40; h = 20; } 
    else if (isClick && ['hazard', 'collectible'].includes(selectedTool)) { w = 20; h = 20; }
    else { w = Math.max(gridSnap ? gridSize : 4, w); h = Math.max(gridSnap ? gridSize : 4, h); }

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
      case 'trampoline': newPlatform.color = 'platformNeutral'; newPlatform.isTrampoline = true; newPlatform.isWall = false; break;
      case 'platformMoving': newPlatform.color = 'platformNeutral'; newPlatform.isMoving = true;  newPlatform.moveAxis = 'x'; newPlatform.moveSpeed = 2; newPlatform.moveRange = 100; break;
      case 'hazard': newPlatform.isHazard = true; break;
      case 'collectible': newPlatform.isCollectible = true; newPlatform.collected = false; break;
      case 'box': newPlatform.isBox = true; newPlatform.color = 'platformNeutral'; break;
      case 'key': newPlatform.isKey = true; break;
      case 'door': newPlatform.isDoor = true; newPlatform.color = 'platformNeutral'; break;
      case 'laser': newPlatform.isLaser = true; newPlatform.isMoving = true; newPlatform.moveAxis = 'x'; newPlatform.moveSpeed = 2;
        newPlatform.moveRange = 150;
        break;
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

  const moveLayer = (action) => {
    if (selectedIndices.length !== 1) return;
    const idx = selectedIndices[0];
    const newPlatforms = [...levelData.platforms];
    const item = newPlatforms[idx];

    if (action === 'front') {
      newPlatforms.splice(idx, 1);
      newPlatforms.push(item);
      setSelectedIndices([newPlatforms.length - 1]);
    } else if (action === 'back') {
      newPlatforms.splice(idx, 1);
      newPlatforms.unshift(item);
      setSelectedIndices([0]);
    } else if (action === 'up') {
      if (idx < newPlatforms.length - 1) {
        newPlatforms[idx] = newPlatforms[idx + 1];
        newPlatforms[idx + 1] = item;
        setSelectedIndices([idx + 1]);
      }
    } else if (action === 'down') {
      if (idx > 0) {
        newPlatforms[idx] = newPlatforms[idx - 1];
        newPlatforms[idx - 1] = item;
        setSelectedIndices([idx - 1]);
      }
    }
    
    setLevelData({ ...levelData, platforms: newPlatforms });
  };
  
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 1024;
  });
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = () => setIsMobile(mq.matches || window.innerWidth <= 1024);
    mq.addEventListener?.('change', handler);
    window.addEventListener('resize', handler);
    return () => { mq.removeEventListener?.('change', handler); window.removeEventListener('resize', handler); };
  }, []);

  const [testControlledPlayer, setTestControlledPlayer] = useState('BOTH');
  const testControlledPlayerRef = useRef('BOTH');

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  const isPinchingRef = useRef(false);

  const handleAddLevel = () => {
    const newLevels = [...levels, { name: `Seviye ${levels.length + 1}`, data: JSON.parse(JSON.stringify(DEFAULT_LEVEL)) }];
    setLevels(newLevels);
    setCurrentLevelIndex(newLevels.length - 1);
    setEditorState({ history: [newLevels[newLevels.length - 1].data], index: 0, live: newLevels[newLevels.length - 1].data });
    setSelectedIndices([]);
  };

  const handleDeleteLevel = () => {
    if (levels.length <= 1) return alert("Son seviyeyi silemezsiniz.");
    if (!window.confirm("Bu seviyeyi silmek istediğinize emin misiniz?")) return;
    
    const newLevels = levels.filter((_, i) => i !== currentLevelIndex);
    setLevels(newLevels);
    const nextIdx = Math.max(0, currentLevelIndex - 1);
    setCurrentLevelIndex(nextIdx);
    setEditorState({ history: [newLevels[nextIdx].data], index: 0, live: newLevels[nextIdx].data });
    setSelectedIndices([]);
  };

  const handleSelectLevel = (idx) => {
    setCurrentLevelIndex(idx);
    setEditorState({ history: [levels[idx].data], index: 0, live: levels[idx].data });
    setSelectedIndices([]);
  };

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(levelData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${levels[currentLevelIndex].name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const uploadJSON = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = e.target.result;
        text = text.replace(/\/\/.*$/gm, '');
        text = text.replace(/,\s*([\]}])/g, '$1');

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          if (!text.trim().startsWith('{')) {
            text = '{' + text + '}';
            parsed = JSON.parse(text);
          } else {
            throw err;
          }
        }

        if (parsed.platforms) {
          const newPlatforms = [...parsed.platforms];

          if (parsed.levers && Array.isArray(parsed.levers)) {
            parsed.levers.forEach(l => {
              newPlatforms.push({
                x: l.x, y: l.y, w: 30, h: 60,
                isLever: true, leverColor: l.type || 'green',
                color: 'platformNeutral', brackets: false
              });
            });
          }

          if (parsed.gems && Array.isArray(parsed.gems)) {
            parsed.gems.forEach(g => {
              newPlatforms.push({
                x: g.x, y: g.y, w: 20, h: 20,
                isCollectible: true, color: g.type === 'blue' ? 'platformBlue' : 'platformPink',
                brackets: false
              });
            });
          }

          const finalLevel = {
            platforms: newPlatforms,
            blueSpawn: parsed.blueSpawn || parsed.blue || { x: 100, y: 360 },
            pinkSpawn: parsed.pinkSpawn || parsed.redSpawn || parsed.pink || { x: 160, y: 360 },
            backgroundImage: parsed.backgroundImage || null
          };

          setLevelData(finalLevel, { commit: true });
        } else {
          alert("Geçersiz seviye dosyası: 'platforms' dizisi bulunamadı!");
        }
      } catch (err) { 
        alert("Dosya okunamadı. JSON formatı hatalı olabilir.\nHata: " + err.message); 
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const readImage = (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (kind === 'texture') {
        updateSelectedPlatform('sprite', String(reader.result));
      } else {
        setLevelData({ ...levelData, backgroundImage: String(reader.result) }, { commit: true });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleTestToggle = () => {
    if (isTesting) { setIsTesting(false); setTestState(null); testKeysRef.current = {}; } 
    else { 
      testKeysRef.current = {}; 
      setIsPanning(false);
      lastTimeRef.current = performance.now();
      const initialPlayer = isMobile ? 'P1' : 'BOTH';
      testControlledPlayerRef.current = initialPlayer;
      setTestControlledPlayer(initialPlayer);
      setTestState(createState(levelData, { p1: 'platformBlue', p2: 'platformPink' }, true)); 
      setIsTesting(true); 
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar panel">
        <div className="brand-area">
          <div className="avatar"><span>👨🏻‍💻</span></div>
          <div className="brand-mark"><span className="crossed-tools">⚒</span><strong>LEVEL EDITOR</strong><span className="version">v0.0.1</span></div>
        </div>
        <div className="header-actions">
          <button className={`test-button ${isTesting ? 'is-testing' : ''}`} onClick={handleTestToggle}><Play size={19} fill="currentColor" /> {isTesting ? 'TESTİ DURDUR' : 'TEST ET'}</button>
          <button className="top-action" onClick={undo} disabled={editorState.index === 0}><Undo2 size={20} /> Geri Al</button>
          <button className="top-action muted" onClick={redo} disabled={editorState.index >= editorState.history.length - 1}><Redo2 size={20} /> İleri Al</button>
          <button className="json-button" onClick={downloadJSON}><Download size={18} /> İndir</button>
          <label className="json-button" style={{cursor: 'pointer'}}>
            <Upload size={18} /> Yükle
            <input type="file" accept=".json" onChange={uploadJSON} style={{display: 'none'}} />
          </label>
        </div>
        <div className="top-tools">
          {searchOpen && <div className="quick-search"><Search size={15}/><input autoFocus value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Nesne ara..." /></div>}
          <IconButton title="Ara" onClick={() => setSearchOpen(v => !v)}><Search size={24}/></IconButton>
        </div>
      </header>

      <main className="editor-layout">
        <nav className="tool-rail panel" aria-label="Araçlar">
          <div className="rail-tools">
            <IconButton title="Seç / Taşı" className={selectedTool === 'select' ? 'active' : ''} onClick={() => setSelectedTool('select')}><MousePointer2 size={23}/></IconButton>
            <IconButton title="Sil" className={selectedTool === 'delete' ? 'active' : ''} onClick={() => setSelectedTool('delete')}><Move size={22}/></IconButton>
          </div>
        </nav>

        <aside className="asset-panel panel">
          <div style={{ padding: '0 0 15px 0', borderBottom: '1px solid #2a2a40', marginBottom: 15 }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <select 
                value={currentLevelIndex} 
                onChange={(e) => handleSelectLevel(Number(e.target.value))}
                style={{ flex: 1, padding: '8px', background: '#1a1a2e', color: '#fff', border: '1px solid #333', borderRadius: 4 }}
              >
                {levels.map((lvl, i) => <option key={i} value={i}>{lvl.name}</option>)}
              </select>
              <button onClick={handleAddLevel} title="Yeni Seviye" style={{ padding: '8px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>+</button>
              <button onClick={handleDeleteLevel} title="Seviyeyi Sil" style={{ padding: '8px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><Trash2 size={16}/></button>
            </div>
          </div>

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
        </aside>

        <section className={`stage-panel panel ${isTesting ? 'testing' : ''}`} aria-label="Sahne çalışma alanı">
          <div className="ruler ruler-top"><div /></div>
          <div className="ruler ruler-left"><div /></div>
          
          <div 
            className={`stage-grid ${gridSnap ? '' : 'no-snap'} ${isPanning ? 'panning' : ''}`}
            onWheel={handleWheel}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            <div style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'
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
                  cursor: isPanning ? 'grabbing' : (['platform','wall','platformBlue','platformPink','platformTimer','platformRemote','buttonBlue','buttonPink','platformMoving','hazard','collectible','trampoline','box','key','door','lever','leverTarget','laser'].includes(selectedTool) ? 'crosshair' : (selectedTool === 'delete' ? 'not-allowed' : 'grab')),
                  maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', aspectRatio: `${WIDTH}/${HEIGHT}`
                }} 
              />
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
            <div className="timeline-setting">Izgara</div>
            <button className="dropdown-setting" onClick={() => setGridSnap(!gridSnap)}> {gridSnap ? 'Açık' : 'Kapalı'} <ChevronDown size={17}/></button>
            <select 
              value={gridSize} 
              onChange={(e) => setGridSize(Number(e.target.value))}
              style={{ padding: '8px', background: '#1a1a2e', color: '#fff', border: '1px solid #333', borderRadius: 6, marginLeft: 5 }}
            >
              <option value={10}>10px</option>
              <option value={20}>20px</option>
              <option value={40}>40px</option>
            </select>
            <div className="timeline-divider"/>
            <div className="layer-label">Katmanlar (Layers)</div><Toggle checked={showLayers} onChange={setShowLayers} label="Katmanları göster"/>
            
          </div>}
        </section>

        <aside className="inspector-panel panel">
          <div className="inspector-heading">INSPECTOR</div>
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

              {selectedIndices.length === 1 && (
                <div style={{ marginTop: 15, marginBottom: 15, padding: 10, background: '#13131f', borderRadius: 6, border: '1px solid #2a2a40' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#b388ff', fontSize: 12, textAlign: 'center' }}>Katman Sırası (Z-Index)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    <button onClick={() => moveLayer('front')} style={{ padding: 6, background: '#2a2a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>⬆️ En Öne</button>
                    <button onClick={() => moveLayer('back')} style={{ padding: 6, background: '#2a2a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>⬇️ En Arkaya</button>
                    <button onClick={() => moveLayer('up')} style={{ padding: 6, background: '#2a2a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>🔼 Bir Öne</button>
                    <button onClick={() => moveLayer('down')} style={{ padding: 6, background: '#2a2a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>🔽 Bir Arkaya</button>
                  </div>
                </div>
              )}

              <div className="toggle-row"><span>Renk Değiştirsin mi?</span><Toggle checked={selectedPlatform?.changeable || false} onChange={v => updateSelectedPlatform('changeable', v)} label="Renk değiştirme"/></div>
              <div className="toggle-row"><span>Duvar (Yanlardan Çarpılır)</span><Toggle checked={selectedPlatform?.isWall || false} onChange={v => updateSelectedPlatform('isWall', v)} label="Duvar modu"/></div>
              <div className="toggle-row"><span>Kırılabilir mi?</span><Toggle checked={selectedPlatform?.isBreakable || false} onChange={v => updateSelectedPlatform('isBreakable', v)} label="Kırılabilir platform"/></div>
            
              {selectedPlatform && (selectedPlatform.isLever || selectedPlatform.isLeverTarget) && (
                <div style={{ marginTop: 15, padding: 10, background: '#13131f', borderRadius: 6, border: '1px solid #2a2a40' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#f1c40f', fontSize: 13 }}>🎨 Renk Seçimi</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {LEVER_COLORS.map(lc => (
                      <button
                        key={lc.id}
                        onClick={() => updateSelectedPlatform('leverColor', lc.id)}
                        title={lc.label}
                        style={{
                          width: 40, height: 40, borderRadius: 6, background: lc.color,
                          border: selectedPlatform.leverColor === lc.id ? '3px solid #fff' : '2px solid #333',
                          cursor: 'pointer',
                          boxShadow: selectedPlatform.leverColor === lc.id ? `0 0 15px ${lc.color}` : 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* ✅ YENİ: Kol başlangıç yönü */}
                  {selectedPlatform.isLever && (
                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ margin: '0 0 8px', color: '#f1c40f', fontSize: 12 }}>Başlangıç Yönü</h4>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          onClick={() => updateSelectedPlatform('leverState', 0)} 
                          style={{ 
                            flex: 1, padding: '8px', 
                            background: (selectedPlatform.leverState || 0) === 0 ? '#3498db' : '#2a2a40', 
                            color: '#fff', border: '1px solid #333', borderRadius: 4, 
                            cursor: 'pointer', fontWeight: 'bold', fontSize: 12 
                          }}
                        >
                          ← Sola Eğik
                        </button>
                        <button 
                          onClick={() => updateSelectedPlatform('leverState', 1)} 
                          style={{ 
                            flex: 1, padding: '8px', 
                            background: selectedPlatform.leverState === 1 ? '#3498db' : '#2a2a40', 
                            color: '#fff', border: '1px solid #333', borderRadius: 4, 
                            cursor: 'pointer', fontWeight: 'bold', fontSize: 12 
                          }}
                        >
                          Sağa Eğik →
                        </button>
                      </div>
                    </div>
                  )}

                  <p style={{ fontSize: 11, color: '#888', marginTop: 8, marginBottom: 0 }}>
                    Aynı renkteki kol ve hedef platform birbirine bağlıdır.
                  </p>
                </div>
              )}

              {selectedPlatform?.isLeverTarget && (
                <div style={{ marginTop: 15, padding: 10, background: '#1e1333', borderRadius: 6, border: '1px solid #b388ff' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#b388ff', fontSize: 13 }}>Hareket Aralığı</h4>
                  <label style={{ fontSize: 11, color: '#ccc' }}>Maksimum Mesafe: ±{selectedPlatform.moveRange || 100}px</label>
                  <input 
                    type="range" min="20" max="300" step="20" 
                    value={selectedPlatform.moveRange || 100} 
                    onChange={e => updateSelectedPlatform('moveRange', Number(e.target.value))} 
                    style={{ width: '100%' }} 
                  />
                </div>
              )}
			  
              {selectedPlatform?.isMoving && (
                <div style={{ marginTop: 15, padding: 10, background: '#1e1333', borderRadius: 6, border: '1px solid #b388ff' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#b388ff', fontSize: 13 }}>Hareket Ayarları</h4>
                  <div className="toggle-row">
                    <span>Eksen (X / Y)</span>
                    <button 
                      onClick={() => updateSelectedPlatform('moveAxis', selectedPlatform.moveAxis === 'x' ? 'y' : 'x')}
                      style={{ padding: '4px 10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {selectedPlatform.moveAxis === 'x' ? 'Yatay (X)' : 'Dikey (Y)'}
                    </button>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 11, color: '#ccc' }}>Hız: {selectedPlatform.moveSpeed || 2}</label>
                    <input type="range" min="0.5" max="5" step="0.5" value={selectedPlatform.moveSpeed || 2} onChange={e => updateSelectedPlatform('moveSpeed', Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <label style={{ fontSize: 11, color: '#ccc' }}>Mesafe: {selectedPlatform.moveRange || 100}px</label>
                    <input type="range" min="20" max="300" step="20" value={selectedPlatform.moveRange || 100} onChange={e => updateSelectedPlatform('moveRange', Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>
              )}
            </section>
            
            <section className="upload-section">
              <h3>PLATFORM DOKUSU (SPRITE)</h3>
              <button className="upload-zone" disabled={selectedIndices.length !== 1} onClick={() => document.getElementById('tex-input').click()}>
                {selectedPlatform?.sprite ? <img src={selectedPlatform.sprite} alt="Platform dokusu"/> : <span className="upload-button"><ImagePlus size={17}/> Görsel Yükle</span>}
              </button>
              <input id="tex-input" className="hidden-input" type="file" accept="image/*" onChange={e => readImage(e, 'texture')} disabled={selectedIndices.length !== 1}/>
			  
              {/* ✅ YENİ: Dokuyu Kaldır Butonu */}
              {selectedPlatform?.sprite && (
                <button 
                  onClick={() => updateSelectedPlatform('sprite', null)}
                  style={{ 
                    width: '100%', marginTop: 8, padding: 8, 
                    background: '#2a1518', color: '#e74c3c', 
                    border: '1px solid #e74c3c', borderRadius: 6, 
                    cursor: 'pointer', fontSize: 12, fontWeight: 'bold' 
                  }}
                >
                  🗑️ Dokuyu Kaldır
                </button>
              )}
            </section>

            <section className="upload-section background-section">
              <h3>ARKA PLAN RESMİ</h3>
              <button className="upload-zone" onClick={() => document.getElementById('bg-input').click()}>
                {levelData.backgroundImage ? <img src={levelData.backgroundImage} alt="Arka plan"/> : <span className="upload-button"><ImagePlus size={17}/> Görsel Yükle</span>}
              </button>
              <input id="bg-input" className="hidden-input" type="file" accept="image/*" onChange={e => readImage(e, 'background')}/>
			  
              {/* ✅ YENİ: Arka Planı Kaldır Butonu */}
              {levelData.backgroundImage && (
                <button 
                  onClick={() => setLevelData({ ...levelData, backgroundImage: null }, { commit: true })}
                  style={{ 
                    width: '100%', marginTop: 8, padding: 8, 
                    background: '#2a1518', color: '#e74c3c', 
                    border: '1px solid #e74c3c', borderRadius: 6, 
                    cursor: 'pointer', fontSize: 12, fontWeight: 'bold' 
                  }}
                >
                  🗑️ Arka Planı Kaldır
                </button>
              )}
            </section>

            <section className="inspector-section scene-settings">
              <h3>Sahne Ayarları</h3>
              <div className="toggle-row"><span>Izgara (Snap)</span><Toggle checked={gridSnap} onChange={setGridSnap} label="Izgaraya yasla"/></div>
              
              <div style={{ marginTop: 15 }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: 8 }}>RENK PALETİ (Toplu Seçim Destekli)</span>
                <div className="swatch-grid">
                  {SWATCHES.map(color => (
                    <button key={color} title={color} className={activeColor === color ? 'current' : ''} style={{ background: color }} onClick={() => {
                      setActiveColor(color);
                      if (selectedIndices.length > 0) {
                        const newPlatforms = [...levelData.platforms];
                        selectedIndices.forEach(i => {
                          newPlatforms[i] = { ...newPlatforms[i], customColor: color };
                        });
                        setLevelData({ ...levelData, platforms: newPlatforms });
                      }
                    }}/>
                  ))}
                </div>
              </div>
            </section>

            <section className="inspector-section object-actions" style={{ marginTop: 1, paddingTop: 1 }}>
              {showLayers && (
                <div style={{ 
                  marginTop: 15, 
                  padding: 12, 
                  background: '#1b2943', 
                  border: '1px solid #6b84b7', 
                  borderRadius: 8,
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 6 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <b style={{ color: '#fff', fontSize: 13 }}>Platformlar</b>
                    <span style={{ color: '#9aa9c6', fontSize: 12 }}>{levelData.platforms.length} nesne</span>
                  </div>
                  
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {levelData.platforms.map((obj, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSelectedIndices([i])} 
                        style={{ 
                          padding: '6px 8px', 
                          background: selectedIndices.includes(i) ? '#3498db' : '#253650', 
                          border: '1px solid #3d557c', 
                          borderRadius: 4, 
                          color: '#fff', 
                          textAlign: 'left', 
                          cursor: 'pointer',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>{obj.isGoal ? '🚩' : obj.isTimer ? '⏱' : obj.isBox ? '📦' : obj.isLaser ? '⚡' : '🧱'}</span>
                        <span style={{ flex: 1 }}>{obj.isGoal ? 'Hedef' : obj.isTimer ? 'Zamanlayıcı' : obj.isBox ? 'Kutu' : obj.isLaser ? 'Lazer' : 'Zemin'}</span>
                        <span style={{ color: '#888', fontSize: 10 }}>#{i}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <h3>Seçili Varlık</h3>
              <div className="object-summary">
                {selectedIndices.length === 1 ? (
                  <><span className="summary-icon">{selectedPlatform.isHazard ? '🔺' : selectedPlatform.isCollectible ? '💎' : selectedPlatform.isMoving ? '↔️' : '🧱'}</span><span><b>{selectedPlatform.isHazard ? 'Tehlike' : selectedPlatform.isCollectible ? 'Toplanabilir' : selectedPlatform.isMoving ? 'Hareketli Zemin' : 'Platform'}</b><small>{Math.round(selectedPlatform.w)} × {Math.round(selectedPlatform.h)} px</small></span></>
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
      
      {isTesting && isMobile && (
        <MobileTestControls
          player={testControlledPlayer}
          setPlayer={setTestControlledPlayer}
          playerRef={testControlledPlayerRef}
          testKeysRef={testKeysRef}
        />
      )}
	  
      {isTesting && <div className="test-banner"><span><Play size={13} fill="currentColor"/> Test modu açık. {isMobile ? '(Joystick ile kontrol et)' : '(P1: WASD, P2: Yön Tuşları)'}</span><button onClick={handleTestToggle}><X size={15}/></button></div>}
    </div>
  );
}