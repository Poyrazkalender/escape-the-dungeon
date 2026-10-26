import { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import LevelEditor from './components/LevelEditor';
import { LEVELS as INITIAL_LEVELS } from './game/levels';

const FIXED_CHARACTERS = { p1: 'platformBlue', p2: 'platformPink' };

export default function App() {
  const [screen, setScreen] = useState('menu'); 
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? (window.innerWidth <= 1024 || navigator.maxTouchPoints > 0) : false);
  
  const [characters, setCharacters] = useState({ p1: 'platformBlue', p2: 'platformPink' });
  const [roomId, setRoomId] = useState('');
  
  const [selectedTool, setSelectedTool] = useState('changeable');
  const [customColor, setCustomColor] = useState('#ff5733');
  const [customSprite, setCustomSprite] = useState(null);
  const [customSpriteTouched, setCustomSpriteTouched] = useState(null);
  
  const [levelsList, setLevelsList] = useState(INITIAL_LEVELS);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [levelData, setLevelData] = useState(INITIAL_LEVELS[0]);
  const [isTesting, setIsTesting] = useState(false);
  const [testPlayer, setTestPlayer] = useState('P1'); 

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024 || navigator.maxTouchPoints > 0);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const current = levelsList[currentLevelIndex];
    if (current) setLevelData(current);
  }, [currentLevelIndex, levelsList]);

  // 🆕 Stabil callback'ler — P2P reconnect bug fix
  const handleExitToMenu = useCallback(() => setScreen('menu'), []);
  const handleEditorExit = useCallback(() => { setIsTesting(false); setScreen('menu'); }, []);
  const handleTestExit = useCallback(() => setIsTesting(false), []);

  // 🆕 Editörde yapılan değişiklikleri levelsList'e de yansıt (kalıcılık fix)
  const handleLevelDataChange = useCallback((newData) => {
    setLevelData(newData);
    setLevelsList(prev => {
      const next = [...prev];
      next[currentLevelIndex] = newData;
      return next;
    });
  }, [currentLevelIndex]);

  const startGame = (mobileMode) => {
    setIsMobile(mobileMode);
    if (!roomId.trim()) {
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomId(randomCode);
    }
    setScreen('game');
  };

  const handleAddNewLevel = () => {
    const newLevels = [...levelsList, JSON.parse(JSON.stringify(levelData))]; 
    setLevelsList(newLevels);
    setCurrentLevelIndex(newLevels.length - 1);
    alert("Seviye listeye eklendi! Kalıcı yapmak için JSON'u kopyalayıp src/game/levels.js dosyasına yapıştırın.");
  };

  const handleExportJSON = () => {
    const json = JSON.stringify({ platforms: levelData.platforms, blueSpawn: levelData.blueSpawn, pinkSpawn: levelData.pinkSpawn, backgroundImage: levelData.backgroundImage || null }, null, 2);
    navigator.clipboard.writeText(json);
  };

  if (screen === 'menu') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', minHeight: '100vh', fontFamily: 'monospace', color: '#fff' }}>
        <h1 style={{ fontSize: 48, color: '#e84393', textShadow: '0 0 20px #e84393', marginBottom: 20 }}>LOVE GAME</h1>
        
        <div style={{ marginBottom: 30, textAlign: 'center' }}>
          <input type="text" placeholder="Oda Kodu" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ padding: 15, fontSize: 20, borderRadius: 8, border: '2px solid #3498db', background: '#1a1a2e', color: '#fff', textAlign: 'center', width: 250, outline: 'none' }} />
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Arkadaşınla aynı kodu girerek aynı odada buluşun.</p>
        </div>

        <div style={{ padding: 20, background: '#1a1a2e', borderRadius: 8, border: '1px solid #333', marginBottom: 30 }}>
          <h3 style={{ marginTop: 0, marginBottom: 15, textAlign: 'center' }}>Karakterini Seç</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => setCharacters({ p1: 'platformBlue', p2: 'platformPink' })} 
              style={{ 
                background: characters.p1 === 'platformBlue' ? '#00a7f8' : 'transparent', 
                border: characters.p1 === 'platformBlue' ? '4px solid #fff' : '4px solid transparent', 
                borderRadius: 8, cursor: 'pointer', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center'
              }}>
              <img src="/assets/player-blue.png" alt="Mavi" style={{ width: 80, height: 80 }} />
              <span style={{ color: '#fff', marginTop: 10, fontWeight: 'bold' }}>Mavi (P1)</span>
            </button>
            
            <button onClick={() => setCharacters({ p1: 'platformPink', p2: 'platformBlue' })} 
              style={{ 
                background: characters.p1 === 'platformPink' ? '#e84393' : 'transparent', 
                border: characters.p1 === 'platformPink' ? '4px solid #fff' : '4px solid transparent', 
                borderRadius: 8, cursor: 'pointer', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center'
              }}>
              <img src="/assets/player-pink.png" alt="Pembe" style={{ width: 80, height: 80 }} />
              <span style={{ color: '#fff', marginTop: 10, fontWeight: 'bold' }}>Pembe (P2)</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          <button onClick={() => startGame(false)} style={{ padding: '20px 40px', fontSize: 24, background: '#3498db', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>💻 Bilgisayar</button>
          <button onClick={() => startGame(true)} style={{ padding: '20px 40px', fontSize: 24, background: '#e84393', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>📱 Mobil / Tablet</button>
        </div>
        <button onClick={() => setScreen('editor')} style={{ padding: '15px 30px', fontSize: 18, background: '#f1c40f', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>🛠 LEVEL EDİTÖRÜ</button>
      </div>
    );
  }

  if (screen === 'editor') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', minHeight: '100vh', fontFamily: 'monospace', color: '#fff', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15, flexWrap: 'wrap', justifyContent: 'center' }}>
          <h1 style={{ margin: 0, color: '#f1c40f', fontSize: 20 }}>EDİTÖR</h1>
          <select value={currentLevelIndex} onChange={(e) => setCurrentLevelIndex(Number(e.target.value))} style={{ padding: '8px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }}>
            {levelsList.map((_, index) => <option key={index} value={index}>Sev {index + 1}</option>)}
          </select>
          <button onClick={() => setIsTesting(!isTesting)} style={{ padding: '10px 15px', background: isTesting ? '#e67e22' : '#27ae60', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>
            {isTesting ? '✏️ DÜZENLE' : '▶ TEST ET'}
          </button>
          
          {isTesting && (
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setTestPlayer('P1')} style={{ padding: '10px 15px', background: testPlayer === 'P1' ? '#00a7f8' : '#333', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>Mavi (P1)</button>
              <button onClick={() => setTestPlayer('P2')} style={{ padding: '10px 15px', background: testPlayer === 'P2' ? '#e84393' : '#333', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>Pembe (P2)</button>
            </div>
          )}

          <button onClick={handleEditorExit} style={{ padding: '10px 15px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>🏠 MENÜ</button>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 20, width: '100%', padding: '0 10px' }}>
          <GameCanvas 
            isEditing={!isTesting} 
            isTesting={isTesting} 
            controlledPlayer={testPlayer} 
            selectedTool={selectedTool} 
            customColor={customColor} 
            customSprite={customSprite}
            customSpriteTouched={customSpriteTouched}
            levelData={levelData} 
            onLevelChange={handleLevelDataChange}
            isMobile={isMobile} 
            characters={FIXED_CHARACTERS} 
            roomId={null} 
            currentLevelIndex={0} 
            setCurrentLevelIndex={() => {}} 
            onExit={handleTestExit}
          />
          {!isTesting && (
            <div style={{ width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center' }}>
              <LevelEditor 
                selectedTool={selectedTool} setSelectedTool={setSelectedTool} 
                customColor={customColor} setCustomColor={setCustomColor} 
                customSprite={customSprite} setCustomSprite={setCustomSprite}
                customSpriteTouched={customSpriteTouched} setCustomSpriteTouched={setCustomSpriteTouched}
                levelData={levelData} setLevelData={handleLevelDataChange}
                onAddNewLevel={handleAddNewLevel} onExportJSON={handleExportJSON} 
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', minHeight: '100vh', fontFamily: 'monospace', color: '#fff', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 15, flexWrap: 'wrap', justifyContent: 'center' }}>
        <h1 style={{ margin: 0, letterSpacing: 2, color: '#e84393', textShadow: '0 0 10px #e84393' }}>LOVE GAME</h1>
        <div style={{ padding: '8px 15px', background: '#1a1a2e', borderRadius: 4, border: '1px solid #3498db', color: '#3498db', fontWeight: 'bold' }}>Oda: {roomId}</div>
        <button onClick={handleExitToMenu} style={{ padding: '10px 20px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>🏠 MENÜ</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        <GameCanvas 
          isEditing={false} selectedTool={selectedTool} customColor={customColor} customSprite={customSprite} customSpriteTouched={customSpriteTouched}
          levelData={levelData} onLevelChange={handleLevelDataChange} isMobile={isMobile} characters={characters} 
          roomId={roomId} currentLevelIndex={currentLevelIndex} setCurrentLevelIndex={setCurrentLevelIndex} onExit={handleExitToMenu} 
        />
      </div>
    </div>
  );
}