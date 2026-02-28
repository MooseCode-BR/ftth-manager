// Modal de Rastreio Completo
// Exibe uma linha do tempo vertical (timeline) mostrando o caminho da fibra ou conexão.

// IMPORTS --------------------------------------------------
import './styles.css';
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { Activity, Copy, Check, X } from 'lucide-react';

// Rastreio do Sinal
const TraceModal = ({ path, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const header = `relatorio_rastreio_${new Date().toLocaleTimeString()}.txt\n\n=== RASTREIO DE SINAL ===\n\n`;

        const body = path.map((step, i) => {
            const marker = step.isClicked ? "  <-- [PONTO SELECIONADO]" : "";
            const arrow = i < path.length - 1 ? "\n      ⬇\n" : "";

            // Só adiciona a linha de detalhe se ela existir
            const detailLine = step.detail ? `\n      ${step.detail}` : "";

            return `[${step.type}] ${step.deviceName}${detailLine}${marker}${arrow}`;
        }).join('');

        const fullText = header + body;
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="trace-overlay">
            <div className="trace-card">

                {/* Header */}
                <div className="trace-header">
                    <h3 className="header-title">
                        <Activity size={20} /> Rastreio Completo
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className={`btn-copy ${copied ? 'copy-success' : 'copy-idle'}`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copiado!' : 'Copiar Texto'}
                        </button>
                        <button onClick={onClose} className="btn-close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body (Timeline) */}
                <div className="trace-body">
                    <div className="timeline-container">
                        {path.map((step, index) => {
                            // Define o estado visual do ponto
                            let dotClass = 'dot-default';
                            if (step.isClicked) dotClass = 'dot-selected';
                            else if (index === 0) dotClass = 'dot-start';
                            else if (index === path.length - 1) dotClass = 'dot-end';

                            return (
                                <div key={index} className={`timeline-item ${step.isClicked ? 'item-highlight' : ''}`}>

                                    {/* Linha Conectora (não desenha no último item) */}
                                    {index !== path.length - 1 && (
                                        <div className="connecting-line"></div>
                                    )}

                                    {/* Bolinha do Timeline */}
                                    <div className={`timeline-dot ${dotClass}`}></div>

                                    {/* Card de Conteúdo */}
                                    <div className={`timeline-content-card ${step.isClicked ? 'card-selected' : 'card-default'}`}>
                                        {step.isClicked && (
                                            <div className="selected-badge">PONTO SELECIONADO</div>
                                        )}

                                        <div className="card-header-row">
                                            {step.icon && (
                                                <step.icon size={16} className={step.isClicked ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500"} />
                                            )}
                                            <span className="device-name">{step.deviceName}</span>
                                            <span className="type-badge">{step.type}</span>
                                        </div>

                                        {step.detail && (
                                            <div className="detail-text">
                                                {step.detail}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraceModal;