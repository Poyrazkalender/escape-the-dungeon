import GameCanvasRestart from './components/GameCanvasRestart';
import { LEVELS } from './game/levels';

export default function AppRestart() {
  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      background: '#0a0a0a', minHeight: '100vh', fontFamily: 'monospace', color: '#fff', paddingTop: 20
    }}>
      <h1 style={{ margin: '0 0 15px 0', letterSpacing: 2, color: '#e84393', textShadow: '0 0 10px #e84393' }}>
        LOVE GAME (Restart Modu)
      </h1>
      
      <GameCanvasRestart levelData={LEVELS[0]} />

      <div style={{ marginTop: 15, color: '#888' }}>
        Mavi: A / D / W &nbsp;|&nbsp; Pembe: ← / → / ↑
      </div>
      <div style={{ marginTop: 5, color: '#555', fontSize: 12 }}>
        *Herhangi bir oyuncu boşluğa düşerse seviye baştan başlar.
      </div>
    </div>
  );
}