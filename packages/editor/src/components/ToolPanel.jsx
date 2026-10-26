export default function ToolPanel({ 
  selectedTool, setSelectedTool, 
  setSelectedPlatformIndex 
}) {
  const verticalTools = [
    { id: 'select', icon: '🖱' },
    { id: 'platform', icon: '⬜' },
    { id: 'wall', icon: '📏' },
    { id: 'spawn', icon: '📍' },
    { id: 'delete', icon: '🧽' },
  ];

  const toolGroups = [
    {
      title: 'TEMEL',
      tools: [
        { id: 'select', label: 'Seç / Taşı', color: '#3498db', icon: '🖱' },
        { id: 'delete', label: 'Sil', color: '#e74c3c', icon: '🗑' },
      ]
    },
    {
      title: 'ZEMİNLER',
      tools: [
        { id: 'platform', label: 'Değişken Zemin', color: '#d35400', icon: '🧱' },
        { id: 'wall', label: 'Değişken Duvar', color: '#c0392b', icon: '🧱' },
        { id: 'platformBlue', label: 'Sabit Mavi', color: '#2980b9', icon: '🟦' },
        { id: 'platformPink', label: 'Sabit Pembe', color: '#c0392b', icon: '🟪' },
      ]
    },
    {
      title: 'MANTIK & ÖZEL',
      tools: [
        { id: 'platformTimer', label: 'Zamanlayıcı', color: '#f39c12', icon: '⏱' },
        { id: 'platformRemote', label: 'Uzaktan Kum.', color: '#8e44ad', icon: '📡' },
        { id: 'buttonBlue', label: 'Mavi Buton', color: '#00a7f8', icon: '🔘' },
        { id: 'buttonPink', label: 'Pembe Buton', color: '#e84393', icon: '🔘' },
      ]
    },
    {
      title: 'OBJELER',
      tools: [
        { id: 'goal', label: 'Hedef Koy', color: '#e67e22', icon: '🚩' },
        { id: 'spawn', label: 'Spawn Taşı', color: '#9b59b6', icon: '🧍' },
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* DİKEY İKON ÇUBUĞU (En Sol) */}
      <div style={{ width: 60, background: '#0b0b13', borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0', gap: 10 }}>
        {verticalTools.map(t => (
          <button 
            key={t.id}
            onClick={() => { setSelectedTool(t.id); setSelectedPlatformIndex(null); }}
            className="hover-scale"
            style={{ 
              width: 40, height: 40, borderRadius: 8, border: 'none', fontSize: 18, cursor: 'pointer',
              background: selectedTool === t.id ? '#b388ff' : 'transparent',
              color: selectedTool === t.id ? '#000' : '#666',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* KATEGORİLİ ARAÇLAR (Orta Sol) */}
      <div style={{ width: 260, background: '#0f0f1a', borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, flex: 1, overflowY: 'auto' }}>
          {toolGroups.map(group => (
            <div key={group.title}>
              <h3 style={{ fontSize: 10, color: '#666', marginBottom: 10, letterSpacing: 1, fontWeight: 'bold' }}>{group.title}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {group.tools.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => { setSelectedTool(t.id); setSelectedPlatformIndex(null); }}
                    className="hover-scale"
                    style={{ 
                      padding: '12px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      background: selectedTool === t.id ? '#1e1333' : '#13131f', 
                      color: selectedTool === t.id ? '#b388ff' : '#ccc', 
                      border: '1px solid ' + (selectedTool === t.id ? '#b388ff' : '#1a1a2e'), 
                      borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}