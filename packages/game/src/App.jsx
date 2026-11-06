import { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { LEVELS as INITIAL_LEVELS } from './game/levels';

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? (window.innerWidth <= 1024 || navigator.maxTouchPoints > 0) : false);

  const [characters, setCharacters] = useState({ p1: 'platformBlue', p2: 'platformPink' });
  const [roomId, setRoomId] = useState('');
  const [isLocalCoop, setIsLocalCoop] = useState(false);

  const [levelsList] = useState(INITIAL_LEVELS);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  const levelData = levelsList[currentLevelIndex] || levelsList[0];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024 || navigator.maxTouchPoints > 0);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stabil callback — P2P bağlantısının her render'da yeniden kurulmasını önler
  const handleExitToMenu = useCallback(() => setScreen('menu'), []);

  const startGame = (mobileMode, localCoop = false) => {
    setIsMobile(mobileMode);
    setIsLocalCoop(localCoop);

    // ✅ DÜZELTİLDİ: Mod her başlatmada sıfırlanır. Yerel moddan sonra
    // online oyuna dönüldüğünde P2P tekrar aktif olur.
    if (!localCoop) {
      setRoomId(prev => prev.trim() ? prev : Math.floor(1000 + Math.random() * 9000).toString());
    }

    setScreen('game');
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

        <button 
          onClick={() => startGame(false, true)} 
          style={{ padding: '15px 30px', fontSize: 20, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', marginBottom: 20 }}
        >
          🎮 Yerel 2 Kişilik Oyna (Aynı Klavye)
        </button>
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
          isEditing={false}
          levelData={levelData}
          isMobile={isMobile}
          characters={characters}
          roomId={isLocalCoop ? null : roomId}
          isLocalCoop={isLocalCoop}
          levels={levelsList}
          currentLevelIndex={currentLevelIndex}
          setCurrentLevelIndex={setCurrentLevelIndex}
          onExit={handleExitToMenu}
        />
      </div>
    </div>
  );
}
