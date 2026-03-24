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
    const mountTime = useRef(Date.now());

    const handleOverlayClick = (e) => {
        // Ignora cliques que não são no próprio overlay (ex: no card interno)
        if (e.target !== e.currentTarget) return;
        // Evita que o "ghost click" do TouchStart feche o modal instantaneamente
        if (Date.now() - mountTime.current < 250) return;
        onClose();
    };

    return (
        <div
            className="alert-overlay"
            onClick={handleOverlayClick}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            ref={overlayRef}
        >
            <div className="alert-card">
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