// Configuração de Cores dos Nós e cores favoritas

import './styles.css';
// IMPORTS --------------------------------------------------
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

import { Plus, Palette, X } from 'lucide-react';
import { ITEM_TYPES } from '../../constants';


// Padrão de Cores dos Nós
const NodeColorsModal = ({ nodeSettings, favoriteColors, onClose, onSave }) => {
    const [localSettings, setLocalSettings] = useState(nodeSettings || {
        POP: '#4338ca',
        CEO: '#ea580c',
        CTO: '#16a34a',
        TOWER: '#8888FF',
        POST: '#0654AF'
    });
    const [localFavorites, setLocalFavorites] = useState(favoriteColors || []);
    const [newFavoriteColor, setNewFavoriteColor] = useState('#3b82f6');

    const addFavorite = () => {
        if (newFavoriteColor && !localFavorites.includes(newFavoriteColor)) {
            setLocalFavorites([...localFavorites, newFavoriteColor]);
            setNewFavoriteColor('#3b82f6');
        }
    };

    const removeFavorite = (color) => {
        setLocalFavorites(localFavorites.filter(c => c !== color));
    };

    const handleSave = () => {
        onSave(localSettings, localFavorites);
        onClose();
    };

    return (
        <div className="node-colors-overlay">
            <div className="node-colors-card">

                {/* Título */}
                <h3 className="card-title">
                    <Palette size={18} className="title-icon" /> Configurar Cores dos Nós
                </h3>

                <div className="card-body">

                    {/* Cores padrão por tipo */}
                    <div className="section-group">
                        <h4 className="section-title">Cores Padrão por Tipo</h4>
                        {['POP', 'CEO', 'CTO', 'TOWER', 'POST'].map(type => (
                            <div key={type} className="default-color-row">
                                <span className="row-label">{type}</span>

                                <input
                                    type="color"
                                    value={localSettings[type] || ITEM_TYPES[type].defaultColor}
                                    onChange={(e) => setLocalSettings({ ...localSettings, [type]: e.target.value })}
                                    className="color-picker-input"
                                />

                                <input
                                    type="text"
                                    value={localSettings[type] || ITEM_TYPES[type].defaultColor}
                                    onChange={(e) => setLocalSettings({ ...localSettings, [type]: e.target.value })}
                                    className="text-input-hex"
                                />

                                <button
                                    onClick={() => setLocalSettings({ ...localSettings, [type]: ITEM_TYPES[type].defaultColor })}
                                    className="btn-restore"
                                >
                                    Restaurar
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Cores favoritas */}
                    <div className="section-group">
                        <div className="favorites-header">
                            <h4 className="section-title">Cores Favoritas</h4>
                            <span className="counter-text">({localFavorites.length}/10)</span>
                        </div>

                        {/* Inputs de Nova Cor */}
                        <div className="new-favorite-row">
                            <div className="flex-1">
                                <label className="input-label-mini">Nova Cor</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        className="color-picker-input-lg"
                                        value={newFavoriteColor}
                                        onChange={(e) => setNewFavoriteColor(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="text-input-hex"
                                        value={newFavoriteColor}
                                        onChange={(e) => setNewFavoriteColor(e.target.value)}
                                        placeholder="#HEX"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={addFavorite}
                                disabled={localFavorites.length >= 10}
                                className="btn-add-favorite"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Grid de Favoritos */}
                        <div className="favorites-grid">
                            {localFavorites.map((color, idx) => (
                                <div key={idx} className="favorite-item">
                                    <div
                                        className="favorite-swatch"
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewFavoriteColor(color)}
                                        title={color}
                                    />
                                    <button
                                        onClick={() => removeFavorite(color)}
                                        className="btn-delete-favorite"
                                    >
                                        <X size={20} /> {/* Corrigido: size era 20, mas visualmente no CSS precisa ser ajustado se o botão for pequeno */}
                                    </button>
                                </div>
                            ))}
                            {localFavorites.length === 0 && (
                                <div className="empty-favorites">
                                    Nenhuma cor favorita adicionada
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rodapé */}
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-cancel">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="btn-save-indigo">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NodeColorsModal;