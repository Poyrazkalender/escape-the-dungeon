import { useRef, useState, useEffect } from 'react';

export default function MobileTestControls({ player, setPlayer, playerRef, testKeysRef }) {
  const joystickRef = useRef(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const controls = player === 'P2'
    ? { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown' }
    : { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS' };

  // Oyuncu değişince tuşları serbest bırak
  useEffect(() => {
    return () => {
      if (testKeysRef.current) {
        testKeysRef.current[controls.left] = false;
        testKeysRef.current[controls.right] = false;
        testKeysRef.current[controls.jump] = false;
        testKeysRef.current[controls.down] = false;
      }
    };
  }, [player]);

  const handleJoystick = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch || !joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2 - 20;
    if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
    setKnobPos({ x: dx, y: dy });

    if (dx > 10) {
      testKeysRef.current[controls.left] = false;
      testKeysRef.current[controls.right] = true;
    } else if (dx < -10) {
      testKeysRef.current[controls.right] = false;
      testKeysRef.current[controls.left] = true;
    } else {
      testKeysRef.current[controls.left] = false;
      testKeysRef.current[controls.right] = false;
    }
  };

  const handleJoystickEnd = (e) => {
    e.preventDefault();
    setKnobPos({ x: 0, y: 0 });
    testKeysRef.current[controls.left] = false;
    testKeysRef.current[controls.right] = false;
  };

  const handleJump = (pressed) => (e) => { e.preventDefault(); testKeysRef.current[controls.jump] = pressed; };
  const handleDown = (pressed) => (e) => { e.preventDefault(); testKeysRef.current[controls.down] = pressed; };

  const btnStyle = (color, size = 70) => ({
    width: size, height: size, borderRadius: '50%',
    background: color, border: '3px solid rgba(255,255,255,0.6)',
    color: '#fff', fontSize: 26, fontWeight: 'bold',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    userSelect: 'none', touchAction: 'none',
    boxShadow: '0 0 15px rgba(0,0,0,0.4)',
  });

  return (
    <>
      {/* P1 / P2 Geçiş */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, zIndex: 30, pointerEvents: 'auto'
      }}>
        <button onClick={() => { playerRef.current = 'P1'; setPlayer('P1'); }}
          style={{
            padding: '8px 16px', borderRadius: 20, fontWeight: 'bold', fontSize: 14,
            background: player === 'P1' ? '#00a7f8' : 'rgba(0,0,0,0.6)',
            color: '#fff', border: '2px solid ' + (player === 'P1' ? '#fff' : '#555'),
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
          Mavi (P1)
        </button>
        <button onClick={() => { playerRef.current = 'P2'; setPlayer('P2'); }}
          style={{
            padding: '8px 16px', borderRadius: 20, fontWeight: 'bold', fontSize: 14,
            background: player === 'P2' ? '#e84393' : 'rgba(0,0,0,0.6)',
            color: '#fff', border: '2px solid ' + (player === 'P2' ? '#fff' : '#555'),
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
          Pembe (P2)
        </button>
      </div>

      {/* Joystick (Sol Alt) */}
      <div style={{ position: 'absolute', bottom: 30, left: 30, zIndex: 30, pointerEvents: 'auto' }}>
        <div ref={joystickRef}
          onTouchStart={handleJoystick}
          onTouchMove={handleJoystick}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
          style={{
            width: 130, height: 130, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.3)',
            position: 'relative', display: 'flex',
            justifyContent: 'center', alignItems: 'center',
            touchAction: 'none',
          }}>
          <div style={{
            width: 55, height: 55, borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            position: 'absolute',
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: (knobPos.x === 0 && knobPos.y === 0) ? 'transform 0.1s' : 'none',
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Aksiyon Butonları (Sağ Alt) */}
      <div style={{
        position: 'absolute', bottom: 30, right: 30, zIndex: 30, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end'
      }}>
        <div onTouchStart={handleJump(true)} onTouchEnd={handleJump(false)} onTouchCancel={handleJump(false)}
          style={btnStyle('rgba(34, 197, 94, 0.75)')}>↑</div>
        <div onTouchStart={handleDown(true)} onTouchEnd={handleDown(false)} onTouchCancel={handleDown(false)}
          style={btnStyle('rgba(239, 68, 68, 0.75)', 60)}>↓</div>
      </div>
    </>
  );
}