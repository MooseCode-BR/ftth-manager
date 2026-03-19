// Modal que abre um Diálogo de Alerta
import { useEffect, useRef } from 'react';
import './style.css';

const AlertModal = ({ title, message, onClose }) => {
    const overlayRef = useRef(null);

    // Foca o overlay ao montar para capturar eventos de teclado localmente
    useEffect(() => {
        overlayRef.current?.focus();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
            e.stopPropagation();
            onClose();
        }
    };

    return (
        <div
            className="alert-overlay"
            onClick={onClose}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            ref={overlayRef}
        >
            <div className="alert-card" onClick={(e) => e.stopPropagation()}>
                <h3 className="alert-title">{title}</h3>
                <p className="alert-message">{message}</p>

                <div className="alert-footer">
                    <button onClick={onClose} className="btn-primary">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;