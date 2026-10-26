import { useEffect, useRef } from 'react';
import { WIDTH, HEIGHT } from '../game/constants';
import { createState, update } from '../game/engineRestart';
import { render } from '../game/renderer';

export default function GameCanvasRestart({ levelData }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const keysRef = useRef({});

  useEffect(() => {
    stateRef.current = createState(levelData);
  }, [levelData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    let rafId;
    let lastTime = performance.now();

    const onKeyDown = e => {
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
      
      // Restart istendi mi ve üzerinden 0.6 saniye geçti mi?
      if (state.restartRequested && state.time - state.restartTime > 0.6) {
        stateRef.current = createState(levelData);
      } else {
        update(state, keysRef.current, dt);
      }
      
      render(ctx, stateRef.current);

      // Restart sırasında ekranı karart ve yazı göster
      if (state.restartRequested) {
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
  }, [levelData]);

  return (
    <canvas 
      ref={canvasRef} 
      width={WIDTH} 
      height={HEIGHT} 
      style={{ 
        border: '4px solid #111', 
        borderRadius: 8, 
        boxShadow: '0 0 30px rgba(0,0,0,0.8)',
        imageRendering: 'pixelated'
      }} 
    />
  );
}