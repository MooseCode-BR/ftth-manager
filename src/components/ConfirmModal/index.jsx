// Modal genérico de confirmação

import './styles.css';
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

// Confirmação
const ConfirmModal = ({ title, message, onConfirm, onCancel }) => {
    const overlayRef = useRef(null);

    // Foca o overlay ao montar para capturar eventos de teclado localmente
    useEffect(() => {
        overlayRef.current?.focus();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
        }

        if (e.key === 'Enter') {
            e.stopPropagation();
            onConfirm();
        }
    };

    return (
        <div
            className="confirm-overlay"
            onClick={onCancel}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            ref={overlayRef}
        >
            <div className="confirm-card" onClick={(e) => e.stopPropagation()}>

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
};

export default ConfirmModal;