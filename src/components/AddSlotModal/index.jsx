//Modal para adicionar um novo Slot na OLT ou Card no DIO

import './style.css';
// IMPORTS --------------------------------------------------
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { Layers } from 'lucide-react';

// Adiciona Card na OLT e no DIO
const AddSlotModal = ({ config, onConfirm, onCancel }) => {
    // config.type pode ser 'OLT' ou 'DIO'
    // config.nextIndex é uma sugestão de número para o nome
    const isOLT = config.type === 'OLT';

    const [name, setName] = useState(
        isOLT
            ? `Slot ${config.nextIndex}`
            : `Card ${config.nextIndex + 1}`
    );
    const [portCount, setPortCount] = useState(isOLT ? 16 : 12);

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <h3 className="modal-title">
                    <Layers size={20} className={isOLT ? "text-blue" : "text-purple"} />
                    {isOLT ? 'Nova Placa PON' : 'Novo Card DIO'}
                </h3>

                <div className="form-container">
                    <div>
                        <label className="input-label">Nome / Identificação</label>
                        <input
                            autoFocus
                            className="input-field"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="input-label">Quantidade de Portas</label>
                        <input
                            type="number"
                            className="input-field"
                            value={portCount}
                            onChange={e => setPortCount(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="footer-actions">
                    <button onClick={onCancel} className="btn-cancel">
                        Cancelar
                    </button>
                    <button
                        onClick={() => name && onConfirm(name, portCount)}
                        className={`btn-confirm ${isOLT ? 'variant-blue' : 'variant-purple'}`}
                    >
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSlotModal;