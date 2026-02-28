// modal de resolução de conflitos (Duplicate Items)

import './styles.css';
import React, { useState } from 'react';
import { Copy, ArrowRight, AlertTriangle, Check, X } from 'lucide-react';

const DuplicatesModal = ({ conflicts, onConfirm, onCancel }) => {
    // Estado: Mapeia o ID do novo item para a decisão (true = importar, false = ignorar)
    // Inicialmente, tudo false (Ignorar) por segurança
    const [decisions, setDecisions] = useState({});

    const toggleDecision = (id) => {
        setDecisions(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleConfirm = () => {
        // Retorna apenas os itens que o usuário marcou como TRUE (Importar)
        const itemsToForceImport = conflicts
            .filter(c => decisions[c.newItem.id])
            .map(c => c.newItem);

        onConfirm(itemsToForceImport);
    };

    // Botões em massa
    const setAll = (value) => {
        const newDecisions = {};
        conflicts.forEach(c => {
            newDecisions[c.newItem.id] = value;
        });
        setDecisions(newDecisions);
    };

    return (
        <div className="conflict-overlay">
            <div className="conflict-card">

                {/* Header de Aviso */}
                <div className="header-warning">
                    <div className="flex items-center gap-3">
                        <div className="header-icon-box">
                            <Copy size={24} />
                        </div>
                        <div>
                            <h3 className="header-title">Itens Possivelmente Duplicados</h3>
                            <p className="header-subtitle">
                                Encontramos {conflicts.length} itens no arquivo que parecem já existir no seu mapa.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controles em Massa */}
                <div className="bulk-actions-bar">
                    <button onClick={() => setAll(false)} className="btn-bulk-ignore">
                        Ignorar Todos
                    </button>
                    <button onClick={() => setAll(true)} className="btn-bulk-import">
                        Importar Todos
                    </button>
                </div>

                {/* Lista de Conflitos */}
                <div className="conflict-list">
                    {conflicts.map((conflict, idx) => {
                        const isImporting = !!decisions[conflict.newItem.id];
                        const { newItem, existingItem } = conflict;

                        return (
                            <div key={idx} className={`conflict-row ${isImporting ? 'row-selected' : 'row-ignored'}`}>

                                {/* Checkbox de Decisão */}
                                <button
                                    onClick={() => toggleDecision(newItem.id)}
                                    className={`btn-toggle-decision ${isImporting ? 'toggle-active' : 'toggle-inactive'}`}
                                >
                                    {isImporting ? <Check size={16} /> : <X size={16} />}
                                </button>

                                <div className="row-content-grid">
                                    {/* Coluna: Item Novo */}
                                    <div className="col-new-item">
                                        <span className="label-tag-new">Novo (KML)</span>
                                        <div className="item-name">{newItem.name}</div>
                                        <div className="item-type">{newItem.type}</div>
                                    </div>

                                    {/* Coluna: Seta */}
                                    <div className="col-arrow">
                                        <ArrowRight className="text-gray-400" size={16} />
                                    </div>

                                    {/* Coluna: Item Existente */}
                                    <div className="col-existing-item">
                                        <span className="label-tag-existing">Já existe no Mapa</span>
                                        <div className="existing-name">{existingItem.name}</div>
                                        <div className="warning-reason">
                                            <AlertTriangle size={10} className="text-yellow-500" />
                                            {conflict.reason}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button onClick={onCancel} className="btn-cancel-all">
                        Cancelar Tudo
                    </button>
                    <button onClick={handleConfirm} className="btn-confirm-selection">
                        Confirmar Seleção
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicatesModal;