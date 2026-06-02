// src/components/CargoForm/CargoForm.jsx
import React, { useState } from 'react';

export default function CargoForm({ unit, onAddCargo }) {
  const [form, setForm] = useState({ name: '', l: '0.40', w: '0.40', h: '0.40', qty: 10 });
  
  // 🟢 Definimos uma cor padrão inicial (ex: um azul bonito)
  const [selColor, setSelColor] = useState('#3b82f6'); 

  const handleSubmit = () => {
    const lv = parseFloat(form.l);
    const wv = parseFloat(form.w);
    const hv = parseFloat(form.h);
    const qty = parseInt(form.qty) || 1;

    if (!lv || !wv || !hv || lv <= 0 || wv <= 0 || hv <= 0) {
      alert('Preencha todas as dimensões com valores maiores que zero.');
      return;
    }

    // Chama a função passada pelo componente pai (MedidorCargas)
    onAddCargo({
      name: form.name.trim(),
      l: lv,
      w: wv,
      h: hv,
      qty,
      color: selColor // Envia a cor escolhida livremente
    });

    // Reseta apenas o nome após adicionar
    setForm({ ...form, name: '' });
  };

  return (
    <div className="sec">
      <div className="stitle">Nova Carga</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="field">
          <label>Nome</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pallet A" />
        </div>
        <div className="g3">
          <div className="field">
            <label>Comp.</label>
            <input type="number" value={form.l} onChange={e => setForm({ ...form, l: e.target.value })} placeholder={unit === 'm' ? '0.00' : '0'} step={unit === 'm' ? '0.01' : '1'} min={unit === 'm' ? '0.01' : '1'} />
          </div>
          <div className="field">
            <label>Larg.</label>
            <input type="number" value={form.w} onChange={e => setForm({ ...form, w: e.target.value })} placeholder={unit === 'm' ? '0.00' : '0'} step={unit === 'm' ? '0.01' : '1'} min={unit === 'm' ? '0.01' : '1'} />
          </div>
          <div className="field">
            <label>Alt.</label>
            <input type="number" value={form.h} onChange={e => setForm({ ...form, h: e.target.value })} placeholder={unit === 'm' ? '0.00' : '0'} step={unit === 'm' ? '0.01' : '1'} min={unit === 'm' ? '0.01' : '1'} />
          </div>
        </div>
        <div className="field">
          <label>Quantidade</label>
          <input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} min="1" max="200" />
        </div>
        
        {/* 🟢 AQUI ESTÁ A TUA ALTERAÇÃO: Input de cor livre */}
        <div className="field">
          <label>Cor de Identificação *</label>
          <input 
            type="color" 
            value={selColor} 
            onChange={e => setSelColor(e.target.value)} 
            style={{ 
              height: '42px', 
              padding: '2px', 
              cursor: 'pointer', 
              width: '100%', 
              borderRadius: '6px', 
              border: '1px solid var(--border2)',
              backgroundColor: '#fff'
            }} 
          />
        </div>

      </div>
      <button className="btn-add" onClick={handleSubmit}>＋ ADICIONAR CARGA</button>
    </div>
  );
}