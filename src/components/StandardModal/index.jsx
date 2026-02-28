// Modal de configuração de padrões de cores para cabos com base na quantidade de fibras

// IMPORTS --------------------------------------------------
import './styles.css';
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { Plus, Trash2, Palette } from 'lucide-react';

// Padrão de Cores dos Cabos
const StandardsModal = ({ standards, onClose, onSave }) => {
    const [localStandards, setLocalStandards] = useState(standards || {}); 
    const [fiberCount, setFiberCount] = useState(''); 
    const [color, setColor] = useState('#000000');

    const addStandard = () => { 
        if (fiberCount && color) { 
            setLocalStandards(prev => ({ ...prev, [fiberCount]: color })); 
            setFiberCount(''); 
        } 
    };

    const removeStandard = (key) => { 
        const newStds = { ...localStandards }; 
        delete newStds[key]; 
        setLocalStandards(newStds); 
    };

    return ( 
        <div className="standards-overlay"> 
            <div className="standards-card"> 
                
                {/* Cabeçalho */}
                <h3 className="standards-header">
                    <Palette size={18} className="header-icon"/> 
                    Padrões de Cores (Cabos)
                </h3> 
                
                <div className="standards-body"> 
                    {/* Formulário de Adição */}
                    <div className="add-form-row"> 
                        <div className="flex-1"> 
                            <label className="input-label">Nº Fibras</label> 
                            <input 
                                type="number" 
                                className="input-field" 
                                value={fiberCount} 
                                onChange={e=>setFiberCount(e.target.value)} 
                                placeholder="Ex: 12"
                                onKeyDown={(e) => e.key === 'Enter' && addStandard()}
                            /> 
                        </div> 
                        <div> 
                            <label className="input-label">Cor</label> 
                            <div className="color-picker-wrapper">
                                <input 
                                    type="color" 
                                    className="color-input" 
                                    value={color} 
                                    onChange={e=>setColor(e.target.value)}
                                /> 
                            </div> 
                        </div> 
                        <button 
                            onClick={addStandard} 
                            className="btn-add"
                            title="Adicionar Padrão"
                        >
                            <Plus size={16}/>
                        </button> 
                    </div> 
                    
                    {/* Lista de Padrões */}
                    <div className="list-section">
                        <label className="section-label">Padrões Definidos</label>
                        <div className="standards-list"> 
                            {Object.keys(localStandards).length === 0 && (
                                <div className="empty-message">
                                    Nenhum padrão configurado.
                                </div>
                            )} 
                            
                            {Object.entries(localStandards).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([k, v]) => ( 
                                <div key={k} className="standard-item"> 
                                    <div className="flex items-center gap-3"> 
                                        <div className="color-preview" style={{backgroundColor: v}}></div> 
                                        <span className="standard-text">{k} Fibras</span> 
                                    </div> 
                                    <button 
                                        onClick={() => removeStandard(k)} 
                                        className="btn-remove"
                                        title="Remover"
                                    >
                                        <Trash2 size={14}/>
                                    </button> 
                                </div> 
                            ))} 
                        </div> 
                    </div>
                </div> 
                
                {/* Rodapé */}
                <div className="modal-footer"> 
                    <button 
                        onClick={onClose} 
                        className="btn-cancel"
                    >
                        Cancelar
                    </button> 
                    <button 
                        onClick={() => onSave(localStandards)} 
                        className="btn-save"
                    >
                        Salvar Padrões
                    </button> 
                </div> 
            </div> 
        </div> 
    );
};

export default StandardsModal;