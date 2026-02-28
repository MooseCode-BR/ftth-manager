// Modal para definir o nome do cliente

import './styles.css';
// IMPORTS --------------------------------------------------
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { User } from 'lucide-react';

// Verificar
const ClientNameModal = ({ onConfirm, onCancel }) => {
    const [name, setName] = useState('');
    return (
        <div className="new-client-overlay">
            <div className="new-client-card">

                {/* Título */}
                <h3 className="new-client-title">
                    <User size={20} className="title-icon" /> Novo Cliente
                </h3>

                {/* Formulário */}
                <label className="input-label">Nome / Identificação</label>
                <input
                    autoFocus
                    className="client-input"
                    placeholder="Ex: João Silva - Rua A, 123"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name && onConfirm(name)}
                />

                {/* Botões de Ação */}
                <div className="modal-footer">
                    <button onClick={onCancel} className="btn-cancel">
                        Cancelar
                    </button>
                    <button
                        onClick={() => name && onConfirm(name)}
                        disabled={!name}
                        className="btn-confirm"
                    >
                        Selecionar CTO &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientNameModal;