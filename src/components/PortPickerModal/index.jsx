// Modal de Seleção de Porta na CTO

import './styles.css';

// Seleção de porta
const PortPickerModal = ({ ctoName, availablePorts, onSelect, onCancel }) => {
    return (
        <div className="cto-connect-overlay">
            <div className="cto-connect-card">

                {/* Título e Subtítulo */}
                <h3 className="card-title">Conectar na CTO</h3>
                <p className="card-subtitle">
                    Selecione uma porta livre em: <b>{ctoName}</b>
                </p>

                {/* Grid de Portas */}
                <div className="ports-grid">
                    {availablePorts.map(port => (
                        <button
                            key={port.id}
                            onClick={() => onSelect(port)}
                            className="port-item"
                        >
                            <div className="port-circle">
                                {port.label}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Estado Vazio */}
                {availablePorts.length === 0 && (
                    <div className="empty-ports-msg">Sem portas livres nesta CTO.</div>
                )}

                {/* Rodapé */}
                <div className="modal-footer">
                    <button onClick={onCancel} className="btn-cancel">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PortPickerModal;