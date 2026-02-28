// Modal que abre um Diálogo de Alerta

import './style.css';

const AlertModal = ({ title, message, onClose }) => (
    <div className="alert-overlay">
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

export default AlertModal;