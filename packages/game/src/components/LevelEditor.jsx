import { useState } from 'react';

export default function LevelEditor({ 
  selectedTool, 
  setSelectedTool, 
  customColor, 
  setCustomColor, 
  customSprite, 
  setCustomSprite, 
  customSpriteTouched, 
  setCustomSpriteTouched, 
  levelData, 
  setLevelData, 
  onAddNewLevel, 
  onExportJSON 
}) {
  const [copied, setCopied] = useState(false);

  const tools = [
    { id: 'changeable', label: 'Değişken Zemin', color: '#8a8aa8' },
    { id: 'wallChangeable', label: 'Değişken Duvar', color: '#a29bfe' },
    { id: 'platformNeutral', label: 'Sabit Nötr Zemin', color: '#e67e22' },
    { id: 'wallNeutral', label: 'Sabit Nötr Duvar', color: '#d35400' },
    { id: 'platformBlue', label: 'Sabit Mavi', color: '#00a7f8' },
    { id: 'platformPink', label: 'Sabit Pembe', color: '#e84393' },
    { id: 'platformTimer', label: '⏱ Zamanlayıcı', color: '#9b59b6' }, 
    { id: 'platformRemote', label: '📡 Uzaktan Kum.', color: '#34495e' }, 
    { id: 'buttonBlue', label: '🔵 Mavi Buton', color: '#2980b9' }, 
    { id: 'buttonPink', label: '🔴 Pembe Buton', color: '#c0392b' }, 
    { id: 'goal', label: 'Hedef Koy', color: '#ff4757' },
    { id: 'spawnBlue', label: 'Mavi Spawn', color: '#00a7f8' },
    { id: 'spawnPink', label: 'Pembe Spawn', color: '#e84393' },
    { id: 'delete', label: 'Sil', color: '#ff0000' },
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLevelData({ ...levelData, backgroundImage: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSpriteUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCustomSprite(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSpriteTouchedUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCustomSpriteTouched(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    onExportJSON();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ width: '100%', maxWidth: 320, background: '#1a1a2e', padding: 20, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>Araçlar</h3>
      
      {/* RENK SEÇİCİ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#2a2a40', padding: 10, borderRadius: 4 }}>
        <span style={{ fontSize: 12, color: '#fff' }}>Renk:</span>
        <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} style={{ cursor: 'pointer', border: 'none', background: 'none', width: 40, height: 30 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {tools.map(t => (
          <button key={t.id} onClick={() => setSelectedTool(t.id)}
            style={{ padding: '10px 4px', fontSize: 11, cursor: 'pointer', background: selectedTool === t.id ? t.color : '#2a2a40', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <hr style={{ borderColor: '#333', width: '100%', margin: '10px 0' }} />

      <div style={{ background: '#2a2a40', padding: 10, borderRadius: 4 }}>
        <span style={{ fontSize: 12, color: '#fff', display: 'block', marginBottom: 5 }}>Platform Sprite (Normal):</span>
        <input type="file" accept="image/*" onChange={handleSpriteUpload} style={{ fontSize: 11, color: '#ccc', width: '100%' }} />
        {customSprite && <button onClick={() => setCustomSprite(null)} style={{ marginTop: 5, fontSize: 11, background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Görseli Kaldır</button>}
      </div>

      {/* 🆕 2. Sprite Yükleme */}
      <div style={{ background: '#2a2a40', padding: 10, borderRadius: 4 }}>
        <span style={{ fontSize: 12, color: '#fff', display: 'block', marginBottom: 5 }}>Platform Sprite (Dokunulunca):</span>
        <input type="file" accept="image/*" onChange={handleSpriteTouchedUpload} style={{ fontSize: 11, color: '#ccc', width: '100%' }} />
        {customSpriteTouched && <button onClick={() => setCustomSpriteTouched(null)} style={{ marginTop: 5, fontSize: 11, background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Görseli Kaldır</button>}
      </div>

      <div style={{ background: '#2a2a40', padding: 10, borderRadius: 4 }}>
        <span style={{ fontSize: 12, color: '#fff', display: 'block', marginBottom: 5 }}>Arka Plan Resmi:</span>
        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: 11, color: '#ccc', width: '100%' }} />
        {levelData.backgroundImage && <button onClick={() => setLevelData({ ...levelData, backgroundImage: null })} style={{ marginTop: 5, fontSize: 11, background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Resmi Kaldır</button>}
      </div>

      <button onClick={() => setLevelData({ platforms: [], blueSpawn: { x: 100, y: 400 }, pinkSpawn: { x: 150, y: 400 }, backgroundImage: null })} style={{ padding: 10, background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Sahneyi Temizle</button>

      <button onClick={handleExport} style={{ padding: 10, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>{copied ? '✅ Kopyalandı!' : '📋 JSON Kopyala'}</button>
      
      <button onClick={onAddNewLevel} style={{ padding: 10, background: '#8e44ad', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', marginTop: 10 }}>➕ Yeni Seviye</button>
    </div>
  );
}