import React, { useRef, useState } from 'react';

export default function TouchControls({ onKeyChange, keys = { left: 'KeyA', right: 'KeyD', jump: 'KeyW' } }) {
  const joystickRef = useRef(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activePointerRef = useRef(null);

  // ✅ DÜZELTİLDİ: React'in touch dinleyicileri passive olduğu için
  // preventDefault() konsola "Unable to preventDefault inside passive event
  // listener invocation" hatası basıyordu. Pointer Events kullanıyoruz.
  const updateFromPointer = (e) => {
    const el = joystickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2 - 20;

    if (distance > maxDist) {
      dx = (dx / distance) * maxDist;
      dy = (dy / distance) * maxDist;
    }
    setKnobPos({ x: dx, y: dy });

    if (dx > 10) {
      onKeyChange(keys.left, false);
      onKeyChange(keys.right, true);
    } else if (dx < -10) {
      onKeyChange(keys.right, false);
      onKeyChange(keys.left, true);
    } else {
      onKeyChange(keys.left, false);
      onKeyChange(keys.right, false);
    }
  };

  const handlePointerDown = (e) => {
    activePointerRef.current = e.pointerId;
    joystickRef.current?.setPointerCapture?.(e.pointerId);
    updateFromPointer(e);
  };

  const handlePointerMove = (e) => {
    if (activePointerRef.current !== e.pointerId) return;
    updateFromPointer(e);
  };

  const handlePointerUp = (e) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    setKnobPos({ x: 0, y: 0 });
    onKeyChange(keys.left, false);
    onKeyChange(keys.right, false);
  };

  const handleJump = (isPressed) => () => {
    onKeyChange(keys.jump, isPressed);
  };

  const btnStyle = {
    width: 70, height: 70, borderRadius: '50%',
    background: 'rgba(0, 167, 248, 0.4)',
    border: '3px solid rgba(255,255,255,0.6)',
    color: '#fff', fontSize: 28, fontWeight: 'bold',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    userSelect: 'none', touchAction: 'none',
    boxShadow: '0 0 15px rgba(0,167,248,0.5)'
  };

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-between', padding: '0 30px',
      pointerEvents: 'none'
    }}>
      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={joystickRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', position: 'relative', touchAction: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', position: 'absolute', transform: `translate(${knobPos.x}px, ${knobPos.y}px)`, transition: knobPos.x === 0 && knobPos.y === 0 ? 'transform 0.1s' : 'none', pointerEvents: 'none' }} />
        </div>
      </div>

      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'flex-end', paddingBottom: 20 }}>
        <div style={btnStyle}
          onPointerDown={handleJump(true)}
          onPointerUp={handleJump(false)}
          onPointerCancel={handleJump(false)}
          onPointerLeave={handleJump(false)}
          onContextMenu={(e) => e.preventDefault()}
        >↑</div>
      </div>
    </div>
  );
}
