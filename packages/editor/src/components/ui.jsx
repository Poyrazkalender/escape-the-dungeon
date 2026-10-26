import { useRef } from 'react';

export function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: '10px 0' }}>
      <span style={{ fontSize: 13, color: '#ccc' }}>{label}</span>
      <div style={{ 
        width: 44, height: 24, background: checked ? '#00e676' : '#2a2a40', 
        borderRadius: 20, position: 'relative', transition: 'background 0.3s', border: '1px solid ' + (checked ? '#00e676' : '#444')
      }}>
        <div style={{
          width: 18, height: 18, background: '#fff', borderRadius: '50%',
          position: 'absolute', top: 2, left: checked ? 22 : 2, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }} />
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    </label>
  );
}

export function NumberInput({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: '#888', fontWeight: 'bold' }}>{label}</span>
      <input 
        type="number" 
        value={Math.round(value)} 
        onChange={onChange} 
        style={{ 
          width: '100%', padding: '10px', background: '#13131f', color: '#fff', 
          border: '1px solid #2a2a40', borderRadius: 6, outline: 'none', fontSize: 13,
          transition: 'border-color 0.2s'
        }} 
        onFocus={(e) => e.target.style.borderColor = '#b388ff'}
        onBlur={(e) => e.target.style.borderColor = '#2a2a40'}
      />
    </label>
  );
}

export function ImageUploader({ label, currentImage, onUpload, onRemove }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpload(reader.result);
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  return (
    <div style={{ marginTop: 10 }}>
      {label && <span style={{ fontSize: 11, color: '#888', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>{label}</span>}
      
      {currentImage ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#13131f', padding: 10, borderRadius: 6, border: '1px solid #2a2a40' }}>
          <div style={{ width: 40, height: 40, background: `url(${currentImage}) center/cover`, borderRadius: 4, border: '1px solid #333' }} />
          <button onClick={onRemove} style={{ flex: 1, padding: '8px', background: '#2a1b1b', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
            🗑 Kaldır
          </button>
        </div>
      ) : (
        <button 
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%', padding: '12px', background: '#13131f', color: '#b388ff', border: '1px dashed #b388ff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
        >
          + Görsel Yükle
        </button>
      )}
      
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
    </div>
  );
}