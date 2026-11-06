import { useRef, useState, useEffect } from 'react';

export default function MobileTestControls({ player, setPlayer, playerRef, testKeysRef }) {
  const joystickRef = useRef(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activePointerRef = useRef(null);

  const isP2 = player === 'P2';
  const controls = isP2
    ? { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown' }
    : { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS' };
  const controlsRef = useRef(controls);
  useEffect(() => { controlsRef.current = controls; });

  // Oyuncu değişince tuşları serbest bırak
  useEffect(() => {
    const keyRef = testKeysRef;
    return () => {
      if (keyRef.current) {
        const c = controlsRef.current;
        keyRef.current[c.left] = false;
        keyRef.current[c.right] = false;
        keyRef.current[c.jump] = false;
        keyRef.current[c.down] = false;
      }
    };
  }, [isP2, testKeysRef]);

  // ✅ DÜZELTİLDİ: React'in touch/wheel dinleyicileri "passive" olduğu için
  // içlerinde preventDefault() çağırmak konsola
  // "Unable to preventDefault inside passive event listener invocation"
  // hatası basıyordu. Pointer Events kullanıyoruz: passive değiller ve
  // touchAction:'none' ile kaydırma zaten engelleniyor.
  const updateFromPointer = (e) => {
    const el = joystickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2 - 20;
    if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
    setKnobPos({ x: dx, y: dy });

    const c = controlsRef.current;
    if (dx > 10) {
      testKeysRef.current[c.left] = false;
      testKeysRef.current[c.right] = true;
    } else if (dx < -10) {
      testKeysRef.current[c.right] = false;
      testKeysRef.current[c.left] = true;
    } else {
      testKeysRef.current[c.left] = false;
      testKeysRef.current[c.right] = false;
    }
  };

  const handleJoystickDown = (e) => {
    activePointerRef.current = e.pointerId;
    joystickRef.current?.setPointerCapture?.(e.pointerId);
    updateFromPointer(e);
  };

  const handleJoystickMove = (e) => {
    if (activePointerRef.current !== e.pointerId) return;
    updateFromPointer(e);
  };

  const handleJoystickUp = (e) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    setKnobPos({ x: 0, y: 0 });
    const c = controlsRef.current;
    testKeysRef.current[c.left] = false;
    testKeysRef.current[c.right] = false;
  };

  const setKey = (key, pressed) => () => { testKeysRef.current[key] = pressed; };

  const btnStyle = (color, size = 70) => ({
    width: size, height: size, borderRadius: '50%',
    background: color, border: '3px solid rgba(255,255,255,0.6)',
    color: '#fff', fontSize: 26, fontWeight: 'bold',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    userSelect: 'none', touchAction: 'none',
    boxShadow: '0 0 15px rgba(0,0,0,0.4)',
  });

  const actionBtnProps = (key) => ({
    onPointerDown: setKey(key, true),
    onPointerUp: setKey(key, false),
    onPointerCancel: setKey(key, false),
    onPointerLeave: setKey(key, false),
    onContextMenu: (e) => e.preventDefault(),
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
          onPointerDown={handleJoystickDown}
          onPointerMove={handleJoystickMove}
          onPointerUp={handleJoystickUp}
          onPointerCancel={handleJoystickUp}
          onContextMenu={(e) => e.preventDefault()}
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
        <div {...actionBtnProps(controls.jump)} style={btnStyle('rgba(34, 197, 94, 0.75)')}>↑</div>
        <div {...actionBtnProps(controls.down)} style={btnStyle('rgba(239, 68, 68, 0.75)', 60)}>↓</div>
      </div>
    </>
  );
}
