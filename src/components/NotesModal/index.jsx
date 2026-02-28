// Edição de Notas/Observações

import './styles.css';
import React, { useState } from 'react';
import { FileText, Save, X } from 'lucide-react';

const NotesModal = ({ title, initialNotes, onSave, onClose }) => {
    const [text, setText] = useState(initialNotes || '');

    return (
        <div className="notes-overlay">
            <div className="notes-card">

                {/* Cabeçalho */}
                <div className="notes-header">
                    <h3 className="header-title">
                        <FileText className="text-blue-600" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="btn-close">
                        <X size={20} />
                    </button>
                </div>

                {/* Corpo (Textarea) */}
                <div className="notes-body">
                    <label className="input-label">Observações / Detalhes</label>
                    <textarea
                        autoFocus
                        className="notes-textarea custom-scrollbar"
                        placeholder="Digite informações técnicas, referências de endereço ou observações gerais sobre este item..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                {/* Rodapé */}
                <div className="notes-footer">
                    <button
                        onClick={onClose}
                        className="btn-cancel"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(text)}
                        className="btn-save"
                    >
                        <Save size={16} /> Salvar Nota
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotesModal;