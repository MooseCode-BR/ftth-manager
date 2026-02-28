// Modal de configuração da segmentação do sinal. Esse não faz calculo de potencia, ele segmenta o sinal de ponta a ponta.

// IMPORTS --------------------------------------------------
import './styles.css';
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { Plus, Trash2, Tag, CheckSquare, Square } from 'lucide-react';


// Configuração e Seleção de Sinal
const SignalModal = ({ portKey, initialConfig, upstreamSignals, onSave, onClose }) => {
    const [localSignals, setLocalSignals] = useState(initialConfig?.local || (typeof initialConfig === 'string' ? [{id:uuidv4(), name:initialConfig}] : []));
    const [allowedIds, setAllowedIds] = useState(initialConfig?.allowed || upstreamSignals.map(s=>s.id)); 
    const [newSignalName, setNewSignalName] = useState('');

    const addLocalSignal = () => { 
        if(newSignalName.trim()) { 
            setLocalSignals([...localSignals, { id: uuidv4(), name: newSignalName.trim() }]); 
            setNewSignalName(''); 
        } 
    };
    const removeLocalSignal = (id) => { setLocalSignals(localSignals.filter(s => s.id !== id)); };
    const toggleAllowed = (id) => { 
        const newSet = new Set(allowedIds); 
        if(newSet.has(id)) newSet.delete(id); 
        else newSet.add(id); 
        setAllowedIds(Array.from(newSet)); 
    };
    const handleSave = () => { 
        onSave({ local: localSignals, allowed: allowedIds.length === upstreamSignals.length ? null : allowedIds }); 
        onClose(); 
    };

    return ( 
        <div className="signal-overlay"> 
            <div className="signal-card"> 
                
                {/* Cabeçalho */}
                <h3 className="signal-header">
                    <Tag size={18} className="header-icon"/> 
                    Gerenciar Sinais
                </h3> 
                
                <div className="signal-body"> 
                    
                    {/* Seção Upstream (Entrada) */}
                    {upstreamSignals.length > 0 && (
                        <div className="section-group">
                            <h4 className="section-title">
                                Sinais de Entrada (Upstream)
                            </h4>
                            <div className="upstream-list">
                                {upstreamSignals.map(sig => (
                                    <div key={sig.id} className="upstream-item" onClick={() => toggleAllowed(sig.id)}>
                                        {allowedIds.includes(sig.id) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-gray-400"/>}
                                        <span className="upstream-label">
                                            {sig.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="help-text">Selecione quais sinais passam por esta porta.</p>
                        </div>
                    )} 
                    
                    {/* Seção Local (Adicionados) */}
                    <div className="section-group">
                        <h4 className="section-title">
                            Sinais Adicionados (Local)
                        </h4>
                        <div className="local-list">
                            {localSignals.map((sig, i) => (
                                <div key={sig.id} className="local-item-row">
                                    <input 
                                        className="input-signal-name" 
                                        value={sig.name} 
                                        onChange={(e) => { const newSigs = [...localSignals]; newSigs[i].name = e.target.value; setLocalSignals(newSigs); }} 
                                    />
                                    <button onClick={() => removeLocalSignal(sig.id)} className="btn-remove-signal">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}
                            
                            {/* Input Novo Sinal */}
                            <div className="new-signal-row">
                                <input 
                                    className="input-signal-name" 
                                    placeholder="Nome do novo sinal..." 
                                    value={newSignalName} 
                                    onChange={(e) => setNewSignalName(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && addLocalSignal()} 
                                />
                                <button onClick={addLocalSignal} className="btn-add-signal">
                                    <Plus size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div> 
                
                {/* Rodapé */}
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-cancel">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="btn-save">
                        Salvar
                    </button>
                </div> 
            </div> 
        </div> 
    );
};

export default SignalModal;