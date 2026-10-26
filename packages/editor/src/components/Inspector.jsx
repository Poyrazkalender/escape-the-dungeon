import { useRef, useEffect } from 'react';
import { Toggle, NumberInput, ImageUploader } from './ui';

export default function Inspector({ 
  selectedPlatformIndex, setSelectedPlatformIndex, 
  levelData, setLevelData, 
  snapEnabled, setSnapEnabled
}) {
  const selectedPlat = selectedPlatformIndex !== null ? levelData.platforms[selectedPlatformIndex] : null;

  const propertyCommitRef = useRef(null);
  useEffect(() => {
    return () => clearTimeout(propertyCommitRef.current);
  }, []);

  const updateSelectedPlatform = (key, value) => {
    const newPlatforms = [...levelData.platforms];
    newPlatforms[selectedPlatformIndex] = { ...newPlatforms[selectedPlatformIndex], [key]: value };
    const newLevel = { ...levelData, platforms: newPlatforms };
    
    if (['sprite', 'spriteTouched', 'customColor'].includes(key)) {
      setLevelData(newLevel, { commit: true });
    } else {
      setLevelData(newLevel, { commit: false });
      clearTimeout(propertyCommitRef.current);
      propertyCommitRef.current = setTimeout(() => {
        setLevelData(newLevel, { commit: true });
      }, 600);
    }
  };

  const colors = ['#ffffff', '#e74c3c', '#9b59b6', '#3498db', '#1abc9c', '#2ecc71', '#f1c40f', '#e67e22', '#e84393', '#34495e', '#95a5a6', '#7f8c8d'];

  return (
    <div style={{ width: 320, background: '#0f0f1a', borderLeft: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      
      <div style={{ padding: '20px', borderBottom: '1px solid #1a1a2e', background: '#0b0b13' }}>
        <h2 style={{ fontSize: 15, color: '#fff', margin: 0, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚙️ MÜFETTİŞ
        </h2>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, flex: 1, overflowY: 'auto' }}>
        
        {selectedPlat ? (
          <div>
            <h3 style={{ fontSize: 12, color: '#b388ff', marginBottom: 12, fontWeight: 'bold' }}>Platform Özellikleri</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#888', width: 15 }}>X</span>
                  <input type="number" value={Math.round(selectedPlat.x)} onChange={(e) => updateSelectedPlatform('x', Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#13131f', color: '#fff', border: '1px solid #2a2a40', borderRadius: 6, outline: 'none', fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#888', width: 15 }}>Y</span>
                  <input type="number" value={Math.round(selectedPlat.y)} onChange={(e) => updateSelectedPlatform('y', Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#13131f', color: '#fff', border: '1px solid #2a2a40', borderRadius: 6, outline: 'none', fontSize: 13 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#888' }}>Genişlik</span>
                  <input type="number" value={Math.round(selectedPlat.w)} onChange={(e) => updateSelectedPlatform('w', Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#13131f', color: '#fff', border: '1px solid #2a2a40', borderRadius: 6, outline: 'none', fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#888' }}>Yükseklik</span>
                  <input type="number" value={Math.round(selectedPlat.h)} onChange={(e) => updateSelectedPlatform('h', Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#13131f', color: '#fff', border: '1px solid #2a2a40', borderRadius: 6, outline: 'none', fontSize: 13 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 15 }}>
               {!selectedPlat.isTimer && !selectedPlat.isRemote && !selectedPlat.isButtonBlue && !selectedPlat.isButtonPink && !selectedPlat.isGoal && (
                <Toggle checked={selectedPlat.changeable || false} onChange={(e) => updateSelectedPlatform('changeable', e.target.checked)} label="Renk Değiştirsin mi?" />
              )}
              {!selectedPlat.isGoal && (
                <Toggle checked={selectedPlat.isWall || false} onChange={(e) => updateSelectedPlatform('isWall', e.target.checked)} label="Duvar (Yanlardan Çarpılır)" />
              )}
            </div>

            {!selectedPlat.isButtonBlue && !selectedPlat.isButtonPink && (
              <div style={{ marginTop: 20 }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: 8 }}>PLATFORM DOKUSU (SPRITE)</span>
                <ImageUploader 
                  label="" 
                  currentImage={selectedPlat.sprite} 
                  onUpload={(base64) => updateSelectedPlatform('sprite', base64)}
                  onRemove={() => updateSelectedPlatform('sprite', null)}
                />
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 12, border: '1px dashed #2a2a40', borderRadius: 8, background: '#0b0b13' }}>
            Düzenlemek için bir platform seçin.
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: 8 }}>ARKA PLAN RESMİ</span>
          <ImageUploader 
            label="" 
            currentImage={levelData.backgroundImage} 
            onUpload={(base64) => setLevelData({ ...levelData, backgroundImage: base64 }, { commit: true })}
            onRemove={() => setLevelData({ ...levelData, backgroundImage: null }, { commit: true })}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <h3 style={{ fontSize: 12, color: '#fff', fontWeight: 'bold', marginBottom: 10 }}>Sahne Ayarları</h3>
          <Toggle checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} label="Izgara (20px Snap)" />
          
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 15 }}>
            {colors.map(c => (
              <div 
                key={c}
                onClick={() => { if (selectedPlat) updateSelectedPlatform('customColor', c); }}
                className="hover-scale"
                style={{
                  width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer',
                  border: selectedPlat?.customColor === c ? '2px solid #fff' : '1px solid #2a2a40',
                  boxShadow: selectedPlat?.customColor === c ? '0 0 10px ' + c : 'none',
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}