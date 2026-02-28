// Informações uai

import './styles.css';

// Informativo
const InfoModal = ({ title, lines, onClose }) => (
    <div className="info-log-overlay">
        <div className="info-log-card">

            {/* Cabeçalho */}
            <h3 className="log-header">
                <Info size={18} className="header-icon" />
                {title}
            </h3>

            {/* Área de Conteúdo (Log) */}
            <div className="log-content-area">
                {lines.length === 0 ? (
                    <p className="empty-message">Sem histórico.</p>
                ) : (
                    lines.map((line, i) => (
                        <div key={i}>
                            <div className={i === lines.length - 1 ? 'log-line-latest' : 'log-line-normal'}>
                                {line}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Botão Fechar */}
            <button onClick={onClose} className="btn-close-log">
                Fechar
            </button>
        </div>
    </div>
);

export default InfoModal;