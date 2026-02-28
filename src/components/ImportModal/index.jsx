// Modal de Configuração de Importação (KML)

import './styles.css';
import React, { useState, useEffect } from 'react';
import { Network, Plus, Trash2, Type, Palette, Loader2 } from 'lucide-react'; // Adicionei Loader2

const ImportModal = ({ colors, itemCount, onClose, onConfirm }) => {
    // Aba ativa: 'color' ou 'text'
    const [activeTab, setActiveTab] = useState('color');

    // Estado de Carregamento
    const [isImporting, setIsImporting] = useState(false);

    // Mapeamento por COR (o que já tínhamos)
    const [fiberMap, setFiberMap] = useState({});

    // Novidade: Mapeamento por TEXTO (Regras)
    const [textRules, setTextRules] = useState([]);

    // Inicializa o mapa de cores
    useEffect(() => {
        const initialMap = {};
        colors.forEach(c => { initialMap[c] = 12; });
        setFiberMap(initialMap);
    }, [colors]);

    // --- LÓGICA DE CORES ---
    const handleColorChange = (color, value) => {
        if (value === '') { setFiberMap(prev => ({ ...prev, [color]: '' })); return; }
        const num = parseInt(value);
        setFiberMap(prev => ({ ...prev, [color]: isNaN(num) ? '' : num }));
    };

    // --- LÓGICA DE TEXTO (REGRAS) ---
    const addTextRule = () => {
        setTextRules([...textRules, { id: Date.now(), keyword: '', fibers: 12 }]);
    };

    const removeTextRule = (id) => {
        setTextRules(textRules.filter(r => r.id !== id));
    };

    const updateTextRule = (id, field, value) => {
        const newRules = textRules.map(r => {
            if (r.id === id) {
                if (field === 'fibers') return { ...r, fibers: parseInt(value) || '' };
                return { ...r, [field]: value };
            }
            return r;
        });
        setTextRules(newRules);
    };

    const handleSave = () => {
        // 1. Ativa o modo de carregamento visualmente
        setIsImporting(true);

        // Limpa e valida os mapas antes de enviar
        const finalColorMap = {};
        Object.keys(fiberMap).forEach(key => {
            const val = fiberMap[key];
            finalColorMap[key] = (val === '' || val === 0) ? 12 : val;
        });

        const finalTextRules = textRules
            .filter(r => r.keyword.trim() !== '') // Remove regras vazias
            .map(r => ({ ...r, fibers: (r.fibers === '' || r.fibers === 0) ? 12 : r.fibers }));

        // 2. O SEGREDO: setTimeout permite que o React renderize a barra de progresso
        // antes de travar a tela com o processamento pesado do onConfirm
        setTimeout(() => {
            onConfirm({ colorMap: finalColorMap, textRules: finalTextRules });
            // Nota: Não precisamos dar setIsImporting(false) aqui porque o modal 
            // provavelmente será fechado (desmontado) pelo componente pai logo em seguida.
        }, 100);
    };

    return (
        <div className="import-overlay">
            <div className="import-card">

                {/* --- MODO CARREGAMENTO --- */}
                {isImporting ? (
                    <div className="loading-state">
                        <div className="relative">
                            <div className="spinner-ring-pulse"></div>
                            <div className="spinner-ring-spin"></div>
                            <Network size={24} className="spinner-icon" />
                        </div>

                        <div>
                            <h3 className="loading-title">Processando Importação</h3>
                            <p className="loading-text">
                                Lendo {itemCount} itens do arquivo KML...<br />
                                Isso pode levar alguns segundos.
                            </p>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="progress-track">
                            <div className="progress-bar"></div>
                        </div>
                    </div>
                ) : (
                    /* --- MODO CONFIGURAÇÃO NORMAL --- */
                    <>
                        {/* Cabeçalho */}
                        <div className="config-header">
                            <div className="header-top">
                                <div className="header-icon-box">
                                    <Network size={20} />
                                </div>
                                <div>
                                    <h3 className="header-title">Configurar Importação</h3>
                                    <p className="header-subtitle">{itemCount} itens encontrados</p>
                                </div>
                            </div>

                            {/* ABAS DE NAVEGAÇÃO */}
                            <div className="tabs-container">
                                <button
                                    onClick={() => setActiveTab('color')}
                                    className={`tab-btn ${activeTab === 'color' ? 'tab-active' : 'tab-inactive'}`}
                                >
                                    <Palette size={14} /> Por Cores
                                </button>
                                <button
                                    onClick={() => setActiveTab('text')}
                                    className={`tab-btn ${activeTab === 'text' ? 'tab-active' : 'tab-inactive'}`}
                                >
                                    <Type size={14} /> Por Nome (Texto)
                                </button>
                            </div>
                        </div>

                        {/* Corpo Rolável */}
                        <div className="config-body">

                            {/* --- MODO CORES --- */}
                            {activeTab === 'color' && (
                                <div className="space-y-3">
                                    <p className="section-desc">
                                        Defina a quantidade de fibras baseada na cor da linha no KML.
                                    </p>
                                    {colors.map((color, idx) => (
                                        <div key={idx} className="color-row">
                                            <div className="color-swatch" style={{ backgroundColor: color }}></div>
                                            <div className="flex-1">
                                                <label className="input-label">Fibras</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={fiberMap[color]}
                                                    onChange={(e) => handleColorChange(color, e.target.value)}
                                                    className="fiber-input"
                                                    placeholder="12"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {colors.length === 0 && <div className="empty-state">Nenhuma cor detectada.</div>}
                                </div>
                            )}

                            {/* --- MODO TEXTO (REGRAS) --- */}
                            {activeTab === 'text' && (
                                <div className="space-y-3">
                                    <div className="info-box">
                                        <strong>Prioridade Alta:</strong> Se o nome do cabo contiver o texto abaixo, esta regra será usada em vez da cor.
                                    </div>

                                    {textRules.map((rule) => (
                                        <div key={rule.id} className="rule-row">
                                            <div className="flex-1">
                                                <label className="input-label">Se o nome contiver...</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: 144FO"
                                                    value={rule.keyword}
                                                    onChange={(e) => updateTextRule(rule.id, 'keyword', e.target.value)}
                                                    className="text-rule-input"
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="input-label">Fibras</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={rule.fibers}
                                                    onChange={(e) => updateTextRule(rule.id, 'fibers', e.target.value)}
                                                    className="fiber-input"
                                                />
                                            </div>
                                            <button onClick={() => removeTextRule(rule.id)} className="btn-remove-rule">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <button onClick={addTextRule} className="btn-add-rule">
                                        <Plus size={14} /> Adicionar Nova Regra
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Rodapé */}
                        <div className="modal-footer">
                            <button onClick={onClose} className="btn-cancel">
                                Cancelar
                            </button>
                            <button onClick={handleSave} className="btn-import">
                                Importar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ImportModal;