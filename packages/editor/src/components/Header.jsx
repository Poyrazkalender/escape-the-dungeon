export default function Header({ 
  onTestToggle, isTesting, 
  canUndo, canRedo, onUndo, onRedo, 
  onExport 
}) {
  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      height: 60, background: '#0b0b13', borderBottom: '1px solid #1a1a2e', 
      padding: '0 20px', flexShrink: 0
    }}>
      {/* SOL: LOGO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '25%' }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #b388ff, #00e676)', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#000', fontSize: 16
        }}>
          L
        </div>
        <h1 style={{ margin: 0, fontSize: 16, color: '#fff', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#b388ff' }}>⚒</span> LEVEL EDITOR <span style={{ color: '#555', fontSize: 12 }}>v0.8.1</span>
        </h1>
      </div>

      {/* ORTA: ARAÇLAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '50%' }}>
        <button 
          onClick={onTestToggle}
          style={{ 
            padding: '8px 24px', background: isTesting ? '#e67e22' : '#00e676', 
            color: isTesting ? '#fff' : '#000', border: 'none', borderRadius: 6, 
            cursor: 'pointer', fontWeight: 'bold', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          {isTesting ? '✏️ Düzenlemeye Dön' : '▶ TEST ET'}
        </button>

        <button onClick={onUndo} disabled={!canUndo} style={{ padding: '8px 16px', background: canUndo ? '#1a1a2e' : 'transparent', color: canUndo ? '#ccc' : '#444', border: '1px solid ' + (canUndo ? '#2a2a40' : 'transparent'), borderRadius: 6, cursor: canUndo ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          ↶ Geri Al
        </button>
        <button onClick={onRedo} disabled={!canRedo} style={{ padding: '8px 16px', background: canRedo ? '#1a1a2e' : 'transparent', color: canRedo ? '#ccc' : '#444', border: '1px solid ' + (canRedo ? '#2a2a40' : 'transparent'), borderRadius: 6, cursor: canRedo ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          ↷ İleri Al
        </button>

        <button onClick={onExport} style={{ padding: '8px 16px', background: '#1e1333', color: '#b388ff', border: '1px solid #b388ff', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          📋 JSON Kopyala
        </button>
      </div>

      {/* SAĞ: SİSTEM İKONLARI */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, width: '25%', color: '#666' }}>
        <span className="hover-scale" style={{ cursor: 'pointer' }}>⚙️</span>
        <span className="hover-scale" style={{ cursor: 'pointer' }}>🔍</span>
        <span className="hover-scale" style={{ cursor: 'pointer' }}>⬇️</span>
        <span className="hover-scale" style={{ cursor: 'pointer' }}>⬆️</span>
      </div>
    </div>
  );
}