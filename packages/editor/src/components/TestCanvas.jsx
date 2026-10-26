import { useEffect, useRef, useState } from 'react';
import { WIDTH, HEIGHT, createState, update, renderWorld } from 'game-core';

export default function TestCanvas({ levelData, onExit }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const keysRef = useRef({});
  const [controlledPlayer, setControlledPlayer] = useState('P1');
  const [isComplete, setIsComplete] = useState(false);

  const controlledPlayerRef = useRef(controlledPlayer);
  useEffect(() => { controlledPlayerRef.current = controlledPlayer; }, [controlledPlayer]);

  // Level değiştiğinde oyunu sıfırla
  useEffect(() => {
    stateRef.current = createState(levelData, { p1: 'platformBlue', p2: 'platformPink' }, true);
    keysRef.current = {};
    setIsComplete(false);
  }, [levelData]);

  // Oyun döngüsü
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    let rafId;
    let lastTime = performance.now();

    const onKeyDown = (e) => {
      keysRef.current[e.code] = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const state = stateRef.current;
      if (state) {
        // isTesting: true -> diğer oyuncuya da yerçekimi uygulanır
        update(state, keysRef.current, dt, controlledPlayerRef.current, true);
        renderWorld(ctx, state);

        if (state.levelComplete && !isComplete) {
          setIsComplete(true);
        }
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isComplete]);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      
      {/* ÜST BAR */}
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <button 
          onClick={onExit} 
          style={{ padding: '10px 20px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✏️ Düzenlemeye Dön
        </button>
        
        <div style={{ padding: '10px 20px', background: '#1a1a2e', borderRadius: 6, border: '1px solid #333', fontSize: 14 }}>
          Kontrol Edilen: <strong style={{ color: controlledPlayer === 'P1' ? '#00a7f8' : '#e84393' }}>{controlledPlayer}</strong>
        </div>
        
        <button 
          onClick={() => setControlledPlayer(p => p === 'P1' ? 'P2' : 'P1')} 
          style={{ padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
        >
          🔄 Oyuncu Değiştir
        </button>
      </div>

      {/* CANVAS */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{
            border: '4px solid #333',
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            width: '100%',
            maxWidth: WIDTH,
            height: 'auto',
            imageRendering: 'pixelated',
            display: 'block'
          }}
        />

        {/* KAZANMA OVERLAY */}
        {isComplete && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 10, 20, 0.85)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', borderRadius: 8
          }}>
            <h1 style={{ color: '#4caf50', fontSize: 42, margin: 0, textShadow: '0 0 20px #4caf50' }}>TEBRİKLER!</h1>
            <p style={{ color: '#fff', fontSize: 16, marginTop: 10, marginBottom: 30 }}>Seviye testi başarılı.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => {
                  stateRef.current = createState(levelData, { p1: 'platformBlue', p2: 'platformPink' }, true);
                  setIsComplete(false);
                }} 
                style={{ padding: '12px 24px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
              >
                🔄 Yeniden Test Et
              </button>
              <button 
                onClick={onExit} 
                style={{ padding: '12px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✏️ Düzenlemeye Dön
              </button>
            </div>
          </div>
        )}
      </div>

      <p style={{ color: '#666', fontSize: 12, margin: 0 }}>
        P1: <strong>WASD</strong> &nbsp;|&nbsp; P2: <strong>Ok Tuşları</strong> &nbsp;|&nbsp; İki oyuncuyu da hedefe ulaştırın.
      </p>
    </div>
  );
}