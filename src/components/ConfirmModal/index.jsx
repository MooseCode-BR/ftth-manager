// Modal genérico de confirmação

import './styles.css';
// IMPORTS --------------------------------------------------
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { AlertTriangle } from 'lucide-react';

// Confirmação
const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="confirm-overlay">
        <div className="confirm-card">

            {/* Título com Ícone de Alerta */}
            <h3 className="confirm-title">
                <AlertTriangle size={20} className="icon-warning" />
                {title}
            </h3>

            {/* Mensagem do Corpo */}
            <p className="confirm-message">{message}</p>

            {/* Botões de Ação */}
            <div className="confirm-actions">
                <button onClick={onCancel} className="btn-cancel">
                    Cancelar
                </button>
                <button onClick={onConfirm} className="btn-confirm-danger">
                    Confirmar
                </button>
            </div>
        </div>
    </div>
);

export default ConfirmModal;